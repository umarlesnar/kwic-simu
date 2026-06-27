/**
 * Groups API Router
 * Main entry point for all Groups API endpoints
 */

const express = require("express");
const router = express.Router();

const { sendErrorResponse } = require("./errorHandler");
const {
  GROUP_ID_SUFFIX,
  MAX_PARTICIPANTS,
  JOIN_APPROVAL_MODES,
  REDIS_KEY_PATTERNS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  GROUP_ERROR_CODES,
} = require("./constants");

const {
  resolveWbaIdMiddleware,
  resolveWbaIdForRequest,
  getResolvedWbaId,
} = require("./wbaResolver");

const {
  validateCreateGroupRequest,
  validateGetGroupRequest,
  validateUpdateGroupRequest,
  validateDeleteGroupRequest,
  validateAddParticipantsRequest,
  validateRemoveParticipantRequest,
  validateGetInviteLinkRequest,
  validateResetInviteLinkRequest,
  validateGetJoinRequestsRequest,
  validateApproveJoinRequestRequest,
  validateRejectJoinRequestRequest,
  validateSimulateJoinRequestRequest,
  validateListGroupsRequest,
  validateJoinGroupByInviteLinkRequest,
  validateLeaveGroupRequest,
} = require("./groupValidator");

const {
  createGroupInRedis,
  getGroupFromRedis,
  updateGroupInRedis,
  deleteGroupFromRedis,
  listGroupsFromRedis,
  addParticipantsToGroup,
  removeParticipantFromGroup,
  addJoinRequest,
  getJoinRequests,
  removeJoinRequest,
  getInviteLink,
  resetInviteLink,
  findGroupsByParticipant,
  findJoinRequestsByParticipant,
  joinGroupByInviteLink,
  savePendingGroupCreation,
  loadPendingGroupCreation,
  removePendingGroupCreation,
  listPendingGroupCreations,
  getSimulatedGroupCreateDelayMs,
} = require("./groupService");

const {
  emitBatchParticipantsWebhooks,
  generateGraphRequestId,
} = require("./groupWebhooks");

const {
  buildGroupCreateSuccess,
  buildGroupCreateFail,
  buildGroupDeleteSuccess,
  buildGroupSettingsUpdateSuccess,
  buildGroupParticipantsAddInviteLinkSuccess,
  buildGroupParticipantsRemoveSuccess,
  buildGroupJoinRequestsApprovedSuccess,
  buildGroupJoinRequestLifecycle,
  buildGroupParticipantsAddFail,
} = require("./groupWebhookPayloads");

const { pushGroupWebhookUnlessClient } = require("./groupWebhookPush");

const {
  formatGroupResponse,
  formatGroupListResponse,
  formatJoinRequestResponse,
  generateJoinRequestId
} = require("./models");
const { getPhoneNumberIdByGroupId } = require("./groupService");

async function finalizeGroupCreationJob({
  redisManager,
  redisStreamManager,
  requestId,
}) {
  const pending = await loadPendingGroupCreation(redisManager, requestId);
  if (!pending) return;

  await removePendingGroupCreation(redisManager, requestId);

  const io = require("../../../../utils/ws/SocketManager").getIO();
  try {
    const group = await createGroupInRedis(redisManager, pending.phone_number_id, {
      subject: pending.subject,
      description: pending.description || "",
      join_approval_mode: pending.join_approval_mode || "auto_approve",
      participants: [],
      request_id: pending.request_id,
    });

    if (io) {
      io.to(`group/${pending.phone_number_id}`).emit("topic-data", {
        topic: `group/${pending.phone_number_id}`,
        data: {
          type: "group_create",
          ...formatGroupListResponse(group),
        },
        timestamp: new Date().toISOString(),
      });
    }

    return group;
  } catch (error) {
    console.error("finalizeGroupCreationJob:", error);
    throw error;
  }
}

function findJoinRequestByClientId(joinRequests, clientId) {
  return joinRequests.find(
    (jr) => jr.join_request_id === clientId || jr.wa_id === clientId
  );
}

function graphStyleError(code, message, title, details) {
  const c = typeof code === "number" ? code : parseInt(String(code), 10);
  return {
    code: Number.isFinite(c) ? c : code,
    message,
    title,
    error_data: { details },
  };
}

/**
 * Middleware to resolve phone_number_id from group_id
 * Only applies to routes that have :group_id but not :phone_number_id
 */
router.use("/:group_id", async (req, res, next) => {
  if (req.params.phone_number_id || req.path.includes("/test/")) {
    return next();
  }

  const { group_id } = req.params;
  
  // Skip if group_id doesn't look like a group ID
  if (!group_id.includes("@g.us")) {
    return next();
  }

  const phoneNumberId = await getPhoneNumberIdByGroupId(req.redisManager, group_id);
  if (phoneNumberId) {
    req.params.phone_number_id = phoneNumberId;
  } else if (req.user?.phone_number_id) {
    // Fallback: use phone_number_id from token payload
    req.params.phone_number_id = req.user.phone_number_id;
  } else {
    // If it looks like a group ID but we can't find the phone number ID,
    // we should still consider it a group request but it will likely 404 later.
    // We don't want it to fall through to generic routes in index.js.
    console.log(`Group ID ${group_id} not found in global map.`);
  }
  
  next();
});

/**
 * POST /:phone_number_id/groups
 * Create a new group (async — returns request_id; webhook fires after simulated approval)
 */
