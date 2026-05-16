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
} = require("./groupWebhookPayloads");

const { pushGroupWebhookUnlessClient } = require("./groupWebhookPush");

const {
  formatGroupResponse,
  formatGroupListResponse,
  formatJoinRequestResponse,
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

    const mode = join_approval_mode || "auto_approve";

    const pending = await savePendingGroupCreation(req.redisManager, {
      phone_number_id,
      subject,
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
 * GET /:phone_number_id/groups/:group_id
 * Get group details
 */
router.get("/:phone_number_id/groups/:group_id", async (req, res) => {
  try {
    // Validate request
    const validation = validateGetGroupRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        validation.errors[0]
      );
    }

    const { phone_number_id, group_id } = req.params;

    // Get group from Redis
    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);

    if (!group) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST, // Meta uses 400 for Group Unknown
        ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
        null,
        GROUP_ERROR_CODES.GROUP_UNKNOWN
      );
    }

    res.status(HTTP_STATUS.OK).json(formatGroupResponse(group));
  } catch (error) {
    console.error("Error getting group:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * POST /:phone_number_id/groups/:group_id (LEGACY/INTERNAL)
 * Update group settings
 */
router.post(
  "/:phone_number_id/groups/:group_id",
  resolveWbaIdMiddleware,
  async (req, res) => {
  try {
    // Validate request
    const validation = validateUpdateGroupRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        validation.errors[0]
      );
    }

    const { phone_number_id, group_id } = req.params;
    const { subject, description, join_approval_mode } = req.body;

    // Get group from Redis
    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);

    if (!group) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
        null,
        GROUP_ERROR_CODES.GROUP_UNKNOWN
      );
    }

    const settingsParts = {};

    if (subject !== undefined) {
      group.subject = subject;
      settingsParts.subject = subject;
    }

    if (description !== undefined) {
      group.description = description;
      settingsParts.description = description;
    }

    if (join_approval_mode !== undefined) {
      group.join_approval_mode = join_approval_mode;
      settingsParts.join_approval_mode = join_approval_mode;
    }

    const updatedGroup = await updateGroupInRedis(
      req.redisManager,
      phone_number_id,
      group
    );

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

    // Emit Socket.IO event
    const io = require("../../../../utils/ws/SocketManager").getIO();
    if (io) {
      io.to(`group/${phone_number_id}`).emit("topic-data", {
        topic: `group/${phone_number_id}`,
        data: updatedGroup,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(HTTP_STATUS.OK).json(formatGroupResponse(updatedGroup));
  } catch (error) {
    console.error("Error updating group:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * DELETE /:phone_number_id/groups/:group_id
 * Delete a group
 */
router.delete("/:phone_number_id/groups/:group_id", resolveWbaIdMiddleware, async (req, res) => {
  try {
    // Validate request
    const validation = validateDeleteGroupRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        validation.errors[0]
      );
    }

    const { phone_number_id, group_id } = req.params;

    // Check if group exists
    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);

    if (!group) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
        null,
        GROUP_ERROR_CODES.GROUP_UNKNOWN
      );
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

    res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      success: true,
      group_id,
      request_id: group.request_id || null,
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * POST /:phone_number_id/groups/:group_id/participants
 * Add participants to a group
 */
router.post(
  "/:phone_number_id/groups/:group_id/participants",
  resolveWbaIdMiddleware,
  async (req, res) => {
  try {
    // Validate request
    const validation = validateAddParticipantsRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        validation.errors[0]
      );
    }

    const { phone_number_id, group_id } = req.params;
    const { phone_numbers } = req.body;

    // Get group from Redis
    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);

    if (!group) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
        null,
        GROUP_ERROR_CODES.GROUP_UNKNOWN
      );
    }

    // Check if adding participants would exceed limit
    if (group.participants.length + phone_numbers.length > MAX_PARTICIPANTS) {
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
      phone_numbers
    );

    const wbaId = getResolvedWbaId(req);
    if (wbaId && result.added_participants.length > 0) {
      await emitBatchParticipantsWebhooks(
        req.redisStreamManager,
        phone_number_id,
        group_id,
        "participant_added",
        result.added_participants,
        wbaId
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
    });
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
 * DELETE /:phone_number_id/groups/:group_id/participants
 * Remove participants from a group
 */
router.delete(
  "/:phone_number_id/groups/:group_id/participants",
  resolveWbaIdMiddleware,
  async (req, res) => {
    try {
      // Validate request
      const validation = validateRemoveParticipantRequest(req);
      if (!validation.isValid) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          validation.errors[0]
        );
      }

      const { phone_number_id, group_id } = req.params;
      const { participants } = req.body;
      const waIds = participants.map(p => typeof p === 'string' ? p : (p.user || p.wa_id));

      // Get group from Redis
      const group = await getGroupFromRedis(
        req.redisManager,
        phone_number_id,
        group_id
      );

      if (!group) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.GROUP_NOT_FOUND
        );
      }

      const removed_participants = [];
      const failed_participants = [];
      const requestId = group.request_id || generateGraphRequestId();
      const wbaId = getResolvedWbaId(req);

      for (const wa_id of waIds) {
        const updatedGroup = await removeParticipantFromGroup(
          req.redisManager,
          phone_number_id,
          group,
          wa_id
        );

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

      // Emit Socket.IO event
      const io = require("../../../../utils/ws/SocketManager").getIO();
      if (io) {
        io.to(`group/${phone_number_id}`).emit("topic-data", {
          topic: `group/${phone_number_id}`,
          data: {
            type: "group_participants_remove",
            group_id,
            removed_participants,
            total_participant_count: formatGroupListResponse(group).total_participant_count,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.OK).json({
        messaging_product: "whatsapp",
        request_id: requestId,
        removed_participants,
        ...(failed_participants.length > 0 ? { failed_participants } : {}),
      });
    } catch (error) {
      console.error("Error removing participants:", error);
      sendErrorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * GET /:phone_number_id/groups/:group_id/invite_link
 * Get group invite link
 */
router.get("/:phone_number_id/groups/:group_id/invite_link", async (req, res) => {
  try {
    // Validate request
    const validation = validateGetInviteLinkRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        validation.errors[0]
      );
    }

    const { phone_number_id, group_id } = req.params;

    // Check if group exists
    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);

    if (!group) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.GROUP_NOT_FOUND
      );
    }

    // Get invite link
    const inviteLink = await getInviteLink(req.redisManager, phone_number_id, group_id);

    if (!inviteLink) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Invite link not found"
      );
    }

    res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      invite_link: inviteLink.link,
    });
  } catch (error) {
    console.error("Error getting invite link:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * POST /:phone_number_id/groups/:group_id/invite_link/reset
 * Reset group invite link
 */
router.post(
  "/:phone_number_id/groups/:group_id/invite_link/reset",
  resolveWbaIdMiddleware,
  async (req, res) => {
    try {
      // Validate request
      const validation = validateResetInviteLinkRequest(req);
      if (!validation.isValid) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          validation.errors[0]
        );
      }

      const { phone_number_id, group_id } = req.params;

      // Check if group exists
      const group = await getGroupFromRedis(
        req.redisManager,
        phone_number_id,
        group_id
      );

      if (!group) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.GROUP_NOT_FOUND
        );
      }

      // Reset invite link
      const newInviteLink = await resetInviteLink(
        req.redisManager,
        phone_number_id,
        group_id
      );

      res.status(HTTP_STATUS.OK).json({
        messaging_product: "whatsapp",
        invite_link: newInviteLink.link,
      });
    } catch (error) {
      console.error("Error resetting invite link:", error);
      sendErrorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * GET /:phone_number_id/groups/:group_id/join_requests
 * Get pending join requests
 */
router.get("/:phone_number_id/groups/:group_id/join_requests", async (req, res) => {
  try {
    // Validate request
    const validation = validateGetJoinRequestsRequest(req);
    if (!validation.isValid) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        validation.errors[0]
      );
    }

    const { phone_number_id, group_id } = req.params;

    // Check if group exists
    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);

    if (!group) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.GROUP_NOT_FOUND
      );
    }

    // Only groups with approval_required have join requests
    if (group.join_approval_mode !== "approval_required") {
      return res.status(HTTP_STATUS.OK).json({
        data: [],
        paging: { cursors: { before: undefined, after: undefined } },
      });
    }

    // Get join requests
    const joinRequests = await getJoinRequests(
      req.redisManager,
      phone_number_id,
      group_id
    );

    const formattedRequests = joinRequests.map(formatJoinRequestResponse);

    res.status(HTTP_STATUS.OK).json({
      data: formattedRequests,
      paging: {
        cursors: {
          before: undefined,
          after: undefined,
        },
      },
    });
  } catch (error) {
    console.error("Error getting join requests:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * POST /:phone_number_id/groups/:group_id/simulate_join_request
 * Simulate a user requesting to join a group
 */
router.post(
  "/:phone_number_id/groups/:group_id/simulate_join_request",
  async (req, res) => {
    try {
      // Validate request
      const validation = validateSimulateJoinRequestRequest(req);
      if (!validation.isValid) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          validation.errors[0]
        );
      }

      const { phone_number_id, group_id } = req.params;
      const { wa_id } = req.body;

      // Get group from Redis
      const group = await getGroupFromRedis(
        req.redisManager,
        phone_number_id,
        group_id
      );

      if (!group) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.GROUP_NOT_FOUND
        );
      }

      // Join requests only apply to approval_required
      if (group.join_approval_mode !== "approval_required") {
        return sendErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES.GROUP_DOES_NOT_REQUIRE_APPROVAL
        );
      }

      // Check if user already in group
      const existingWaIds = group.participants.map((p) =>
        typeof p === "string" ? p : p.wa_id
      );
      if (existingWaIds.includes(wa_id)) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES[GROUP_ERROR_CODES.DUPLICATE_PARTICIPANT],
          null,
          GROUP_ERROR_CODES.DUPLICATE_PARTICIPANT
        );
      }

      // Add join request
      const jr = await addJoinRequest(req.redisManager, phone_number_id, group_id, wa_id);

      const wbaId = getResolvedWbaId(req);
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
              wa_id,
              join_request_id: jr.join_request_id,
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
            action: "join_request_received",
            wa_id,
            join_request_id: jr.join_request_id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.OK).json({
        messaging_product: "whatsapp",
        join_request_id: jr.join_request_id,
        wa_id,
      });
    } catch (error) {
      console.error("Error simulating join request:", error);
      sendErrorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * POST /:phone_number_id/groups/:group_id/join_requests
 * Approve join requests
 */
router.post(
  "/:phone_number_id/groups/:group_id/join_requests",
  resolveWbaIdMiddleware,
  async (req, res) => {
    try {
      // Validate request
      const validation = validateApproveJoinRequestRequest(req);
      if (!validation.isValid) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          validation.errors[0]
        );
      }

      const { phone_number_id, group_id } = req.params;
      const { join_requests } = req.body;

      // Get group from Redis
      const group = await getGroupFromRedis(
        req.redisManager,
        phone_number_id,
        group_id
      );

      if (!group) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.GROUP_NOT_FOUND
        );
      }

      const approved_join_requests = [];
      const failed_join_requests = [];
      const approvedRows = [];
      const wbaId = getResolvedWbaId(req);

      for (const clientId of join_requests) {
        const joinRequestsList = await getJoinRequests(
          req.redisManager,
          phone_number_id,
          group_id
        );
        const joinRequest = findJoinRequestByClientId(joinRequestsList, clientId);

        if (joinRequest && group.participants.length < MAX_PARTICIPANTS) {
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

      res.status(HTTP_STATUS.OK).json({
        messaging_product: "whatsapp",
        approved_join_requests,
        ...(failed_join_requests.length > 0 ? { failed_join_requests } : {}),
      });
    } catch (error) {
      console.error("Error approving join requests:", error);
      sendErrorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * DELETE /:phone_number_id/groups/:group_id/join_requests
 * Reject join requests
 */
router.delete(
  "/:phone_number_id/groups/:group_id/join_requests",
  resolveWbaIdMiddleware,
  async (req, res) => {
    try {
      // Validate request
      const validation = validateRejectJoinRequestRequest(req);
      if (!validation.isValid) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          validation.errors[0]
        );
      }

      const { phone_number_id, group_id } = req.params;
      const { join_requests } = req.body;

      // Check if group exists
      const group = await getGroupFromRedis(
        req.redisManager,
        phone_number_id,
        group_id
      );

      if (!group) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
          null,
          GROUP_ERROR_CODES.GROUP_UNKNOWN
        );
      }

      const rejected_join_requests = [];
      const failed_join_requests = [];

      for (const clientId of join_requests) {
        const joinRequests = await getJoinRequests(
          req.redisManager,
          phone_number_id,
          group_id
        );
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

      res.status(HTTP_STATUS.OK).json({
        messaging_product: "whatsapp",
        rejected_join_requests,
        ...(failed_join_requests.length > 0 ? { failed_join_requests } : {}),
      });
    } catch (error) {
      console.error("Error rejecting join requests:", error);
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
    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN],
      status: HTTP_STATUS.BAD_REQUEST,
      code: GROUP_ERROR_CODES.GROUP_UNKNOWN
    });
    res.status(HTTP_STATUS.OK).json(formatGroupResponse(group));
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

    if (subject !== undefined) {
      group.subject = subject;
      settingsParts.subject = subject;
    }

    if (description !== undefined) {
      group.description = description;
      settingsParts.description = description;
    }

    if (join_approval_mode !== undefined) {
      group.join_approval_mode = join_approval_mode;
      settingsParts.join_approval_mode = join_approval_mode;
    }

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

      if (joinRequest && group.participants.length < MAX_PARTICIPANTS) {
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

    return res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      approved_join_requests,
      ...(failed_join_requests.length > 0 ? { failed_join_requests } : {}),
    });
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

    return res.status(HTTP_STATUS.OK).json({
      messaging_product: "whatsapp",
      rejected_join_requests,
      ...(failed_join_requests.length > 0 ? { failed_join_requests } : {}),
    });
  } catch (e) {
    return next(e);
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
    const group = await getGroupFromRedis(req.redisManager, phone_number_id, group_id);
    if (!group) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES[GROUP_ERROR_CODES.GROUP_UNKNOWN], null, GROUP_ERROR_CODES.GROUP_UNKNOWN);
    }

    const { participants } = req.body || {};
    if (!Array.isArray(participants) || participants.length === 0) {
      return sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, "participants must be a non-empty array");
    }
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

module.exports = router;

