/**
 * Groups API Router
 * Main entry point for all Groups API endpoints
 */

const express = require("express");
const router = express.Router();

const { sendErrorResponse } = require("./errorHandler");
const { HTTP_STATUS, ERROR_MESSAGES, MAX_PARTICIPANTS } = require("./constants");

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
} = require("./groupService");

const {
  emitGroupLifecycleWebhook,
  emitGroupParticipantsWebhook,
  emitGroupSettingsWebhook,
  emitBatchParticipantsWebhooks,
} = require("./groupWebhooks");

const {
  formatGroupResponse,
  formatGroupListResponse,
  formatJoinRequestResponse,
} = require("./models");

/**
 * POST /:phone_number_id/groups
 * Create a new group
 */
router.post("/:phone_number_id/groups", async (req, res) => {
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
        ERROR_MESSAGES.MAX_PARTICIPANTS_EXCEEDED
      );
    }

    // Create group in Redis
    const group = await createGroupInRedis(req.redisManager, phone_number_id, {
      subject,
      description: description || "",
      join_approval_mode,
      participants: participant_phone_numbers || [],
    });

    // Emit webhook
    const wbaId = req.user?.whatsapp_business_account_id || "default_wba";
    await emitGroupLifecycleWebhook(
      req.redisStreamManager,
      phone_number_id,
      group.id,
      "group_created",
      group,
      wbaId
    );

    // Emit Socket.IO event
    const io = require("../../../../utils/ws/SocketManager").getIO();
    if (io) {
      io.to(`group/${phone_number_id}`).emit("topic-data", {
        topic: `group/${phone_number_id}`,
        data: group,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(HTTP_STATUS.OK).json({
      group_id: group.id,
      message: "Group created successfully",
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
router.get("/:phone_number_id/groups", async (req, res) => {
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
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // List groups from Redis
    const result = await listGroupsFromRedis(
      req.redisManager,
      phone_number_id,
      limit,
      offset
    );

    // Format response
    const formattedGroups = result.data.map(formatGroupListResponse);

    res.status(HTTP_STATUS.OK).json({
      data: formattedGroups,
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
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.GROUP_NOT_FOUND
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
 * PUT /:phone_number_id/groups/:group_id
 * Update group settings
 */
router.put("/:phone_number_id/groups/:group_id", async (req, res) => {
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
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.GROUP_NOT_FOUND
      );
    }

    const wbaId = req.user?.whatsapp_business_account_id || "default_wba";

    // Update fields and emit webhooks
    if (subject !== undefined) {
      group.subject = subject;
      await emitGroupSettingsWebhook(
        req.redisStreamManager,
        phone_number_id,
        group_id,
        "subject",
        subject,
        wbaId
      );
    }

    if (description !== undefined) {
      group.description = description;
      await emitGroupSettingsWebhook(
        req.redisStreamManager,
        phone_number_id,
        group_id,
        "description",
        description,
        wbaId
      );
    }

    if (join_approval_mode !== undefined) {
      group.join_approval_mode = join_approval_mode;
      await emitGroupSettingsWebhook(
        req.redisStreamManager,
        phone_number_id,
        group_id,
        "join_approval_mode",
        join_approval_mode,
        wbaId
      );
    }

    // Update group in Redis
    const updatedGroup = await updateGroupInRedis(
      req.redisManager,
      phone_number_id,
      group
    );

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
router.delete("/:phone_number_id/groups/:group_id", async (req, res) => {
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
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.GROUP_NOT_FOUND
      );
    }

    // Delete group from Redis
    await deleteGroupFromRedis(req.redisManager, phone_number_id, group_id);

    // Emit webhook
    const wbaId = req.user?.whatsapp_business_account_id || "default_wba";
    await emitGroupLifecycleWebhook(
      req.redisStreamManager,
      phone_number_id,
      group_id,
      "group_deleted",
      group,
      wbaId
    );

    // Emit Socket.IO event
    const io = require("../../../../utils/ws/SocketManager").getIO();
    if (io) {
      io.to(`group/${phone_number_id}`).emit("topic-data", {
        topic: `group/${phone_number_id}`,
        data: { id: group_id, event: "deleted" },
        timestamp: new Date().toISOString(),
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: "Group deleted successfully",
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
router.post("/:phone_number_id/groups/:group_id/participants", async (req, res) => {
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
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.GROUP_NOT_FOUND
      );
    }

    // Check if adding participants would exceed limit
    if (group.participants.length + phone_numbers.length > MAX_PARTICIPANTS) {
      return sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.MAX_PARTICIPANTS_EXCEEDED
      );
    }

    // Add participants
    const result = await addParticipantsToGroup(
      req.redisManager,
      phone_number_id,
      group,
      phone_numbers
    );

    // Emit webhooks for each added participant
    const wbaId = req.user?.whatsapp_business_account_id || "default_wba";
    await emitBatchParticipantsWebhooks(
      req.redisStreamManager,
      phone_number_id,
      group_id,
      "participant_added",
      result.added_participants,
      wbaId
    );

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
 * DELETE /:phone_number_id/groups/:group_id/participants/:wa_id
 * Remove a participant from a group
 */
router.delete(
  "/:phone_number_id/groups/:group_id/participants/:wa_id",
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

      const { phone_number_id, group_id, wa_id } = req.params;

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

      // Remove participant
      const updatedGroup = await removeParticipantFromGroup(
        req.redisManager,
        phone_number_id,
        group,
        wa_id
      );

      if (!updatedGroup) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.PARTICIPANT_NOT_FOUND
        );
      }

      // Emit webhook
      const wbaId = req.user?.whatsapp_business_account_id || "default_wba";
      await emitGroupParticipantsWebhook(
        req.redisStreamManager,
        phone_number_id,
        group_id,
        "participant_removed",
        wa_id,
        wbaId
      );

      // Emit Socket.IO event
      const io = require("../../../../utils/ws/SocketManager").getIO();
      if (io) {
        io.to(`group/${phone_number_id}`).emit("topic-data", {
          topic: `group/${phone_number_id}`,
          data: {
            group_id,
            action: "participant_removed",
            wa_id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.OK).json({
        message: "Participant removed successfully",
      });
    } catch (error) {
      console.error("Error removing participant:", error);
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
      invite_link: inviteLink.link,
      expiration_timestamp: inviteLink.expiration_timestamp,
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
        invite_link: newInviteLink.link,
        expiration_timestamp: newInviteLink.expiration_timestamp,
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

    // If join_approval_mode is "off", return empty array
    if (group.join_approval_mode === "off") {
      return res.status(HTTP_STATUS.OK).json({ data: [] });
    }

    // Get join requests
    const joinRequests = await getJoinRequests(
      req.redisManager,
      phone_number_id,
      group_id
    );

    const formattedRequests = joinRequests.map(formatJoinRequestResponse);

    res.status(HTTP_STATUS.OK).json({ data: formattedRequests });
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

      // Check if join_approval_mode is "on_approval"
      if (group.join_approval_mode !== "on_approval") {
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
          ERROR_MESSAGES.USER_ALREADY_IN_GROUP
        );
      }

      // Add join request
      await addJoinRequest(req.redisManager, phone_number_id, group_id, wa_id);

      // Emit webhook
      const wbaId = req.user?.whatsapp_business_account_id || "default_wba";
      await emitGroupParticipantsWebhook(
        req.redisStreamManager,
        phone_number_id,
        group_id,
        "join_request_received",
        wa_id,
        wbaId
      );

      // Emit Socket.IO event
      const io = require("../../../../utils/ws/SocketManager").getIO();
      if (io) {
        io.to(`group/${phone_number_id}`).emit("topic-data", {
          topic: `group/${phone_number_id}`,
          data: {
            group_id,
            action: "join_request_received",
            wa_id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.OK).json({
        message: "Join request created",
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
 * POST /:phone_number_id/groups/:group_id/join_requests/:wa_id/approve
 * Approve a join request
 */
router.post(
  "/:phone_number_id/groups/:group_id/join_requests/:wa_id/approve",
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

      const { phone_number_id, group_id, wa_id } = req.params;

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

      // Check if join request exists
      const joinRequests = await getJoinRequests(
        req.redisManager,
        phone_number_id,
        group_id
      );
      const joinRequest = joinRequests.find((jr) => jr.wa_id === wa_id);

      if (!joinRequest) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.JOIN_REQUEST_NOT_FOUND
        );
      }

      // Check if adding participant would exceed limit
      if (group.participants.length >= MAX_PARTICIPANTS) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_MESSAGES.MAX_PARTICIPANTS_EXCEEDED
        );
      }

      // Add participant
      group.participants.push(wa_id);
      group.participant_count = group.participants.length;

      // Update group in Redis
      await updateGroupInRedis(req.redisManager, phone_number_id, group);

      // Remove join request
      await removeJoinRequest(req.redisManager, phone_number_id, group_id, wa_id);

      // Emit webhook
      const wbaId = req.user?.whatsapp_business_account_id || "default_wba";
      await emitGroupParticipantsWebhook(
        req.redisStreamManager,
        phone_number_id,
        group_id,
        "participant_added",
        wa_id,
        wbaId
      );

      // Emit Socket.IO event
      const io = require("../../../../utils/ws/SocketManager").getIO();
      if (io) {
        io.to(`group/${phone_number_id}`).emit("topic-data", {
          topic: `group/${phone_number_id}`,
          data: {
            group_id,
            action: "join_request_approved",
            wa_id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.OK).json({
        message: "Join request approved",
      });
    } catch (error) {
      console.error("Error approving join request:", error);
      sendErrorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * POST /:phone_number_id/groups/:group_id/join_requests/:wa_id/reject
 * Reject a join request
 */
router.post(
  "/:phone_number_id/groups/:group_id/join_requests/:wa_id/reject",
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

      const { phone_number_id, group_id, wa_id } = req.params;

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

      // Check if join request exists
      const joinRequests = await getJoinRequests(
        req.redisManager,
        phone_number_id,
        group_id
      );
      const joinRequest = joinRequests.find((jr) => jr.wa_id === wa_id);

      if (!joinRequest) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          ERROR_MESSAGES.JOIN_REQUEST_NOT_FOUND
        );
      }

      // Remove join request
      await removeJoinRequest(req.redisManager, phone_number_id, group_id, wa_id);

      // Emit webhook
      const wbaId = req.user?.whatsapp_business_account_id || "default_wba";
      await emitGroupParticipantsWebhook(
        req.redisStreamManager,
        phone_number_id,
        group_id,
        "join_request_rejected",
        wa_id,
        wbaId
      );

      // Emit Socket.IO event
      const io = require("../../../../utils/ws/SocketManager").getIO();
      if (io) {
        io.to(`group/${phone_number_id}`).emit("topic-data", {
          topic: `group/${phone_number_id}`,
          data: {
            group_id,
            action: "join_request_rejected",
            wa_id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(HTTP_STATUS.OK).json({
        message: "Join request rejected",
      });
    } catch (error) {
      console.error("Error rejecting join request:", error);
      sendErrorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }
);

module.exports = router;


/**
 * POST /:phone_number_id/groups/test/generate
 * Generate test groups with sample data
 */
router.post("/:phone_number_id/groups/test/generate", async (req, res) => {
  try {
    const { phone_number_id } = req.params;
    const { count = 5 } = req.body;

    const { generateTestGroups } = require("./testDataGenerator");

    const wbaId = req.user?.whatsapp_business_account_id || "default_wba";
    const createdGroups = await generateTestGroups(
      req.redisManager,
      req.redisStreamManager,
      phone_number_id,
      wbaId,
      count
    );

    res.status(HTTP_STATUS.OK).json({
      message: `Generated ${createdGroups.length} test groups`,
      groups: createdGroups.map((g) => ({
        group_id: g.id,
        subject: g.subject,
        participant_count: g.participant_count,
      })),
    });
  } catch (error) {
    console.error("Error generating test groups:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * GET /:phone_number_id/groups/export
 * Export all group data
 */
router.get("/:phone_number_id/groups/export", async (req, res) => {
  try {
    const { phone_number_id } = req.params;

    const { exportGroupData } = require("./testDataGenerator");

    const exportedData = await exportGroupData(req.redisManager, phone_number_id);

    res.status(HTTP_STATUS.OK).json(exportedData);
  } catch (error) {
    console.error("Error exporting group data:", error);
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
});

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

module.exports = router;
