/**
 * Group Webhooks — Meta Cloud API shaped payloads (incl. request_id where applicable)
 */

const { generateGraphRequestId } = require("./models");

function tsString() {
  return String(Math.floor(Date.now() / 1000));
}

function buildEntry(wbaId, field, valuePayload) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wbaId,
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              ...valuePayload,
            },
            field,
          },
        ],
      },
    ],
  };
}

/**
 * group_lifecycle_update — group_create | group_delete (success or fail)
 */
async function emitGroupLifecycleWebhook(
  redisStreamManager,
  phoneNumberId,
  groupId,
  eventType,
  groupData,
  wbaId,
  options = {}
) {
  try {
    const requestId =
      options.requestId || groupData?.request_id || generateGraphRequestId();
    const timestamp = tsString();
    const groupObj = {
      timestamp,
      type: eventType,
      request_id: requestId,
    };

    if (groupId) groupObj.group_id = groupId;

    if (eventType === "group_create" && options.errors?.length) {
      groupObj.subject = groupData?.subject;
      groupObj.description = groupData?.description;
      groupObj.errors = options.errors;
    } else if (eventType === "group_create") {
      groupObj.subject = groupData?.subject;
      groupObj.invite_link = groupData?.invite_link;
      groupObj.join_approval_mode = groupData?.join_approval_mode;
    } else if (eventType === "group_delete" && options.errors?.length) {
      groupObj.errors = options.errors;
    }

    const payload = buildEntry(wbaId, "group_lifecycle_update", {
      metadata: {
        phone_number_id: phoneNumberId,
        display_phone_number: phoneNumberId,
      },
      groups: [groupObj],
    });

    await redisStreamManager.sendWebhookMessage(payload);
    console.log(`[Webhook Emit] ${eventType} for WBA: ${wbaId} | request_id=${requestId}`);
    return requestId;
  } catch (error) {
    console.error("Error emitting group lifecycle webhook:", error);
    return null;
  }
}

/**
 * User joined via invite link (auto_approve) — group_participants_add + reason invite_link
 */
async function emitGroupParticipantsAddInviteLink(
  redisStreamManager,
  phoneNumberId,
  groupId,
  addedParticipants,
  wbaId
) {
  try {
    const payload = buildEntry(wbaId, "group_participants_update", {
      metadata: {
        phone_number_id: phoneNumberId,
        display_phone_number: phoneNumberId,
      },
      groups: [
        {
          timestamp: tsString(),
          group_id: groupId,
          type: "group_participants_add",
          reason: "invite_link",
          added_participants: addedParticipants.map((p) =>
            typeof p === "string" ? { wa_id: p } : { input: p.input || p.wa_id, wa_id: p.wa_id }
          ),
        },
      ],
    });
    await redisStreamManager.sendWebhookMessage(payload);
  } catch (error) {
    console.error("Error emitting group_participants_add webhook:", error);
  }
}

/**
 * Join request created / revoked (single user)
 */
async function emitGroupJoinRequestLifecycle(
  redisStreamManager,
  phoneNumberId,
  groupId,
  type,
  waId,
  wbaId,
  joinRequestId
) {
  try {
    const group = {
      timestamp: tsString(),
      group_id: groupId,
      type,
      reason: "invite_link",
      wa_id: waId,
    };
    if (joinRequestId) group.join_request_id = joinRequestId;

    const payload = buildEntry(wbaId, "group_participants_update", {
      metadata: {
        phone_number_id: phoneNumberId,
        display_phone_number: phoneNumberId,
      },
      groups: [group],
    });
    await redisStreamManager.sendWebhookMessage(payload);
  } catch (error) {
    console.error("Error emitting join request lifecycle webhook:", error);
  }
}

/**
 * Join requests approved — bulk add with input + wa_id
 */
async function emitGroupJoinRequestsApproved(
  redisStreamManager,
  phoneNumberId,
  groupId,
  rows,
  wbaId
) {
  try {
    const payload = buildEntry(wbaId, "group_participants_update", {
      metadata: {
        phone_number_id: phoneNumberId,
        display_phone_number: phoneNumberId,
      },
      groups: [
        {
          timestamp: tsString(),
          group_id: groupId,
          type: "group_participants_add",
          reason: "invite_link",
          added_participants: rows.map((r) => ({
            input: r.input,
            wa_id: r.wa_id,
          })),
        },
      ],
    });
    await redisStreamManager.sendWebhookMessage(payload);
  } catch (error) {
    console.error("Error emitting join requests approved webhook:", error);
  }
}

/**
 * Participant remove (business) or leave — Meta-shaped group object
 */
async function emitGroupParticipantsRemove(
  redisStreamManager,
  phoneNumberId,
  groupId,
  wbaId,
  {
    requestId,
    initiated_by = "business",
    removed_participants = [],
    failed_participants = [],
    errors = [],
  }
) {
  try {
    const group = {
      timestamp: tsString(),
      group_id: groupId,
      type: "group_participants_remove",
      initiated_by,
      removed_participants,
    };
    if (requestId) group.request_id = requestId;
    if (failed_participants.length) group.failed_participants = failed_participants;
    if (errors.length) group.errors = errors;

    const value = {
      metadata: {
        phone_number_id: phoneNumberId,
        display_phone_number: phoneNumberId,
      },
      groups: [group],
    };

    const payload = buildEntry(wbaId, "group_participants_update", value);
    await redisStreamManager.sendWebhookMessage(payload);
  } catch (error) {
    console.error("Error emitting group_participants_remove webhook:", error);
  }
}

