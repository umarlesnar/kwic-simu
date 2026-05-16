/**
 * Group Service
 * Business logic for group operations
 */

const {
  MAX_PARTICIPANTS,
  REDIS_KEY_PATTERNS,
  INVITE_LINK_TTL,
  GROUP_CREATE_DELAY_AUTO_MS,
  GROUP_CREATE_DELAY_APPROVAL_MS,
  JOIN_APPROVAL_MODES,
} = require("./constants");

const {
  createGroup,
  createJoinRequest,
  createInviteLink,
  generateInviteLinkUrl,
  calculateInviteLinkExpiration,
  generateGraphRequestId,
  generateJoinRequestId,
} = require("./models");

const PENDING_GROUP_TTL_SEC = 3600;

function encodeGroupsListCursor(startIndex) {
  return Buffer.from(JSON.stringify({ s: startIndex }), "utf8").toString("base64url");
}

function decodeGroupsListCursor(cursor) {
  if (!cursor || typeof cursor !== "string") return null;
  try {
    const j = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof j.s === "number" && j.s >= 0 ? j.s : null;
  } catch {
    return null;
  }
}

/**
 * Stores a pending group creation (async Meta flow) until processing completes.
 */
async function savePendingGroupCreation(redisManagerWrapper, payload) {
  const redisManager = await redisManagerWrapper.getClient();
  const requestId = payload.request_id || generateGraphRequestId();
  const key = REDIS_KEY_PATTERNS.PENDING_GROUP_REQUEST(requestId);
  const body = {
    ...payload,
    request_id: requestId,
    created_at: new Date().toISOString(),
  };
  await redisManager.setex(key, PENDING_GROUP_TTL_SEC, JSON.stringify(body));
  return body;
}

async function loadPendingGroupCreation(redisManagerWrapper, requestId) {
  const redisManager = await redisManagerWrapper.getClient();
  const raw = await redisManager.get(REDIS_KEY_PATTERNS.PENDING_GROUP_REQUEST(requestId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function removePendingGroupCreation(redisManagerWrapper, requestId) {
  const redisManager = await redisManagerWrapper.getClient();
  await redisManager.del(REDIS_KEY_PATTERNS.PENDING_GROUP_REQUEST(requestId));
}

async function listPendingGroupCreations(redisManagerWrapper, phoneNumberId) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const pattern = REDIS_KEY_PATTERNS.PENDING_GROUP_REQUEST("*");
    const keys = await redisManager.keys(pattern);
    const pendingList = [];

    for (const key of keys) {
      const raw = await redisManager.get(key);
      if (raw) {
        const pending = JSON.parse(raw);
        if (pending.phone_number_id === phoneNumberId) {
          pendingList.push(pending);
        }
      }
    }

    pendingList.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return pendingList;
  } catch (error) {
    console.error("Error listing pending group creations:", error);
    throw error;
  }
}

function getSimulatedGroupCreateDelayMs(joinApprovalMode) {
  return joinApprovalMode === "approval_required"
    ? GROUP_CREATE_DELAY_APPROVAL_MS
    : GROUP_CREATE_DELAY_AUTO_MS;
}

/**
 * Creates a new group in Redis
 * @param {object} redisManager - Redis manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {object} groupData - Group data
 * @returns {object} Created group
 */
async function createGroupInRedis(redisManagerWrapper, phoneNumberId, groupData) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const participants = groupData.participants || [];
    if (!participants.includes(phoneNumberId)) {
      participants.unshift(phoneNumberId);
    }

    const group = createGroup({
      phone_number_id: phoneNumberId,
      ...groupData,
      participants,
    });

    // Generate invite link
    const inviteInfo = generateInviteLinkUrl(phoneNumberId, group.id);
    const expirationTimestamp = calculateInviteLinkExpiration();
    group.invite_link = inviteInfo.link;
    group.invite_link_expiration = expirationTimestamp;

    // Store group in Redis
    const groupKey = REDIS_KEY_PATTERNS.GROUP(phoneNumberId, group.id);
    await redisManager.set(groupKey, JSON.stringify(group));

    // Add to group index
    const indexKey = REDIS_KEY_PATTERNS.GROUP_INDEX(phoneNumberId);
    await redisManager.sadd(indexKey, group.id);

    // Add to global group map
    const globalMapKey = REDIS_KEY_PATTERNS.GLOBAL_GROUP_MAP(group.id);
    await redisManager.set(globalMapKey, phoneNumberId);

    // Store invite link with TTL
    const inviteLinkKey = REDIS_KEY_PATTERNS.GROUP_INVITE_LINK(
      phoneNumberId,
      group.id
    );
    const inviteLink = createInviteLink(group.id, inviteInfo.link, expirationTimestamp);
    await redisManager.setex(
      inviteLinkKey,
      INVITE_LINK_TTL,
      JSON.stringify(inviteLink)
    );

    // Store token to group mapping
    const tokenKey = REDIS_KEY_PATTERNS.GLOBAL_INVITE_LINK_MAP(inviteInfo.token);
    await redisManager.setex(
      tokenKey,
      INVITE_LINK_TTL,
      JSON.stringify({ group_id: group.id, phone_number_id: phoneNumberId })
    );

    return group;
  } catch (error) {
    console.error("Error creating group in Redis:", error);
    throw error;
  }
}