router.post("/:phone_number_id/groups", resolveWbaIdMiddleware, async (req, res) => {
  try {
    // Validate request
    const validation = validateCreateGroupRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        validation.errors[0]
      );
    }

    const { phone_number_id } = req.params;
    const {
      subject,
      description,
      join_approval_mode,
      participant_phone_numbers,
    } = req.body;

    // Check participant limit
    if (
      participant_phone_numbers &&
      participant_phone_numbers.length > MAX_PARTICIPANTS
    ) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES[GROUP_ERROR_CODES.PARTICIPANT_OVERLIMIT],
        null,
        GROUP_ERROR_CODES.PARTICIPANT_OVERLIMIT
      );
    }

    const trimmedSubject = subject ? subject.trim() : "";
    const mode = join_approval_mode || "auto_approve";

    const pending = await savePendingGroupCreation(req.redisManager, {
      phone_number_id,
      subject: trimmedSubject,
      description: description || "",
      join_approval_mode: mode,
    });

    return res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      request_id: pending.request_id,
    });
  } catch (error) {
    console.error("Error creating group:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * GET /:phone_number_id/groups
 * List all groups for a phone number
 */
router.get("/:phone_number_id/groups", resolveWbaIdMiddleware, async (req, res) => {
  try {
    // Validate request
    const validation = validateListGroupsRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        validation.errors[0]
      );
    }

    const { phone_number_id } = req.params;
    const limit = req.query.limit;
    const after = req.query.after;
    const before = req.query.before;

    const proto = req.get("x-forwarded-proto") || req.protocol;
    const host = req.get("x-forwarded-host") || req.get("host");
    const basePagingUrl = `${proto}://${host}${req.baseUrl}/${phone_number_id}/groups`;

    // List groups from Redis
    const result = await listGroupsFromRedis(req.redisManager, phone_number_id, {
      limit,
      after,
      before,
      basePagingUrl,
    });

    // Format response
    const formattedGroups = result.data.groups.map(formatGroupListResponse);

    res.status(HTTP_STATUS.OK).json({
      data: {
        groups: formattedGroups,
      },
      paging: result.paging,
    });
  } catch (error) {
    console.error("Error listing groups:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * GET /:phone_number_id/groups/context
 * Resolved WBA id for webhook simulation (from phone number mapping in Redis)
 */
router.get(
  "/:phone_number_id/groups/context",
  resolveWbaIdMiddleware,
  async (req, res) => {
    try {
      const wbaId = getResolvedWbaId(req);
      if (!wbaId) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          "WhatsApp Business Account not found for this phone number"
        );
      }
      return res.status(HTTP_STATUS.OK).json({
        wba_id: wbaId,
        phone_number_id: req.params.phone_number_id,
      });
    } catch (error) {
      console.error("Error resolving groups context:", error);
      sendErrorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * GET /:phone_number_id/groups/pending
 * List all pending group creation requests
 */
router.get("/:phone_number_id/groups/pending", async (req, res) => {
  try {
    const { phone_number_id } = req.params;
    const pendingList = await listPendingGroupCreations(
      req.redisManager,
      phone_number_id
    );

    res.status(HTTP_STATUS.OK).json({
      data: {
        pending_creations: pendingList,
      },
    });
  } catch (error) {
    console.error("Error listing pending groups:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * POST /:phone_number_id/groups/pending/:request_id/approve
 * Approve a pending group creation
 */
router.post(
  "/:phone_number_id/groups/pending/:request_id/approve",
  resolveWbaIdMiddleware,
  async (req, res) => {
    try {
      const { phone_number_id, request_id } = req.params;

      const pending = await loadPendingGroupCreation(req.redisManager, request_id);
      if (!pending) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          "Pending group creation request not found"
        );
      }

      if (pending.phone_number_id !== phone_number_id) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          "Request does not belong to this phone number"
        );
      }

      const group = await finalizeGroupCreationJob({
        redisManager: req.redisManager,
        redisStreamManager: req.redisStreamManager,
        requestId: request_id,
      });

      const wbaId = getResolvedWbaId(req);
      if (wbaId && group) {
        await pushGroupWebhookUnlessClient(
          req,
          req.redisStreamManager,
          buildGroupCreateSuccess(wbaId, phone_number_id, group)
        );
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Group creation approved and processed",
        group,
      });
    } catch (error) {
      console.error("Error approving group creation:", error);
      sendErrorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * POST /:phone_number_id/groups/pending/:request_id/reject
 * Reject a pending group creation
 */
router.post(
  "/:phone_number_id/groups/pending/:request_id/reject",
  resolveWbaIdMiddleware,
  async (req, res) => {
    try {
      const { phone_number_id, request_id } = req.params;

      const pending = await loadPendingGroupCreation(req.redisManager, request_id);
      if (!pending) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          "Pending group creation request not found"
        );
      }

      if (pending.phone_number_id !== phone_number_id) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          "Request does not belong to this phone number"
        );
      }

      const wbaId = getResolvedWbaId(req);
      if (wbaId) {
        await pushGroupWebhookUnlessClient(
          req,
          req.redisStreamManager,
          buildGroupCreateFail(wbaId, phone_number_id, pending)
        );
      }

      await removePendingGroupCreation(req.redisManager, request_id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Group creation rejected and removed",
      });
    } catch (error) {
      console.error("Error rejecting group creation:", error);
      sendErrorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }
);






/**
 * GET /:phone_number_id/participant/:wa_id/groups
 * List all groups a specific participant is in
 */
router.get("/:phone_number_id/participant/:wa_id/groups", async (req, res) => {
  try {
    const { phone_number_id, wa_id } = req.params;

    const groups = await findGroupsByParticipant(
      req.redisManager,
      phone_number_id,
      wa_id
    );
    res.status(HTTP_STATUS.OK).json({
      data: groups.map(formatGroupListResponse),
    });
  } catch (error) {
    console.error("Error finding groups for participant:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * GET /:phone_number_id/participant/:wa_id/join_requests
 * List all pending join requests for a specific participant
 */
router.get("/:phone_number_id/participant/:wa_id/join_requests", async (req, res) => {
  try {
    const { phone_number_id, wa_id } = req.params;

    const joinRequests = await findJoinRequestsByParticipant(
      req.redisManager,
      phone_number_id,
      wa_id
    );
    res.status(HTTP_STATUS.OK).json({
      data: joinRequests,
    });
  } catch (error) {
    console.error("Error finding join requests for participant:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

// --- Top-level Group Routes (Aliased) ---

/**
 * GET /:group_id
 * Get group info
 */
router.get("/:group_id", async (req, res, next) => {
  const { group_id } = req.params;
  if (!group_id.endsWith("@g.us")) return next();
  
  const phone_number_id =
    req.params.phone_number_id ||
    (await getPhoneNumberIdByGroupId(req.redisManager, group_id)) ||
    req.user?.phone_number_id;
  if (!phone_number_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_MESSAGES.GROUP_NOT_FOUND });
  }

  try {
    req.params.phone_number_id = phone_number_id;
    const validation = validateGetGroupRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
      status: HTTP_STATUS.BAD_REQUEST,
      code: GROUP_ERROR_CODES.GROUP_UNKNOWN
    });

    const fullResponse = formatGroupResponse(group);
    const fieldsParam = req.query.fields;
    
    let responseData = {
      messaging_product: "whatsapp",
      id: fullResponse.id,
    };

    if (fieldsParam) {
      const requestedFields = fieldsParam.split(",").map((f) => f.trim());
      for (const field of requestedFields) {
        if (fullResponse.hasOwnProperty(field)) {
          responseData[field] = fullResponse[field];
        }
      }
    } else {
      responseData = fullResponse;
    }

    res.status(HTTP_STATUS.OK).json(responseData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /:group_id
 * Update group settings
 */
router.post("/:group_id", resolveWbaIdMiddleware, async (req, res, next) => {
  const { group_id } = req.params;
  if (!group_id.endsWith("@g.us")) return next();

  const phone_number_id =
    req.params.phone_number_id ||
    (await getPhoneNumberIdByGroupId(req.redisManager, group_id)) ||
    req.user?.phone_number_id;
  if (!phone_number_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
      status: HTTP_STATUS.BAD_REQUEST,
      code: GROUP_ERROR_CODES.GROUP_UNKNOWN
    });
  }

  try {
    const validation = validateUpdateGroupRequest({
      ...req,
      params: { phone_number_id, group_id },
    });
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN], null, GROUP_ERROR_CODES.GROUP_UNKNOWN);
    }

    const { subject, description, join_approval_mode } = req.body;
    const settingsParts = {};

    // Simulate image error triggers
    // if (profile_picture_file) {
    //   if (profile_picture_file.includes("invalid_aspect")) {
    //     return sendErrorResponse(
    //       res,
    //       HTTP_STATUS.BAD_REQUEST,
    //       ERROR_MESSAGES[GROUP_ERROR_CODES.INVALID_IMAGE_ASPECT_RATIO],
    //       "Simulated aspect ratio failure",
    //       GROUP_ERROR_CODES.INVALID_IMAGE_ASPECT_RATIO
    //     );
    //   }
    //   if (profile_picture_file.includes("too_small")) {
    //     return sendErrorResponse(
    //       res,
    //       HTTP_STATUS.BAD_REQUEST,
    //       ERROR_MESSAGES[GROUP_ERROR_CODES.IMAGE_TOO_SMALL],
    //       "Simulated image too small failure",
    //       GROUP_ERROR_CODES.IMAGE_TOO_SMALL
    //     );
    //   }
    //   if (profile_picture_file.includes("fail") || profile_picture_file.includes("error")) {
    //     return sendErrorResponse(
    //       res,
    //       HTTP_STATUS.BAD_REQUEST,
    //       "Unable to upload profile picture.",
    //       "Simulated profile picture upload failure",
    //       131203
    //     );
    //   }
    // }

    if (subject !== undefined) {
      group.subject = subject.trim();
      settingsParts.subject = subject.trim();
    }

    if (description !== undefined) {
      group.description = description;
      settingsParts.description = description;
    }

    if (join_approval_mode !== undefined) {
      group.join_approval_mode = join_approval_mode;
      settingsParts.join_approval_mode = join_approval_mode;
    }

    // if (profile_picture_file !== undefined) {
    //   group.profile_picture_file = profile_picture_file;
    //   settingsParts.profile_picture = {
    //     mime_type: "image/jpeg",
    //     update_successful: true,
    //     sha256: require("crypto").createHash("sha256").update(profile_picture_file).digest("hex"),
    //   };
    // }

    const updatedGroup = await updateGroupInRedis(req.redisManager, phone_number_id, group);

    const wbaId = getResolvedWbaId(req);
    if (wbaId && Object.keys(settingsParts).length > 0) {
      await pushGroupWebhookUnlessClient(
        req,
        req.redisStreamManager,
        buildGroupSettingsUpdateSuccess(
          wbaId,
          phone_number_id,
          updatedGroup,
          settingsParts
        )
      );
    }

    const io = require("../../../../utils/ws/SocketManager").getIO();
    if (io) {
      io.to(`group/${phone_number_id}`).emit("topic-data", {
        topic: `group/${phone_number_id}`,
        data: updatedGroup,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(HTTP_STATUS.OK).json(formatGroupResponse(updatedGroup));
  } catch (e) {
    return next(e);
  }
});

/**
 * DELETE /:group_id
 * Delete a group
 */
router.delete("/:group_id", resolveWbaIdMiddleware, async (req, res, next) => {
  const { group_id } = req.params;
  if (!group_id.endsWith("@g.us")) return next();

  const phone_number_id =
    req.params.phone_number_id ||
    (await getPhoneNumberIdByGroupId(req.redisManager, group_id)) ||
    req.user?.phone_number_id;
  if (!phone_number_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
      status: HTTP_STATUS.BAD_REQUEST,
      code: GROUP_ERROR_CODES.GROUP_UNKNOWN
    });
  }

  try {
    req.params.phone_number_id = phone_number_id;
    req.params.group_id = group_id;
    const validation = validateDeleteGroupRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN], null, GROUP_ERROR_CODES.GROUP_UNKNOWN);
    }

    await deleteGroupFromRedis(req.redisManager, phone_number_id, group_id);

    const wbaId = getResolvedWbaId(req);
    if (wbaId) {
      await pushGroupWebhookUnlessClient(
        req,
        req.redisStreamManager,
        buildGroupDeleteSuccess(wbaId, phone_number_id, group)
      );
    }

    const io = require("../../../../utils/ws/SocketManager").getIO();
    if (io) {
      io.to(`group/${phone_number_id}`).emit("topic-data", {
        topic: `group/${phone_number_id}`,
        data: { type: "group_delete", group_id },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      success: true,
      group_id,
      request_id: group.request_id || null,
    });
  } catch (e) {
    return next(e);
  }
});

/**
 * GET /:group_id/invite_link
 * Alias for Get group invite link
 */
router.get("/:group_id/invite_link", async (req, res, next) => {
  const { group_id } = req.params;
  if (!group_id.endsWith("@g.us")) return next();
  const phone_number_id =
    req.params.phone_number_id ||
    (await getPhoneNumberIdByGroupId(req.redisManager, group_id)) ||
    req.user?.phone_number_id;
  if (!phone_number_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
      status: HTTP_STATUS.BAD_REQUEST,
      code: GROUP_ERROR_CODES.GROUP_UNKNOWN
    });
  }

  try {
    req.params.phone_number_id = phone_number_id;
    req.params.group_id = group_id;
    const validation = validateGetInviteLinkRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN], null, GROUP_ERROR_CODES.GROUP_UNKNOWN);
    }
    const inviteLink = await getInviteLink(req.redisManager, phone_number_id, group_id);
    if (!inviteLink) {
      return sendErrorResponse(res, HTTP_STATUS.NOT_FOUND, "Invite link not found");
    }
    return res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      invite_link: inviteLink.link,
    });
  } catch (e) {
    return next(e);
  }
});

