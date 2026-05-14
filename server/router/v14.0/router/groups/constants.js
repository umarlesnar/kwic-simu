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
  APPROVAL_REQUIRED: "approval_required",
  AUTO_APPROVE: "auto_approve",
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
  GLOBAL_GROUP_MAP: (groupId) => `group_map:${groupId}`,
  GLOBAL_INVITE_LINK_MAP: (token) => `invite_link_map:${token}`,
};

// Webhook event types
const WEBHOOK_EVENT_TYPES = {
  GROUP_CREATE: "group_create",
  GROUP_DELETE: "group_delete",
  GROUP_PARTICIPANTS_ADD: "group_participants_add",
  GROUP_PARTICIPANTS_REMOVE: "group_participants_remove",
  GROUP_JOIN_REQUEST_CREATED: "group_join_request_created",
  GROUP_JOIN_REQUEST_REVOKED: "group_join_request_revoked",
  GROUP_SETTINGS_UPDATE: "group_settings_update",
  GROUP_SUSPEND: "group_suspend",
  GROUP_SUSPEND_CLEARED: "group_suspend_cleared",
};

// Participant action types
const PARTICIPANT_ACTIONS = {
  GROUP_PARTICIPANTS_ADD: "group_participants_add",
  GROUP_PARTICIPANTS_REMOVE: "group_participants_remove",
  GROUP_JOIN_REQUEST_CREATED: "group_join_request_created",
  GROUP_JOIN_REQUEST_REVOKED: "group_join_request_revoked",
};

// Settings update field types
const SETTINGS_UPDATE_FIELDS = {
  SUBJECT: "subject",
  DESCRIPTION: "description",
  JOIN_APPROVAL_MODE: "join_approval_mode",
};

// WhatsApp Group API Error Codes
const GROUP_ERROR_CODES = {
  BAD_GROUP: 131020,
  GROUP_UNKNOWN: 131041,
  INVALID_CURSOR: 131059,
  REQUEST_PARTIALLY_SUCCEEDED: 131201,
  DUPLICATE_PARTICIPANT: 131202,
  PARTICIPANT_OVERLIMIT: 131204,
  GROUP_SUSPENDED: 131207,
  GROUP_RATE_LIMIT_HIT: 131208,
  INVALID_IMAGE_ASPECT_RATIO: 131209,
  IMAGE_TOO_SMALL: 131210,
  GROUP_CREATE_LIMIT_REACHED: 131211,
  PARTICIPANT_NOT_IN_GROUP: 131212,
  JOIN_REQUEST_NOT_FOUND: 131213,
  GROUP_CREATION_DISABLED: 131214,
  INELIGIBLE_FOR_GROUPS: 131215,
};

// Error messages
const ERROR_MESSAGES = {
  [GROUP_ERROR_CODES.BAD_GROUP]: "Cannot send messages to single member groups.",
  [GROUP_ERROR_CODES.GROUP_UNKNOWN]: "The group was not found, either because it doesn’t exist or you are not a member.",
  [GROUP_ERROR_CODES.INVALID_CURSOR]: "The cursor has either expired or become corrupted. Start pagination from the beginning again.",
  [GROUP_ERROR_CODES.REQUEST_PARTIALLY_SUCCEEDED]: "Not all participant-level operations in the request succeeded.",
  [GROUP_ERROR_CODES.DUPLICATE_PARTICIPANT]: "Duplicate participants in the participant array input.",
  [GROUP_ERROR_CODES.PARTICIPANT_OVERLIMIT]: "Group participant size exceeds limit.",
  [GROUP_ERROR_CODES.GROUP_SUSPENDED]: "The group violates platform policies.",
  [GROUP_ERROR_CODES.GROUP_RATE_LIMIT_HIT]: "Group operation failed because there were too many group operations from this phone number in a short period.",
  [GROUP_ERROR_CODES.INVALID_IMAGE_ASPECT_RATIO]: "Width and height of the image must be equal.",
  [GROUP_ERROR_CODES.IMAGE_TOO_SMALL]: "Image width and height must be greater than 192px.",
  [GROUP_ERROR_CODES.GROUP_CREATE_LIMIT_REACHED]: "Reached the limit for the maximum number of groups that can be created for this number.",
  [GROUP_ERROR_CODES.PARTICIPANT_NOT_IN_GROUP]: "Participant is not a part of the group.",
  [GROUP_ERROR_CODES.JOIN_REQUEST_NOT_FOUND]: "Group join request does not exist.",
  [GROUP_ERROR_CODES.GROUP_CREATION_DISABLED]: "Group creation is temporarily disabled due to excessive marketing messages sent by the WABA in customer service window over the past 7 days.",
  [GROUP_ERROR_CODES.INELIGIBLE_FOR_GROUPS]: "This phone number is not eligible to access Groups APIs",
  INVALID_PHONE_NUMBER_ID: "Invalid phone_number_id",
  INVALID_GROUP_ID: "Invalid group_id",
  MISSING_REQUIRED_FIELDS: "Missing required fields",
  GROUP_NOT_FOUND: "Group not found",
  PARTICIPANT_NOT_FOUND: "Participant not found",
  JOIN_REQUEST_NOT_FOUND_LEGACY: "Join request not found",
  MAX_PARTICIPANTS_EXCEEDED: "Maximum 8 participants allowed",
  USER_ALREADY_IN_GROUP: "User already in group",
  GROUP_DOES_NOT_REQUIRE_APPROVAL: "Group does not require approval",
  INTERNAL_SERVER_ERROR: "Internal server error",
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  PARTIAL_CONTENT: 206,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
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
  GROUP_ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS,
};