/**
 * Retrieves a group from Redis
 * @param {object} redisManager - Redis manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @returns {object|null} Group data or null if not found
 */
async function getGroupFromRedis(redisManagerWrapper, phoneNumberId, groupId) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const groupKey = REDIS_KEY_PATTERNS.GROUP(phoneNumberId, groupId);
    const groupData = await redisManager.get(groupKey);

    if (!groupData) {
      return null;
    }

    return JSON.parse(groupData);
  } catch (error) {
    console.error("Error retrieving group from Redis:", error);
    throw error;
  }
}

/**
 * Updates a group in Redis
 * @param {object} redisManager - Redis manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {object} group - Updated group object
 * @returns {object} Updated group
 */
async function updateGroupInRedis(redisManagerWrapper, phoneNumberId, group) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    group.updated_at = new Date().toISOString();
    const groupKey = REDIS_KEY_PATTERNS.GROUP(phoneNumberId, group.id);
    await redisManager.set(groupKey, JSON.stringify(group));
    return group;
  } catch (error) {
    console.error("Error updating group in Redis:", error);
    throw error;
  }
}

/**
 * Deletes a group from Redis
 * @param {object} redisManager - Redis manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @returns {boolean} True if deleted, false if not found
 */
async function deleteGroupFromRedis(redisManagerWrapper, phoneNumberId, groupId) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const groupKey = REDIS_KEY_PATTERNS.GROUP(phoneNumberId, groupId);
    const joinRequestsKey = REDIS_KEY_PATTERNS.GROUP_JOIN_REQUESTS(
      phoneNumberId,
      groupId
    );
    const inviteLinkKey = REDIS_KEY_PATTERNS.GROUP_INVITE_LINK(
      phoneNumberId,
      groupId
    );
    const indexKey = REDIS_KEY_PATTERNS.GROUP_INDEX(phoneNumberId);

    // Delete group data
    await redisManager.del(groupKey);

    // Delete associated data
    await redisManager.del(joinRequestsKey);
    await redisManager.del(inviteLinkKey);

    // Remove from index
    await redisManager.srem(indexKey, groupId);

    // Remove from global group map
    const globalMapKey = REDIS_KEY_PATTERNS.GLOBAL_GROUP_MAP(groupId);
    await redisManager.del(globalMapKey);

    return true;
  } catch (error) {
    console.error("Error deleting group from Redis:", error);
    throw error;
  }
}

/**
 * Lists all groups for a phone number (Meta-style cursor paging)
 * @param {object} redisManagerWrapper
 * @param {string} phoneNumberId
 * @param {object} opts - { limit, after, before, basePagingUrl } basePagingUrl optional for next/previous URLs
 * @returns {object} { data: { groups }, paging }
 */