/**
 * POST /:group_id/invite_link
 * Alias for Reset invite link (Meta uses POST /<GROUP_ID>/invite_link)
 */
router.post("/:group_id/invite_link", async (req, res, next) => {
  const { group_id } = req.params;
  if (!group_id.endsWith("@g.us")) return next();
  const phone_number_id =
    req.params.phone_number_id ||
    (await getPhoneNumberIdByGroupId(req.redisManager, group_id)) ||
    req.user?.phone_number_id;
  if (!phone_number_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
      status: HTTP_STATUS.BAD_REQUEST,
      code: GROUP_ERROR_CODES.GROUP_UNKNOWN
    });
  }

  try {
    req.params.phone_number_id = phone_number_id;
    req.params.group_id = group_id;
    const validation = validateResetInviteLinkRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN], null, GROUP_ERROR_CODES.GROUP_UNKNOWN);
    }
    const newInviteLink = await resetInviteLink(req.redisManager, phone_number_id, group_id);
    return res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      invite_link: newInviteLink.link,
    });
  } catch (e) {
    return next(e);
  }
});

/**
 * GET /:group_id/join_requests
 * Alias for Get join requests
 */
router.get("/:group_id/join_requests", async (req, res, next) => {
  const { group_id } = req.params;
  if (!group_id.endsWith("@g.us")) return next();
  const phone_number_id =
    req.params.phone_number_id ||
    (await getPhoneNumberIdByGroupId(req.redisManager, group_id)) ||
    req.user?.phone_number_id;
  if (!phone_number_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
      status: HTTP_STATUS.BAD_REQUEST,
      code: GROUP_ERROR_CODES.GROUP_UNKNOWN
    });
  }

  try {
    req.params.phone_number_id = phone_number_id;
    req.params.group_id = group_id;
    const validation = validateGetJoinRequestsRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN], null, GROUP_ERROR_CODES.GROUP_UNKNOWN);
    }
    if (group.join_approval_mode !== "approval_required") {
      return res.status(HTTP_STATUS.OK).json({
        data: [],
        paging: { cursors: { before: undefined, after: undefined } },
      });
    }
    const joinRequests = await getJoinRequests(req.redisManager, phone_number_id, group_id);
    return res.status(HTTP_STATUS.OK).json({
      data: joinRequests.map(formatJoinRequestResponse),
      paging: { cursors: { before: undefined, after: undefined } },
    });
  } catch (e) {
    return next(e);
  }
});

