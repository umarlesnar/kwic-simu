/**
 * Group Webhooks
 * Handles webhook emission for group events
 */

const {
  WEBHOOK_EVENT_TYPES,
  PARTICIPANT_ACTIONS,
  SETTINGS_UPDATE_FIELDS,
} = require("./constants");

/**
 * Emits a group lifecycle update webhook
 * @param {object} redisStreamManager - Redis stream manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @param {string} eventType - Event type (group_created, group_updated, group_deleted)
 * @param {object} groupData - Group data to include in webhook
 * @param {string} wbaId - WhatsApp Business Account ID
 */
async function emitGroupLifecycleWebhook(
  redisStreamManager,
  phoneNumberId,
  groupId,
  eventType,
  groupData,
  wbaId
) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    const webhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: wbaId,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  phone_number_id: phoneNumberId,
                  display_phone_number: phoneNumberId,
                },
                groups: [
                  {
                    timestamp,
                    group_id: groupId,
                    type: eventType, // e.g., group_create, group_delete
                    subject: groupData.subject,
                    description: groupData.description,
                    join_approval_mode: groupData.join_approval_mode,
                    invite_link: groupData.invite_link,
                  },
                ],
              },
              field: "group_lifecycle_update",
            },
          ],
        },
      ],
    };

    await redisStreamManager.sendWebhookMessage(webhookPayload);
    console.log(
      `Group lifecycle webhook emitted: ${eventType} for group ${groupId}`
    );
  } catch (error) {
    console.error("Error emitting group lifecycle webhook:", error);
  }
}

/**
 * Emits a group participants update webhook
 * @param {object} redisStreamManager - Redis stream manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @param {string} action - Action type (participant_added, participant_removed, etc.)
 * @param {string} waId - WhatsApp ID of affected participant
 * @param {string} wbaId - WhatsApp Business Account ID
 */
async function emitGroupParticipantsWebhook(
  redisStreamManager,
  phoneNumberId,
  groupId,
  action,
  waId,
  wbaId
) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    const webhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: wbaId,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  phone_number_id: phoneNumberId,
                  display_phone_number: phoneNumberId,
                },
                groups: [
                  {
                    timestamp,
                    group_id: groupId,
                    type: action, // e.g., group_participants_add, group_participants_remove
                    wa_id: waId,
                  },
                ],
              },
              field: "group_participants_update",
            },
          ],
        },
      ],
    };

    await redisStreamManager.sendWebhookMessage(webhookPayload);
    console.log(
      `Group participants webhook emitted: ${action} for participant ${waId} in group ${groupId}`
    );
  } catch (error) {
    console.error("Error emitting group participants webhook:", error);
  }
}

/**
 * Emits a group settings update webhook
 * @param {object} redisStreamManager - Redis stream manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @param {string} field - Field that was updated (subject, description, join_approval_mode)
 * @param {*} newValue - New value of the field
 * @param {string} wbaId - WhatsApp Business Account ID
 */
async function emitGroupSettingsWebhook(
  redisStreamManager,
  phoneNumberId,
  groupId,
  field,
  newValue,
  wbaId
) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    const webhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: wbaId,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  phone_number_id: phoneNumberId,
                  display_phone_number: phoneNumberId,
                },
                groups: [
                  {
                    timestamp,
                    group_id: groupId,
                    type: "group_settings_update",
                    [field === "subject" ? "group_subject" : field === "description" ? "group_description" : field]: {
                      text: newValue,
                      update_successful: true,
                    },
                  },
                ],
              },
              field: "group_settings_update",
            },
          ],
        },
      ],
    };

    await redisStreamManager.sendWebhookMessage(webhookPayload);
    console.log(
      `Group settings webhook emitted: ${field} updated for group ${groupId}`
    );
  } catch (error) {
    console.error("Error emitting group settings webhook:", error);
  }
}

/**
 * Emits multiple participant webhooks for batch operations
 * @param {object} redisStreamManager - Redis stream manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @param {string} action - Action type
 * @param {array} waIds - Array of WhatsApp IDs
 * @param {string} wbaId - WhatsApp Business Account ID
 */
async function emitBatchParticipantsWebhooks(
  redisStreamManager,
  phoneNumberId,
  groupId,
  action,
  waIds,
  wbaId
) {
  try {
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
  } catch (error) {
    console.error("Error emitting batch participants webhooks:", error);
  }
}

module.exports = {
  emitGroupLifecycleWebhook,
  emitGroupParticipantsWebhook,
  emitGroupSettingsWebhook,
  emitBatchParticipantsWebhooks,
};