async function listGroupsFromRedis(
  redisManagerWrapper,
  phoneNumberId,
  opts = {}
) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const indexKey = REDIS_KEY_PATTERNS.GROUP_INDEX(phoneNumberId);

    let limit = parseInt(String(opts.limit || "25"), 10);
    if (Number.isNaN(limit) || limit < 1) limit = 25;
    if (limit > 1024) limit = 1024;

    const allGroupIds = await redisManager.smembers(indexKey);
    const groups = [];
    for (const groupId of allGroupIds) {
      const group = await getGroupFromRedis(redisManagerWrapper, phoneNumberId, groupId);
      if (group) groups.push(group);
    }

    groups.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const totalCount = groups.length;

    let start = 0;
    if (opts.after) {
      const decoded = decodeGroupsListCursor(opts.after);
      if (decoded != null) start = decoded;
    } else if (opts.before) {
      const decoded = decodeGroupsListCursor(opts.before);
      if (decoded != null) start = decoded;
    }

    if (start >= totalCount) start = Math.max(0, totalCount - limit);
    const slice = groups.slice(start, start + limit);

    const hasNext = start + limit < totalCount;
    const hasPrev = start > 0;

    const prevStart = Math.max(0, start - limit);
    const nextStart = start + limit;

    const baseUrl =
      opts.basePagingUrl ||
      `https://graph.facebook.com/v14.0/${phoneNumberId}/groups`;

    const paging = {
      cursors: {
        before: hasPrev ? encodeGroupsListCursor(prevStart) : undefined,
        after: hasNext ? encodeGroupsListCursor(nextStart) : undefined,
      },
    };

    if (hasNext) {
      paging.next = `${baseUrl}?limit=${limit}&after=${encodeURIComponent(
        encodeGroupsListCursor(nextStart)
      )}`;
    }
    if (hasPrev) {
      paging.previous = `${baseUrl}?limit=${limit}&before=${encodeURIComponent(
        encodeGroupsListCursor(prevStart)
      )}`;
    }

    return {
      data: { groups: slice },
      paging,
      _meta: { start, totalCount, limit },
    };
  } catch (error) {
    console.error("Error listing groups from Redis:", error);
    throw error;
  }
}

/**
 * Adds participants to a group
 * @param {object} redisManager - Redis manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {object} group - Group object
 * @param {array} phoneNumbers - Phone numbers to add
 * @returns {object} Object with added participants and updated group
 */
async function addParticipantsToGroup(
  redisManagerWrapper,
  phoneNumberId,
  group,
  phoneNumbers
) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const addedParticipants = [];
    const existingWaIds = group.participants.map((p) =>
      typeof p === "string" ? p : p.wa_id
    );

    for (const phoneNumber of phoneNumbers) {
      // Skip if already in group
      if (!existingWaIds.includes(phoneNumber)) {
        group.participants.push(phoneNumber);
        addedParticipants.push(phoneNumber);
      }
    }

    // Update participant count
    group.participant_count = group.participants.length;

    // Update group in Redis
    await updateGroupInRedis(redisManagerWrapper, phoneNumberId, group);

    return {
      added_participants: addedParticipants,
      group,
    };
  } catch (error) {
    console.error("Error adding participants to group:", error);
    throw error;
  }
}

/**
 * Removes a participant from a group
 * @param {object} redisManager - Redis manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {object} group - Group object
 * @param {string} waId - WhatsApp ID to remove
 * @returns {object} Updated group
 */
async function removeParticipantFromGroup(
  redisManagerWrapper,
  phoneNumberId,
  group,
  waId
) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const initialLength = group.participants.length;

    // Remove participant
    group.participants = group.participants.filter(
      (p) => (typeof p === "string" ? p : p.wa_id) !== waId
    );

    // Check if participant was found
    if (group.participants.length === initialLength) {
      return null; // Participant not found
    }

    // Update participant count
    group.participant_count = group.participants.length;

    // Update group in Redis
    await updateGroupInRedis(redisManagerWrapper, phoneNumberId, group);

    return group;
  } catch (error) {
    console.error("Error removing participant from group:", error);
    throw error;
  }
}

/**
 * Adds a join request to a group
 * @param {object} redisManager - Redis manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @param {string} waId - WhatsApp ID requesting to join
 * @returns {object} Created join request
 */
async function addJoinRequest(redisManagerWrapper, phoneNumberId, groupId, waId) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const joinRequest = createJoinRequest(waId);
    const joinRequestsKey = REDIS_KEY_PATTERNS.GROUP_JOIN_REQUESTS(
      phoneNumberId,
      groupId
    );

    // Get existing join requests
    const existingData = await redisManager.get(joinRequestsKey);
    const joinRequests = existingData ? JSON.parse(existingData) : [];

    // Add new join request
    joinRequests.push(joinRequest);

    // Store in Redis
    await redisManager.set(joinRequestsKey, JSON.stringify(joinRequests));

    return joinRequest;
  } catch (error) {
    console.error("Error adding join request:", error);
    throw error;
  }
}

/**
 * Gets join requests for a group
 * @param {object} redisManager - Redis manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @returns {array} Array of join requests
 */