/**
 * POST /:group_id/join_requests
 * Alias for Approve join requests
 */
router.post("/:group_id/join_requests", resolveWbaIdMiddleware, async (req, res, next) => {
  const { group_id } = req.params;
  if (!group_id.endsWith("@g.us")) return next();
  const phone_number_id =
    req.params.phone_number_id ||
    (await getPhoneNumberIdByGroupId(req.redisManager, group_id)) ||
    req.user?.phone_number_id;
  if (!phone_number_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
      status: HTTP_STATUS.BAD_REQUEST,
      code: GROUP_ERROR_CODES.GROUP_UNKNOWN
    });
  }

  try {
    // Reuse existing validator by shaping params
    req.params.phone_number_id = phone_number_id;
    req.params.group_id = group_id;
    const validation = validateApproveJoinRequestRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const { join_requests } = req.body;
    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN], null, GROUP_ERROR_CODES.GROUP_UNKNOWN);
    }

    const approved_join_requests = [];
    const failed_join_requests = [];
    const approvedRows = [];
    const wbaId = getResolvedWbaId(req);

    for (const clientId of join_requests) {
      const joinRequestsList = await getJoinRequests(req.redisManager, phone_number_id, group_id);
      const joinRequest = findJoinRequestByClientId(joinRequestsList, clientId);

      let simulatedError = null;
      let decodedWaId = null;
      try {
        const decoded = Buffer.from(clientId, "base64").toString("utf8");
        const parts = decoded.split(":");
        if (parts.length >= 2) {
          decodedWaId = parts[1];
        }
      } catch (e) {
        // ignore
      }

      const waId = joinRequest ? joinRequest.wa_id : decodedWaId;
      if (waId) {
        if (waId.startsWith("911451")) {
          simulatedError = graphStyleError(
            131215,
            "The phone number is not eligible to join groups.",
            "Not eligible",
            "Simulated group join eligibility failure"
          );
        } else if (waId.startsWith("911452")) {
          simulatedError = graphStyleError(
            131207,
            "The group violates platform policies.",
            "Group suspended",
            "Simulated group suspension failure"
          );
        } else if (waId.startsWith("911453")) {
          simulatedError = graphStyleError(
            131208,
            "Too many group operations from this phone number in a short period.",
            "Group Rate Limit Hit",
            "Simulated rate limit failure"
          );
        }
      }

      if (simulatedError) {
        failed_join_requests.push({
          join_request_id: clientId,
          errors: [simulatedError],
        });
      } else if (joinRequest && group.participants.length < MAX_PARTICIPANTS) {
        group.participants.push(joinRequest.wa_id);
        group.participant_count = group.participants.length;
        await updateGroupInRedis(req.redisManager, phone_number_id, group);
        await removeJoinRequest(
          req.redisManager,
          phone_number_id,
          group_id,
          joinRequest.join_request_id
        );
        approved_join_requests.push(joinRequest.join_request_id);
        approvedRows.push({
          input: joinRequest.wa_id,
          wa_id: joinRequest.wa_id,
        });
      } else {
        failed_join_requests.push({
          join_request_id: clientId,
          errors: [
            graphStyleError(
              GROUP_ERROR_CODES.JOIN_REQUEST_NOT_FOUND,
              `(#${GROUP_ERROR_CODES.JOIN_REQUEST_NOT_FOUND}) ${ERROR_MESSAGES[GROUP_ERROR_CODES.JOIN_REQUEST_NOT_FOUND]}`,
              "Unable to approve join request",
              ERROR_MESSAGES[GROUP_ERROR_CODES.JOIN_REQUEST_NOT_FOUND]
            ),
          ],
        });
      }
    }

    if (wbaId && approvedRows.length > 0) {
      await pushGroupWebhookUnlessClient(
        req,
        req.redisStreamManager,
        buildGroupJoinRequestsApprovedSuccess(
          wbaId,
          phone_number_id,
          group_id,
          approvedRows
        )
      );
    }

    const responsePayload = {
      messaging_product: "whatsapp",
      approved_join_requests,
    };

    if (failed_join_requests.length > 0) {
      responsePayload.failed_join_requests = failed_join_requests;
      responsePayload.errors = failed_join_requests.reduce((acc, curr) => {
        if (Array.isArray(curr.errors)) {
          acc.push(...curr.errors);
        }
        return acc;
      }, []);
    }

    return res.status(HTTP_STATUS.OK).json(responsePayload);
  } catch (e) {
    return next(e);
  }
});

