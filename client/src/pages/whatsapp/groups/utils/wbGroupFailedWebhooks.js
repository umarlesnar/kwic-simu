/**
 * Sample payloads for Groups API "failed outcome" webhooks that are hard to reach via happy-path simulation.
 */

function meta(phone_number_id) {
  return {
    messaging_product: "whatsapp",
    metadata: {
      display_phone_number: phone_number_id,
      phone_number_id,
    },
  };
}

function err(code, title, message, details) {
  return [
    {
      code: String(code),
      title,
      message,
      error_data: { details },
    },
  ];
}

export function buildGroupCreateFail(wba_id, phone_number_id, group) {
  const ts = String(Math.floor(Date.now() / 1000));
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              groups: [
                {
                  timestamp: ts,
                  type: "group_create",
                  subject: group?.subject || "Simulated subject",
                  description: group?.description || "",
                  request_id: `req_create_fail_${ts}`,
                  group_id: group?.id,
                  errors: err(400, "Creation failed", "Could not create group", "Simulated group_create failure"),
                },
              ],
            },
            field: "group_lifecycle_update",
          },
        ],
      },
    ],
  };
}

export function buildGroupDeleteFail(wba_id, phone_number_id, group) {
  const ts = String(Math.floor(Date.now() / 1000));
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              groups: [
                {
                  timestamp: ts,
                  group_id: group.id,
                  type: "group_delete",
                  request_id: `req_delete_fail_${ts}`,
                  errors: err(131051, "Delete failed", "Unable to delete group", "Simulated group_delete failure"),
                },
              ],
            },
            field: "group_lifecycle_update",
          },
        ],
      },
    ],
  };
}

export function buildGroupParticipantsRemovePartialFail(wba_id, phone_number_id, group) {
  const ts = String(Math.floor(Date.now() / 1000));
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              groups: [
                {
                  timestamp: ts,
                  group_id: group.id,
                  type: "group_participants_remove",
                  request_id: `req_remove_partial_${ts}`,
                  initiated_by: "business",
                  removed_participants: [{ input: "15550000001" }],
                  failed_participants: [
                    {
                      input: "15550000002",
                      errors: err(131052, "Not removed", "Participant could not be removed", "Simulated partial failure"),
                    },
                  ],
                  errors: [
                    {
                      code: "131053",
                      message: "Failed to remove some participants from the group",
                      title: "Not All Participants Remove Succeeded",
                      error_data: { details: "Simulated batch remove warning" },
                    },
                  ],
                },
              ],
            },
            field: "group_participants_update",
          },
        ],
      },
    ],
  };
}

export function buildGroupParticipantsRemoveTotalFail(wba_id, phone_number_id, group) {
  const ts = String(Math.floor(Date.now() / 1000));
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              groups: [
                {
                  timestamp: ts,
                  group_id: group.id,
                  type: "group_participants_remove",
                  request_id: `req_remove_fail_${ts}`,
                  initiated_by: "business",
                  failed_participants: [{ input: "15550000003" }, { input: "15550000004" }],
                  errors: err(131054, "Remove failed", "No participants removed", "Simulated total remove failure"),
                },
              ],
            },
            field: "group_participants_update",
          },
        ],
      },
    ],
  };
}

export function buildGroupSettingsPartialFail(wba_id, phone_number_id, group) {
  const ts = String(Math.floor(Date.now() / 1000));
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              groups: [
                {
                  timestamp: ts,
                  group_id: group.id,
                  type: "group_settings_update",
                  request_id: `req_settings_partial_${ts}`,
                  profile_picture: {
                    mime_type: "image/jpeg",
                    update_successful: true,
                    sha256: "simulated_sha256_ok",
                  },
                  group_subject: {
                    text: "New subject",
                    update_successful: false,
                    errors: err(200, "Subject error", "Could not update subject", "Simulated subject failure"),
                  },
                  group_description: {
                    text: "New description",
                    update_successful: false,
                    errors: err(201, "Description error", "Could not update description", "Simulated description failure"),
                  },
                  errors: err(202, "Partial failure", "Some settings failed", "Simulated aggregate settings error"),
                },
              ],
            },
            field: "group_settings_update",
          },
        ],
      },
    ],
  };
}

export function buildGroupSettingsTotalFail(wba_id, phone_number_id, group) {
  const ts = String(Math.floor(Date.now() / 1000));
  const e = err(500, "Settings failed", "All settings updates failed", "Simulated total settings failure");
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              groups: [
                {
                  timestamp: ts,
                  group_id: group.id,
                  request_id: `req_settings_total_${ts}`,
                  type: "group_settings_update",
                  profile_picture: {
                    mime_type: "image/jpeg",
                    sha256: "simulated_sha256_bad",
                    update_successful: false,
                    errors: e,
                  },
                  group_subject: {
                    text: "Subject",
                    update_successful: false,
                    errors: e,
                  },
                  group_description: {
                    text: "Description",
                    update_successful: false,
                    errors: e,
                  },
                  errors: e,
                },
              ],
            },
            field: "group_settings_update",
          },
        ],
      },
    ],
  };
}

export function buildGroupSuspend(wba_id, phone_number_id, group) {
  const ts = String(Math.floor(Date.now() / 1000));
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              groups: [
                {
                  timestamp: ts,
                  type: "group_suspend",
                  group_id: group.id,
                },
              ],
            },
            field: "group_status_update",
          },
        ],
      },
    ],
  };
}

export function buildGroupSuspendCleared(wba_id, phone_number_id, group) {
  const ts = String(Math.floor(Date.now() / 1000));
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              groups: [
                {
                  timestamp: ts,
                  type: "group_suspend_cleared",
                  group_id: group.id,
                },
              ],
            },
            field: "group_status_update",
          },
        ],
      },
    ],
  };
}

export function buildGroupMessageFailed(wba_id, phone_number_id, group, messageId = null) {
  const mid = messageId || `wamid.simFailed${Date.now()}`;
  const ts = String(Math.floor(Date.now() / 1000));
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              statuses: [
                {
                  id: mid,
                  recipient_id: group.id,
                  recipient_type: "group",
                  status: "failed",
                  timestamp: ts,
                  errors: err(131026, "Message undeliverable", "Message undeliverable", "Simulated group message send failure"),
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}