async function getJoinRequests(redisManagerWrapper, phoneNumberId, groupId) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const joinRequestsKey = REDIS_KEY_PATTERNS.GROUP_JOIN_REQUESTS(
      phoneNumberId,
      groupId
    );
    const data = await redisManager.get(joinRequestsKey);

    if (!data) {
      return [];
    }

    let list = JSON.parse(data);
    let dirty = false;
    list = list.map((jr) => {
      const next = { ...jr };
      if (!next.join_request_id) {
        next.join_request_id = generateJoinRequestId(next.wa_id);
        dirty = true;
      }
      if (next.creation_timestamp == null && next.requested_at) {
        next.creation_timestamp = Math.floor(
          new Date(next.requested_at).getTime() / 1000
        );
        dirty = true;
      }
      return next;
    });
    if (dirty) {
      await redisManager.set(joinRequestsKey, JSON.stringify(list));
    }
    return list;
  } catch (error) {
    console.error("Error getting join requests:", error);
    throw error;
  }
}

/**
 * Removes a join request from a group
 * @param {object} redisManager - Redis manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @param {string} waId - WhatsApp ID of join request to remove
 * @returns {boolean} True if removed, false if not found
 */
async function removeJoinRequest(
  redisManagerWrapper,
  phoneNumberId,
  groupId,
  joinRequestIdOrWaId
) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const joinRequestsKey = REDIS_KEY_PATTERNS.GROUP_JOIN_REQUESTS(
      phoneNumberId,
      groupId
    );
    const data = await redisManager.get(joinRequestsKey);

    if (!data) {
      return false;
    }

    let joinRequests = JSON.parse(data);
    const initialLength = joinRequests.length;

    // Remove join request (by join_request_id or wa_id)
    joinRequests = joinRequests.filter(
      (jr) =>
        jr.wa_id !== joinRequestIdOrWaId &&
        jr.join_request_id !== joinRequestIdOrWaId
    );

    // Check if join request was found
    if (joinRequests.length === initialLength) {
      return false;
    }

    // Update in Redis
    if (joinRequests.length > 0) {
      await redisManager.set(
        joinRequestsKey,
        JSON.stringify(joinRequests)
      );
    } else {
      await redisManager.del(joinRequestsKey);
    }

    return true;
  } catch (error) {
    console.error("Error removing join request:", error);
    throw error;
  }
}

/**
 * Gets invite link for a group
 * @param {object} redisManager - Redis manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @returns {object|null} Invite link data or null if not found
 */
async function getInviteLink(redisManagerWrapper, phoneNumberId, groupId) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const inviteLinkKey = REDIS_KEY_PATTERNS.GROUP_INVITE_LINK(
      phoneNumberId,
      groupId
    );
    const data = await redisManager.get(inviteLinkKey);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error("Error getting invite link:", error);
    throw error;
  }
}

/**
 * Resets invite link for a group
 * @param {object} redisManager - Redis manager instance
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} groupId - Group ID
 * @returns {object} New invite link
 */
async function resetInviteLink(redisManagerWrapper, phoneNumberId, groupId) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const inviteInfo = generateInviteLinkUrl(phoneNumberId, groupId);
    const expirationTimestamp = calculateInviteLinkExpiration();
    const inviteLink = createInviteLink(groupId, inviteInfo.link, expirationTimestamp);

    const inviteLinkKey = REDIS_KEY_PATTERNS.GROUP_INVITE_LINK(
      phoneNumberId,
      groupId
    );

    // Store new invite link with TTL
    await redisManager.setex(
      inviteLinkKey,
      INVITE_LINK_TTL,
      JSON.stringify(inviteLink)
    );

    // Store token to group mapping
    const tokenKey = REDIS_KEY_PATTERNS.GLOBAL_INVITE_LINK_MAP(inviteInfo.token);
    await redisManager.setex(
      tokenKey,
      INVITE_LINK_TTL,
      JSON.stringify({ group_id: groupId, phone_number_id: phoneNumberId })
    );

    return inviteLink;
  } catch (error) {
    console.error("Error resetting invite link:", error);
    throw error;
  }
}

/**
 * Finds all groups a specific participant is a member of
 * @param {object} redisManagerWrapper - Redis manager wrapper instance
 * @param {string} phoneNumberId - Phone number ID of the business
 * @param {string} waId - WhatsApp ID of the participant to search for
 * @returns {array} Array of groups the participant is in
 */
async function findGroupsByParticipant(redisManagerWrapper, phoneNumberId, waId) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const indexKey = REDIS_KEY_PATTERNS.GROUP_INDEX(phoneNumberId);
    
    // Get all group IDs for this business
    const allGroupIds = await redisManager.smembers(indexKey);
    const groups = [];
    
    for (const groupId of allGroupIds) {
      const groupKey = REDIS_KEY_PATTERNS.GROUP(phoneNumberId, groupId);
      const groupData = await redisManager.get(groupKey);
      
      if (groupData) {
        const group = JSON.parse(groupData);
        // Check if participant is in group
        const isParticipant = group.participants.some(p => 
          (typeof p === 'string' ? p : p.wa_id) === waId
        );
        
        if (isParticipant) {
          groups.push(group);
        }
      }
    }
    return groups;
  } catch (error) {
    console.error("Error finding groups by participant:", error);
    throw error;
  }
}