/**
 * DELETE /:group_id/join_requests
 * Alias for Reject join requests
 */
router.delete("/:group_id/join_requests", async (req, res, next) => {
  const { group_id } = req.params;
  if (!group_id.endsWith("@g.us")) return next();
  const phone_number_id =
    req.params.phone_number_id ||
    (await getPhoneNumberIdByGroupId(req.redisManager, group_id)) ||
    req.user?.phone_number_id;
  if (!phone_number_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
      status: HTTP_STATUS.BAD_REQUEST,
      code: GROUP_ERROR_CODES.GROUP_UNKNOWN
    });
  }

  try {
    req.params.phone_number_id = phone_number_id;
    req.params.group_id = group_id;
    const validation = validateRejectJoinRequestRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const { join_requests } = req.body;
    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN], null, GROUP_ERROR_CODES.GROUP_UNKNOWN);
    }

    const rejected_join_requests = [];
    const failed_join_requests = [];

    for (const clientId of join_requests) {
      const joinRequests = await getJoinRequests(req.redisManager, phone_number_id, group_id);
      const joinRequest = findJoinRequestByClientId(joinRequests, clientId);

      if (joinRequest) {
        await removeJoinRequest(
          req.redisManager,
          phone_number_id,
          group_id,
          joinRequest.join_request_id
        );
        rejected_join_requests.push(joinRequest.join_request_id);
      } else {
        failed_join_requests.push({
          join_request_id: clientId,
          errors: [
            graphStyleError(
              GROUP_ERROR_CODES.JOIN_REQUEST_NOT_FOUND,
              `(#${GROUP_ERROR_CODES.JOIN_REQUEST_NOT_FOUND}) ${ERROR_MESSAGES[GROUP_ERROR_CODES.JOIN_REQUEST_NOT_FOUND]}`,
              "Unable to reject join request",
              ERROR_MESSAGES[GROUP_ERROR_CODES.JOIN_REQUEST_NOT_FOUND]
            ),
          ],
        });
      }
    }

    const responsePayload = {
      messaging_product: "whatsapp",
      rejected_join_requests,
    };

    if (failed_join_requests.length > 0) {
      responsePayload.failed_join_requests = failed_join_requests;
      responsePayload.errors = failed_join_requests.reduce((acc, curr) => {
        if (Array.isArray(curr.errors)) {
          acc.push(...curr.errors);
        }
        return acc;
      }, []);
    }

    return res.status(HTTP_STATUS.OK).json(responsePayload);
  } catch (e) {
    return next(e);
  }
});
/**
 * POST /:group_id/participants
 * Alias for Add group participants
 */
