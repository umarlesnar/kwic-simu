/**
 * Meta-shaped group webhook payloads (server-side; mirrors client wbGroupFailedWebhooks.js)
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

function buildGroupCreateSuccess(wba_id, phone_number_id, group) {
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

function buildGroupCreateFail(wba_id, phone_number_id, pending) {
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
                  subject: pending?.subject || "Simulated subject",
                  description: pending?.description || "",
                  request_id: pending?.request_id,
                  errors: err(
                    400,
                    "Creation failed",
                    "Could not create group",
                    "Simulated group_create failure"
                  ),
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

function buildGroupDeleteSuccess(wba_id, phone_number_id, group) {
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

function buildGroupSettingsUpdateSuccess(
  wba_id,
  phone_number_id,
  group,
  { subject, description, join_approval_mode } = {}
) {
  const ts = String(Math.floor(Date.now() / 1000));
  const groupPayload = {
    timestamp: ts,
    group_id: group.id,
    type: "group_settings_update",
    request_id: group?.request_id,
  };

  if (subject !== undefined) {
    groupPayload.group_subject = { text: subject, update_successful: true };
  }
  if (description !== undefined) {
    groupPayload.group_description = { text: description, update_successful: true };
  }
  if (join_approval_mode !== undefined) {
    groupPayload.join_approval_mode = join_approval_mode;
  }
  // if (profile_picture !== undefined) {
  //   groupPayload.profile_picture = profile_picture;
  // }

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
            field: "group_settings_update",
          },
        ],
      },
    ],
  };
}

function buildGroupParticipantsAddInviteLinkSuccess(
  wba_id,
  phone_number_id,
  group_id,
  waIds
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
                  added_participants: waIds.map((wa_id) => ({ wa_id })),
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

function buildGroupParticipantsRemoveSuccess(
  wba_id,
  phone_number_id,
  group,
  { removed_participants = [], request_id, initiated_by = "business" } = {}
) {
  const ts = String(Math.floor(Date.now() / 1000));
  const groupPayload = {
    timestamp: ts,
    group_id: group.id,
    type: "group_participants_remove",
    initiated_by,
    removed_participants,
  };
  if (request_id) groupPayload.request_id = request_id;

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

function buildGroupJoinRequestsApprovedSuccess(
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

function buildGroupJoinRequestLifecycle(
  wba_id,
  phone_number_id,
  group_id,
  type,
  { wa_id, join_request_id, reason = "invite_link" }
) {
  const ts = String(Math.floor(Date.now() / 1000));
  const groupPayload = {
    timestamp: ts,
    group_id,
    type,
    reason,
    wa_id,
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

function buildGroupParticipantsAddFail(
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
    groupPayload.errors = [
      {
        code: "131201",
        title: "Not All Participants Add Succeeded",
        message: "Failed to add some participants to the group",
        error_data: { details: "Simulated partial failure" },
      },
    ];
  } else {
    groupPayload.errors = [
      {
        code: "131202",
        title: "Add failed",
        message: "No participants added",
        error_data: { details: "Simulated total add failure" },
      },
    ];
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

module.exports = {
  buildGroupCreateSuccess,
  buildGroupCreateFail,
  buildGroupDeleteSuccess,
  buildGroupSettingsUpdateSuccess,
  buildGroupParticipantsAddInviteLinkSuccess,
  buildGroupParticipantsRemoveSuccess,
  buildGroupJoinRequestsApprovedSuccess,
  buildGroupJoinRequestLifecycle,
  buildGroupParticipantsAddFail,
};