/**
 * Settings update — single webhook with optional subject/description/profile blocks
 */
async function emitGroupSettingsUpdateCombined(
  redisStreamManager,
  phoneNumberId,
  groupId,
  wbaId,
  requestId,
  parts
) {
  try {
    const group = {
      timestamp: tsString(),
      group_id: groupId,
      type: "group_settings_update",
      request_id: requestId,
    };
    if (parts.group_subject) group.group_subject = parts.group_subject;
    if (parts.group_description) group.group_description = parts.group_description;
    if (parts.profile_picture) group.profile_picture = parts.profile_picture;
    if (parts.join_approval_mode) group.join_approval_mode = parts.join_approval_mode;
    if (parts.errors?.length) group.errors = parts.errors;

    const payload = buildEntry(wbaId, "group_settings_update", {
      metadata: {
        phone_number_id: phoneNumberId,
        display_phone_number: phoneNumberId,
      },
      groups: [group],
    });
    await redisStreamManager.sendWebhookMessage(payload);
  } catch (error) {
    console.error("Error emitting group settings webhook:", error);
  }
}

/** @deprecated use emitGroupParticipantsAddInviteLink */
async function emitGroupParticipantsWebhook(
  redisStreamManager,
  phoneNumberId,
  groupId,
  action,
  waId,
  wbaId,
  extra = {}
) {
  if (action === "group_participants_add" || action === "participant_added") {
    await emitGroupParticipantsAddInviteLink(
      redisStreamManager,
      phoneNumberId,
      groupId,
      [{ input: extra.input || waId, wa_id: waId }],
      wbaId
    );
    return;
  }
  if (action === "group_participants_remove") {
    await emitGroupParticipantsRemove(redisStreamManager, phoneNumberId, groupId, wbaId, {
      requestId: extra.requestId,
      initiated_by: extra.initiated_by || "business",
      removed_participants: extra.removed_participants || [{ input: waId }],
      failed_participants: extra.failed_participants || [],
      errors: extra.errors || [],
    });
    return;
  }
  if (action === "group_join_request_created") {
    await emitGroupJoinRequestLifecycle(
      redisStreamManager,
      phoneNumberId,
      groupId,
      "group_join_request_created",
      waId,
      wbaId,
      extra.join_request_id
    );
    return;
  }
  if (action === "join_request_received") {
    await emitGroupJoinRequestLifecycle(
      redisStreamManager,
      phoneNumberId,
      groupId,
      "group_join_request_created",
      waId,
      wbaId,
      extra.join_request_id
    );
    return;
  }
  if (action === "group_join_request_revoked") {
    await emitGroupJoinRequestLifecycle(
      redisStreamManager,
      phoneNumberId,
      groupId,
      "group_join_request_revoked",
      waId,
      wbaId,
      extra.join_request_id
    );
  }
}

/** @deprecated use emitGroupParticipantsAddInviteLink in a loop or batch */
async function emitBatchParticipantsWebhooks(
  redisStreamManager,
  phoneNumberId,
  groupId,
  action,
  waIds,
  wbaId
) {
  if (action === "participant_added" || action === "group_participants_add") {
    await emitGroupParticipantsAddInviteLink(
      redisStreamManager,
      phoneNumberId,
      groupId,
      waIds.map((id) => ({ input: id, wa_id: id })),
      wbaId
    );
    return;
  }
  for (const waId of waIds) {
    await emitGroupParticipantsWebhook(
      redisStreamManager,
      phoneNumberId,
      groupId,
      action,
      waId,
      wbaId
    );
  }
}

/** @deprecated use emitGroupSettingsUpdateCombined */
async function emitGroupSettingsWebhook(
  redisStreamManager,
  phoneNumberId,
  groupId,
  field,
  newValue,
  wbaId,
  requestId = generateGraphRequestId()
) {
  const parts = {};
  if (field === "subject") {
    parts.group_subject = { text: newValue, update_successful: true };
  } else if (field === "description") {
    parts.group_description = { text: newValue, update_successful: true };
  } else {
    return;
  }
  await emitGroupSettingsUpdateCombined(
    redisStreamManager,
    phoneNumberId,
    groupId,
    wbaId,
    requestId,
    parts
  );
}

module.exports = {
  emitGroupLifecycleWebhook,
  emitGroupParticipantsWebhook,
  emitGroupSettingsWebhook,
  emitBatchParticipantsWebhooks,
  emitGroupParticipantsAddInviteLink,
  emitGroupJoinRequestLifecycle,
  emitGroupJoinRequestsApproved,
  emitGroupParticipantsRemove,
  emitGroupSettingsUpdateCombined,
  generateGraphRequestId,
};