router.post("/:group_id/participants", resolveWbaIdMiddleware, async (req, res, next) => {
  const { group_id } = req.params;
  if (!group_id.endsWith("@g.us")) return next();
  const phone_number_id =
    req.params.phone_number_id ||
    (await getPhoneNumberIdByGroupId(req.redisManager, group_id)) ||
    req.user?.phone_number_id;
  if (!phone_number_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
      status: HTTP_STATUS.BAD_REQUEST,
      code: GROUP_ERROR_CODES.GROUP_UNKNOWN
    });
  }

  try {
    req.params.phone_number_id = phone_number_id;
    req.params.group_id = group_id;
    const validation = validateAddParticipantsRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const { phone_numbers } = req.body;
    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN], null, GROUP_ERROR_CODES.GROUP_UNKNOWN);
    }

    const failed_participants = [];
    const failed_join_requests = [];
    const eligible_numbers = [];

    for (const phoneNumber of phone_numbers) {
      if (group.business_wa_id && phoneNumber === group.business_wa_id) {
        continue;
      }
      if (phoneNumber.startsWith("911451")) {
        const error = graphStyleError(
          131215,
          "The phone number is not eligible to join groups.",
          "Not eligible",
          "Simulated group join eligibility failure"
        );
        const join_request_id = generateJoinRequestId(phoneNumber);
        failed_join_requests.push({
          join_request_id,
          errors: [error],
        });
        failed_participants.push({
          input: phoneNumber,
          errors: [error],
        });
      } else if (phoneNumber.startsWith("911452")) {
        const error = graphStyleError(
          131207,
          "The group violates platform policies.",
          "Group suspended",
          "Simulated group suspension failure"
        );
        const join_request_id = generateJoinRequestId(phoneNumber);
        failed_join_requests.push({
          join_request_id,
          errors: [error],
        });
        failed_participants.push({
          input: phoneNumber,
          errors: [error],
        });
      } else if (phoneNumber.startsWith("911453")) {
        const error = graphStyleError(
          131208,
          "Too many group operations from this phone number in a short period.",
          "Group Rate Limit Hit",
          "Simulated rate limit failure"
        );
        const join_request_id = generateJoinRequestId(phoneNumber);
        failed_join_requests.push({
          join_request_id,
          errors: [error],
        });
        failed_participants.push({
          input: phoneNumber,
          errors: [error],
        });
      } else {
        eligible_numbers.push(phoneNumber);
      }
    }

    const wbaId = getResolvedWbaId(req);

    if (failed_participants.length > 0) {
      const is_partial = eligible_numbers.length > 0;
      if (wbaId) {
        await pushGroupWebhookUnlessClient(
          req,
          req.redisStreamManager,
          buildGroupParticipantsAddFail(
            wbaId,
            phone_number_id,
            group_id,
            failed_participants,
            is_partial
          )
        );
      }
    }

    if (eligible_numbers.length === 0) {
      return res.status(HTTP_STATUS.OK).json({
        added_participants: [],
        failed_participants,
        failed_join_requests,
        status: "failed",
      });
    }

    const mode = group.join_approval_mode || "auto_approve";
    const bypassApproval = req.body.bypass_approval === true || req.body.direct === true || req.body.force === true;

    if (mode === "approval_required" && !bypassApproval) {
      const join_requests = [];
      for (const waId of eligible_numbers) {
        // Check if user already in group
        const existingWaIds = group.participants.map((p) =>
          typeof p === "string" ? p : p.wa_id
        );
        if (existingWaIds.includes(waId)) {
          continue;
        }

        const jr = await addJoinRequest(req.redisManager, phone_number_id, group_id, waId);
        join_requests.push(jr);

        if (wbaId) {
          await pushGroupWebhookUnlessClient(
            req,
            req.redisStreamManager,
            buildGroupJoinRequestLifecycle(
              wbaId,
              phone_number_id,
              group_id,
              "group_join_request_created",
              {
                wa_id: waId,
                join_request_id: jr.join_request_id,
                reason: "invite_link",
              }
            )
          );
        }

        // Emit Socket.IO event for each join request
        const io = require("../../../../utils/ws/SocketManager").getIO();
        if (io) {
          io.to(`group/${phone_number_id}`).emit("topic-data", {
            topic: `group/${phone_number_id}`,
            data: {
              group_id,
              action: "join_request_received",
              wa_id: waId,
              join_request_id: jr.join_request_id,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      res.status(HTTP_STATUS.OK).json({
        added_participants: [],
        failed_participants,
        failed_join_requests,
        status: "request_pending",
        join_requests,
      });
    } else {
      // Check if adding participants would exceed limit
      if (group.participants.length + eligible_numbers.length > MAX_PARTICIPANTS) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES[GROUP_ERROR_CODES.PARTICIPANT_OVERLIMIT],
          null,
          GROUP_ERROR_CODES.PARTICIPANT_OVERLIMIT
        );
      }

      // Add participants
      const result = await addParticipantsToGroup(
        req.redisManager,
        phone_number_id,
        group,
        eligible_numbers
      );

      if (wbaId && result.added_participants.length > 0) {
        await pushGroupWebhookUnlessClient(
          req,
          req.redisStreamManager,
          buildGroupParticipantsAddInviteLinkSuccess(
            wbaId,
            phone_number_id,
            group_id,
            result.added_participants
          )
        );
      }

      // Emit Socket.IO event
      const io = require("../../../../utils/ws/SocketManager").getIO();
      if (io) {
        io.to(`group/${phone_number_id}`).emit("topic-data", {
          topic: `group/${phone_number_id}`,
          data: {
            group_id,
            action: "participants_added",
            participants: result.added_participants,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.OK).json({
        added_participants: result.added_participants,
        failed_participants,
        failed_join_requests,
        status: "joined",
      });
    }
  } catch (error) {
    console.error("Error adding participants:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * DELETE /:group_id/participants
 * Alias for Remove group participants
 */
router.delete("/:group_id/participants", resolveWbaIdMiddleware, async (req, res, next) => {
  const { group_id } = req.params;
  if (!group_id.endsWith("@g.us")) return next();
  const phone_number_id =
    req.params.phone_number_id ||
    (await getPhoneNumberIdByGroupId(req.redisManager, group_id)) ||
    req.user?.phone_number_id;
  if (!phone_number_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
      status: HTTP_STATUS.BAD_REQUEST,
      code: GROUP_ERROR_CODES.GROUP_UNKNOWN
    });
  }

  try {
    req.params.phone_number_id = phone_number_id;
    req.params.group_id = group_id;
    const validation = validateRemoveParticipantRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN], null, GROUP_ERROR_CODES.GROUP_UNKNOWN);
    }

    const { participants } = req.body || {};
    const waIds = participants.map((p) => (typeof p === "string" ? p : (p.user || p.wa_id))).filter(Boolean);

    const removed_participants = [];
    const failed_participants = [];
    const requestId = group.request_id || generateGraphRequestId();
    const wbaId = getResolvedWbaId(req);

    for (const wa_id of waIds) {
      const updatedGroup = await removeParticipantFromGroup(req.redisManager, phone_number_id, group, wa_id);
      if (updatedGroup) {
        removed_participants.push({ input: wa_id });
        Object.assign(group, updatedGroup);
      } else {
        failed_participants.push({
          input: wa_id,
          errors: [
            graphStyleError(
              GROUP_ERROR_CODES.PARTICIPANT_NOT_IN_GROUP,
              `(#${GROUP_ERROR_CODES.PARTICIPANT_NOT_IN_GROUP}) ${ERROR_MESSAGES[GROUP_ERROR_CODES.PARTICIPANT_NOT_IN_GROUP]}`,
              "Unable to remove participant from group",
              ERROR_MESSAGES[GROUP_ERROR_CODES.PARTICIPANT_NOT_IN_GROUP]
            ),
          ],
        });
      }
    }

    const groupErrors = [];
    if (failed_participants.length && removed_participants.length) {
      groupErrors.push(
        graphStyleError(
          GROUP_ERROR_CODES.REQUEST_PARTIALLY_SUCCEEDED,
          "(#131201) Failed to remove some participants from the group",
          "Not All Participants Remove Succeeded",
          "Failed to remove some participants from the group"
        )
      );
    } else if (failed_participants.length && !removed_participants.length) {
      groupErrors.push(
        graphStyleError(
          GROUP_ERROR_CODES.PARTICIPANT_NOT_IN_GROUP,
          `(#${GROUP_ERROR_CODES.PARTICIPANT_NOT_IN_GROUP}) ${ERROR_MESSAGES[GROUP_ERROR_CODES.PARTICIPANT_NOT_IN_GROUP]}`,
          "Unable to remove participant from group",
          ERROR_MESSAGES[GROUP_ERROR_CODES.PARTICIPANT_NOT_IN_GROUP]
        )
      );
    }

    if (wbaId && removed_participants.length > 0) {
      await pushGroupWebhookUnlessClient(
        req,
        req.redisStreamManager,
        buildGroupParticipantsRemoveSuccess(wbaId, phone_number_id, group, {
          removed_participants,
          request_id: requestId,
        })
      );
    }

    return res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      request_id: requestId,
      removed_participants,
      ...(failed_participants.length > 0 ? { failed_participants } : {}),
      ...(groupErrors.length > 0 ? { errors: groupErrors } : {}),
    });
  } catch (e) {
    return next(e);
  }
});

