/**
 * Data Models
 * Defines the structure and factory methods for group-related entities
 */

const { GROUP_ID_SUFFIX } = require("./constants");

/**
 * Creates a new Group entity
 * @param {object} data - Group data
 * @returns {object} Group entity
 */
function createGroup(data) {
  const now = new Date().toISOString();

  return {
    id: data.id || `${generateGroupIdBase()}${GROUP_ID_SUFFIX}`,
    phone_number_id: data.phone_number_id,
    subject: data.subject,
    description: data.description || "",
    join_approval_mode: data.join_approval_mode || "auto_approve",
    participants: data.participants || [],
    participant_count: (data.participants || []).length,
    invite_link: data.invite_link || "",
    invite_link_expiration: data.invite_link_expiration || 0,
    join_requests: data.join_requests || [],
    created_at: data.created_at || now,
    updated_at: data.updated_at || now,
  };
}

/**
 * Creates a new Participant entity
 * @param {string} waId - WhatsApp ID (phone number)
 * @returns {object} Participant entity
 */
function createParticipant(waId) {
  return {
    wa_id: waId,
    added_at: new Date().toISOString(),
    role: "member",
  };
}

/**
 * Creates a new Join Request entity
 * @param {string} waId - WhatsApp ID of requesting user
 * @returns {object} Join request entity
 */
function createJoinRequest(waId) {
  return {
    wa_id: waId,
    requested_at: new Date().toISOString(),
    status: "pending",
  };
}

/**
 * Creates a new Invite Link entity
 * @param {string} groupId - Group ID
 * @param {string} link - Invite link URL
 * @param {number} expirationTimestamp - Unix timestamp for expiration
 * @returns {object} Invite link entity
 */
function createInviteLink(groupId, link, expirationTimestamp) {
  return {
    link,
    group_id: groupId,
    created_at: new Date().toISOString(),
    expiration_timestamp: expirationTimestamp,
    is_active: true,
  };
}

/**
 * Generates a base group ID (without @g.us suffix)
 * Uses timestamp and random number for uniqueness
 * @returns {string} Base group ID
 */
function generateGroupIdBase() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${timestamp}${random}`;
}

/**
 * Generates an invite link URL
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @returns {string} Invite link URL
 */
function generateInviteLinkUrl(phoneNumberId, groupId) {
  const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
  const linkToken = generateInviteLinkToken();
  return `${baseUrl}/groups/${phoneNumberId}/${groupId}/join/${linkToken}`;
}

/**
 * Generates an invite link token
 * @returns {string} Invite link token
 */
function generateInviteLinkToken() {
  return Math.random().toString(36).substr(2, 16);
}

/**
 * Calculates invite link expiration timestamp (24 hours from now)
 * @returns {number} Unix timestamp in seconds
 */
function calculateInviteLinkExpiration() {
  const now = Math.floor(Date.now() / 1000);
  const ttl = 86400; // 24 hours in seconds
  return now + ttl;
}

/**
 * Formats a group for API response
 * @param {object} group - Group entity
 * @returns {object} Formatted group for response
 */
function formatGroupResponse(group) {
  return {
    messaging_product: "whatsapp",
    id: group.id,
    subject: group.subject,
    description: group.description,
    join_approval_mode: group.join_approval_mode,
    participants: group.participants.map(p => ({
      wa_id: typeof p === 'string' ? p : p.wa_id
    })),
    total_participant_count: group.participant_count - 1, // Excluding the business according to docs
    creation_timestamp: Math.floor(new Date(group.created_at).getTime() / 1000),
    suspended: group.suspended || false,
  };
}

/**
 * Formats a group for list response (minimal fields)
 * @param {object} group - Group entity
 * @returns {object} Formatted group for list response
 */
function formatGroupListResponse(group) {
  return {
    id: group.id,
    subject: group.subject,
    description: group.description,
    join_approval_mode: group.join_approval_mode,
    total_participant_count: (group.participant_count || 1) - 1,
    created_at: Math.floor(new Date(group.created_at).getTime() / 1000).toString(),
  };
}

/**
 * Formats a join request for API response
 * @param {object} joinRequest - Join request entity
 * @returns {object} Formatted join request for response
 */
function formatJoinRequestResponse(joinRequest) {
  return {
    wa_id: joinRequest.wa_id,
    requested_at: joinRequest.requested_at,
  };
}

module.exports = {
  createGroup,
  createParticipant,
  createJoinRequest,
  createInviteLink,
  generateGroupIdBase,
  generateInviteLinkUrl,
  generateInviteLinkToken,
  calculateInviteLinkExpiration,
  formatGroupResponse,
  formatGroupListResponse,
  formatJoinRequestResponse,
};