/**
 * Finds the phone number ID for a given group ID
 * @param {object} redisManagerWrapper - Redis manager wrapper instance
 * @param {string} groupId - Group ID
 * @returns {string|null} Phone number ID or null if not found
 */
async function getPhoneNumberIdByGroupId(redisManagerWrapper, groupId) {
  try {
    const redisManager = await redisManagerWrapper.getClient();
    const globalMapKey = REDIS_KEY_PATTERNS.GLOBAL_GROUP_MAP(groupId);
    return await redisManager.get(globalMapKey);
  } catch (error) {
    console.error("Error finding phone number for group:", error);
    return null;
  }
}

module.exports = {
  createGroupInRedis,
  getGroupFromRedis,
  updateGroupInRedis,
  deleteGroupFromRedis,
  listGroupsFromRedis,
  encodeGroupsListCursor,
  decodeGroupsListCursor,
  savePendingGroupCreation,
  loadPendingGroupCreation,
  removePendingGroupCreation,
  listPendingGroupCreations,
  getSimulatedGroupCreateDelayMs,
  addParticipantsToGroup,
  removeParticipantFromGroup,
  addJoinRequest,
  getJoinRequests,
  removeJoinRequest,
  getInviteLink,
  resetInviteLink,
  findGroupsByParticipant,
  getPhoneNumberIdByGroupId,
  joinGroupByInviteLink: async (redisManagerWrapper, inviteLinkUrl, waId) => {
    try {
      const redisManager = await redisManagerWrapper.getClient();
      
      // Extract token from URL (strip query/hash)
      const urlParts = inviteLinkUrl.split("/");
      const token = urlParts[urlParts.length - 1].split("?")[0].split("#")[0];
      
      const tokenKey = REDIS_KEY_PATTERNS.GLOBAL_INVITE_LINK_MAP(token);
      const mappingData = await redisManager.get(tokenKey);
      
      if (!mappingData) {
        return { success: false, error: "Invalid or expired invite link" };
      }
      
      const { group_id, phone_number_id } = JSON.parse(mappingData);
      const groupKey = REDIS_KEY_PATTERNS.GROUP(phone_number_id, group_id);
      const groupData = await redisManager.get(groupKey);
      
      if (!groupData) {
        return { success: false, error: "Group not found" };
      }
      
      const group = JSON.parse(groupData);
      
      // Check if user already in group
      const existingWaIds = group.participants.map(p => typeof p === 'string' ? p : p.wa_id);
      if (existingWaIds.includes(waId)) {
        return { success: false, error: "User already in group", group_id };
      }
      
      const mode = group.join_approval_mode || JOIN_APPROVAL_MODES.AUTO_APPROVE;

      if (mode === JOIN_APPROVAL_MODES.AUTO_APPROVE) {
        const addResult = await addParticipantsToGroup(
          redisManagerWrapper,
          phone_number_id,
          group,
          [waId]
        );
        if (addResult.added_participants.length === 0) {
          return {
            success: false,
            error: "User already in group",
            group_id,
          };
        }
        return {
          success: true,
          status: "joined",
          group_id,
          group: addResult.group,
          phone_number_id,
          wa_id: waId,
        };
      } else {
        // Add to join requests
        const joinRequestsKey = REDIS_KEY_PATTERNS.GROUP_JOIN_REQUESTS(phone_number_id, group_id);
        const existingRequestsData = await redisManager.get(joinRequestsKey);
        const joinRequests = existingRequestsData ? JSON.parse(existingRequestsData) : [];
        
        const existingJr = joinRequests.find((jr) => jr.wa_id === waId);
        if (!existingJr) {
          const jr = createJoinRequest(waId);
          joinRequests.push(jr);
          await redisManager.set(joinRequestsKey, JSON.stringify(joinRequests));
          return {
            success: true,
            status: "request_pending",
            group_id,
            phone_number_id,
            join_request_id: jr.join_request_id,
          };
        }
        return {
          success: true,
          status: "request_pending",
          group_id,
          phone_number_id,
          join_request_id: existingJr.join_request_id,
        };
      }
    } catch (error) {
      console.error("Error joining group by invite link:", error);
      throw error;
    }
  }
};