/**
 * POST /groups/join
 * Join a group via invite link
 */
router.post("/groups/join", resolveWbaIdMiddleware, async (req, res) => {
  try {
    const validation = validateJoinGroupByInviteLinkRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const { invite_link, wa_id } = req.body;
    const result = await joinGroupByInviteLink(req.redisManager, invite_link, wa_id);

    if (!result.success) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, result.error);
    }

    req.params.phone_number_id = result.phone_number_id;
    await resolveWbaIdForRequest(req.redisManager, req);
    const wbaId = getResolvedWbaId(req);

    if (result.status === "joined") {
      if (wbaId) {
        await pushGroupWebhookUnlessClient(
          req,
          req.redisStreamManager,
          buildGroupParticipantsAddInviteLinkSuccess(
            wbaId,
            result.phone_number_id,
            result.group_id,
            [wa_id]
          )
        );
      }

      const io = require("../../../../utils/ws/SocketManager").getIO();
      if (io) {
        io.to(`group/${result.phone_number_id}`).emit("topic-data", {
          topic: `group/${result.phone_number_id}`,
          data: {
            type: "group_participants_add",
            group_id: result.group_id,
            action: "participants_added",
            participants: [wa_id],
          },
          timestamp: new Date().toISOString(),
        });
      }
    } else if (result.status === "request_pending") {
      if (wbaId) {
        await pushGroupWebhookUnlessClient(
          req,
          req.redisStreamManager,
          buildGroupJoinRequestLifecycle(
            wbaId,
            result.phone_number_id,
            result.group_id,
            "group_join_request_created",
            {
              wa_id,
              join_request_id: result.join_request_id,
              reason: "invite_link",
            }
          )
        );
      }

      const io = require("../../../../utils/ws/SocketManager").getIO();
      if (io) {
        io.to(`group/${result.phone_number_id}`).emit("topic-data", {
          topic: `group/${result.phone_number_id}`,
          data: {
            group_id: result.group_id,
            action: "join_request_received",
            wa_id,
            join_request_id: result.join_request_id,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      success: true,
      status: result.status,
      group_id: result.group_id,
      phone_number_id: result.phone_number_id,
      ...(result.join_request_id ? { join_request_id: result.join_request_id } : {}),
    });
  } catch (error) {
    console.error("Error joining group:", error);
    sendErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /groups/leave
 * Participant leaves a group
 */
router.post("/groups/leave", resolveWbaIdMiddleware, async (req, res) => {
  try {
    const validation = validateLeaveGroupRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, validation.errors[0]);
    }

    const { group_id, wa_id } = req.body;
    const phone_number_id = await getPhoneNumberIdByGroupId(req.redisManager, group_id);
    if (!phone_number_id) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
        null,
        GROUP_ERROR_CODES.GROUP_UNKNOWN
      );
    }

    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
        null,
        GROUP_ERROR_CODES.GROUP_UNKNOWN
      );
    }

    const updatedGroup = await removeParticipantFromGroup(
      req.redisManager,
      phone_number_id,
      group,
      wa_id
    );

    if (!updatedGroup) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES[GROUP_ERROR_CODES.PARTICIPANT_NOT_IN_GROUP],
        null,
        GROUP_ERROR_CODES.PARTICIPANT_NOT_IN_GROUP
      );
    }

    req.params.phone_number_id = phone_number_id;
    await resolveWbaIdForRequest(req.redisManager, req);
    const wbaId = getResolvedWbaId(req);

    if (wbaId) {
      await pushGroupWebhookUnlessClient(
        req,
        req.redisStreamManager,
        buildGroupParticipantsRemoveSuccess(wbaId, phone_number_id, updatedGroup, {
          removed_participants: [{ wa_id }],
          initiated_by: "participant",
        })
      );
    }

    // Emit Socket.IO event
    const io = require("../../../../utils/ws/SocketManager").getIO();
    if (io) {
      io.to(`group/${phone_number_id}`).emit("topic-data", {
        topic: `group/${phone_number_id}`,
        data: {
          type: "group_participants_remove",
          group_id,
          action: "participants_removed",
          participants: [wa_id],
        },
        timestamp: new Date().toISOString(),
      });
    }

    res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      success: true,
      status: "left",
      group_id,
      wa_id,
      phone_number_id,
    });
  } catch (error) {
    console.error("Error leaving group:", error);
    sendErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /groups/join_requests/cancel
 * Cancel a pending join request by a participant
 */
router.post("/groups/join_requests/cancel", resolveWbaIdMiddleware, async (req, res, next) => {
  try {
    const { group_id, wa_id, join_request_id } = req.body;
    if (!group_id || !wa_id || !join_request_id) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Missing required fields: group_id, wa_id, or join_request_id"
      );
    }

    const phone_number_id = await getPhoneNumberIdByGroupId(req.redisManager, group_id);
    if (!phone_number_id) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Group not found"
      );
    }

    const removed = await removeJoinRequest(
      req.redisManager,
      phone_number_id,
      group_id,
      join_request_id
    );

    if (!removed) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Join request not found or already processed"
      );
    }

    req.params.phone_number_id = phone_number_id;
    await resolveWbaIdForRequest(req.redisManager, req);
    const wbaId = getResolvedWbaId(req);

    if (wbaId) {
      await pushGroupWebhookUnlessClient(
        req,
        req.redisStreamManager,
        buildGroupJoinRequestLifecycle(
          wbaId,
          phone_number_id,
          group_id,
          "group_join_request_revoked",
          {
            wa_id,
            join_request_id,
            reason: "invite_link",
          }
        )
      );
    }

    // Emit Socket.IO event
    const io = require("../../../../utils/ws/SocketManager").getIO();
    if (io) {
      io.to(`group/${phone_number_id}`).emit("topic-data", {
        topic: `group/${phone_number_id}`,
        data: {
          group_id,
          action: "join_request_cancelled",
          wa_id,
          join_request_id,
        },
        timestamp: new Date().toISOString(),
      });
    }

    res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      success: true,
      status: "cancelled",
      group_id,
      wa_id,
      join_request_id,
      phone_number_id,
    });
  } catch (error) {
    console.error("Error cancelling join request:", error);
    next(error);
  }
});

module.exports = router;

