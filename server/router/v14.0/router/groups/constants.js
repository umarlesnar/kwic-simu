/**
 * Groups API Constants
 * Defines all constants used throughout the Groups API module
 */

// Participant and group limits
const MAX_PARTICIPANTS = 8;
const MAX_GROUPS_PER_PHONE = 10000;

// Invite link configuration
const INVITE_LINK_TTL = 86400; // 24 hours in seconds

// Group ID suffix
const GROUP_ID_SUFFIX = "@g.us";

// Join approval modes
const JOIN_APPROVAL_MODES = {
  ON_APPROVAL: "on_approval",
  OFF: "off",
};

// Redis key patterns
const REDIS_KEY_PATTERNS = {
  GROUP: (phoneNumberId, groupId) => `group:${phoneNumberId}:${groupId}`,
  GROUP_INDEX: (phoneNumberId) => `group_index:${phoneNumberId}`,
  GROUP_PARTICIPANTS: (phoneNumberId, groupId) =>
    `group:${phoneNumberId}:${groupId}:participants`,
  GROUP_JOIN_REQUESTS: (phoneNumberId, groupId) =>
    `group:${phoneNumberId}:${groupId}:join_requests`,
  GROUP_INVITE_LINK: (phoneNumberId, groupId) =>
    `group:${phoneNumberId}:${groupId}:invite_link`,
};

// Webhook event types
const WEBHOOK_EVENT_TYPES = {
  GROUP_CREATED: "group_created",
  GROUP_UPDATED: "group_updated",
  GROUP_DELETED: "group_deleted",
};

// Participant action types
const PARTICIPANT_ACTIONS = {
  PARTICIPANT_ADDED: "participant_added",
  PARTICIPANT_REMOVED: "participant_removed",
  JOIN_REQUEST_RECEIVED: "join_request_received",
  JOIN_REQUEST_APPROVED: "join_request_approved",
  JOIN_REQUEST_REJECTED: "join_request_rejected",
};

// Settings update field types
const SETTINGS_UPDATE_FIELDS = {
  SUBJECT: "subject",
  DESCRIPTION: "description",
  JOIN_APPROVAL_MODE: "join_approval_mode",
};

// Error messages
const ERROR_MESSAGES = {
  INVALID_PHONE_NUMBER_ID: "Invalid phone_number_id",
  INVALID_GROUP_ID: "Invalid group_id",
  MISSING_REQUIRED_FIELDS: "Missing required fields",
  GROUP_NOT_FOUND: "Group not found",
  PARTICIPANT_NOT_FOUND: "Participant not found",
  JOIN_REQUEST_NOT_FOUND: "Join request not found",
  MAX_PARTICIPANTS_EXCEEDED: "Maximum 8 participants allowed",
  USER_ALREADY_IN_GROUP: "User already in group",
  GROUP_DOES_NOT_REQUIRE_APPROVAL: "Group does not require approval",
  INTERNAL_SERVER_ERROR: "Internal server error",
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

module.exports = {
  MAX_PARTICIPANTS,
  MAX_GROUPS_PER_PHONE,
  INVITE_LINK_TTL,
  GROUP_ID_SUFFIX,
  JOIN_APPROVAL_MODES,
  REDIS_KEY_PATTERNS,
  WEBHOOK_EVENT_TYPES,
  PARTICIPANT_ACTIONS,
  SETTINGS_UPDATE_FIELDS,
  ERROR_MESSAGES,
  HTTP_STATUS,
};
