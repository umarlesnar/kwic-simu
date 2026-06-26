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
                  request_id: group?.request_id,
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
                  request_id: group?.request_id,
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
                  request_id: group?.request_id,
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
                  request_id: group?.request_id,
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
                  request_id: group?.request_id,
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
                  request_id: group?.request_id,
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
export function buildGroupCreateSuccess(wba_id, phone_number_id, group) {
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
                  subject: group?.subject || "Simulated Group",
                  description: group?.description || "",
                  request_id: group?.request_id,
                  group_id: group?.id || `${Date.now()}@g.us`,
                  invite_link: group?.invite_link,
                  join_approval_mode: group?.join_approval_mode,
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

export function buildGroupDeleteSuccess(wba_id, phone_number_id, group) {
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
                  type: "group_delete",
                  group_id: group.id,
                  request_id: group?.request_id,
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

export function buildGroupSettingsUpdateSuccess(
  wba_id,
  phone_number_id,
  group,
  { subject, description, join_approval_mode } = {}
) {
  const ts = String(Math.floor(Date.now() / 1000));
  const payload = {
    timestamp: ts,
    group_id: group.id,
    type: "group_settings_update",
    request_id: group?.request_id,
  };

  if (subject !== undefined) {
    payload.group_subject = { text: subject, update_successful: true };
  }
  if (description !== undefined) {
    payload.group_description = { text: description, update_successful: true };
  }
  if (join_approval_mode !== undefined) {
    payload.join_approval_mode = join_approval_mode;
  }

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              groups: [payload],
            },
            field: "group_settings_update",
          },
        ],
      },
    ],
  };
}

export function buildGroupParticipantsAddInviteLinkSuccess(
  wba_id,
  phone_number_id,
  group_id,
  wa_id
) {
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
                  group_id,
                  type: "group_participants_add",
                  reason: "invite_link",
                  added_participants: [{ wa_id }],
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

export function buildGroupParticipantsRemoveSuccess(
  wba_id,
  phone_number_id,
  group,
  removed_participants,
  initiated_by = "business"
) {
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
                  request_id: group?.request_id,
                  initiated_by,
                  removed_participants,
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

export function buildGroupJoinRequestsApprovedSuccess(
  wba_id,
  phone_number_id,
  group_id,
  approvedRows
) {
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
                  group_id,
                  type: "group_participants_add",
                  reason: "invite_link",
                  added_participants: approvedRows.map((r) => ({
                    input: r.input,
                    wa_id: r.wa_id,
                  })),
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

export function buildGroupJoinRequestCreated(
  wba_id,
  phone_number_id,
  group,
  { wa_id, join_request_id, reason = "invite_link" } = {}
) {
  return buildGroupJoinRequestLifecycle(
    wba_id,
    phone_number_id,
    group,
    "group_join_request_created",
    { wa_id, join_request_id, reason }
  );
}

export function buildGroupJoinRequestRevoked(
  wba_id,
  phone_number_id,
  group,
  { wa_id, join_request_id, reason = "invite_link" } = {}
) {
  return buildGroupJoinRequestLifecycle(
    wba_id,
    phone_number_id,
    group,
    "group_join_request_revoked",
    { wa_id, join_request_id, reason }
  );
}

function buildGroupJoinRequestLifecycle(
  wba_id,
  phone_number_id,
  group,
  type,
  { wa_id, join_request_id, reason = "invite_link" }
) {
  const ts = String(Math.floor(Date.now() / 1000));
  const groupPayload = {
    timestamp: ts,
    group_id: group.id,
    type,
    reason,
    wa_id: wa_id || "15550009999",
  };
  if (join_request_id) groupPayload.join_request_id = join_request_id;

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              groups: [groupPayload],
            },
            field: "group_participants_update",
          },
        ],
      },
    ],
  };
}

export function buildGroupParticipantsAddFail(
  wba_id,
  phone_number_id,
  group_id,
  failed_participants = [],
  is_partial = false
) {
  const ts = String(Math.floor(Date.now() / 1000));
  const groupPayload = {
    timestamp: ts,
    group_id,
    type: "group_participants_add",
    reason: "invite_link",
    failed_participants,
  };

  if (is_partial) {
    groupPayload.errors = err(
      131201,
      "Not All Participants Add Succeeded",
      "Failed to add some participants to the group",
      "Simulated partial failure"
    );
  } else {
    groupPayload.errors = err(
      131202,
      "Add failed",
      "No participants added",
      "Simulated total add failure"
    );
  }

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wba_id,
        changes: [
          {
            value: {
              ...meta(phone_number_id),
              groups: [groupPayload],
            },
            field: "group_participants_update",
          },
        ],
      },
    ],
  };
}
