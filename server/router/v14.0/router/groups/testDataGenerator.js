/**
 * Test Data Generator
 * Provides functions to generate sample groups and participants for testing
 */

const { createGroupInRedis } = require("./groupService");
const {
  emitGroupLifecycleWebhook,
  emitBatchParticipantsWebhooks,
  generateGraphRequestId,
} = require("./groupWebhooks");
const { MAX_PARTICIPANTS } = require("./constants");

const SAMPLE_SUBJECTS = [
  "Project Alpha",
  "Family Reunion",
  "Design Team",
  "Marketing Strategy",
  "Weekend Trip",
  "Reading Club",
  "Dev Ops",
  "Customer Support",
  "Basketball Team",
  "Class of 2024",
];

const SAMPLE_DESCRIPTIONS = [
  "Discussion about project alpha deliverables and deadlines.",
  "Planning the next big family gathering.",
  "A place for designers to share inspiration and feedback.",
  "Sync on marketing campaigns and analytics.",
  "Organizing the logistics for our upcoming weekend getaway.",
  "Sharing thoughts on the latest book of the month.",
  "Technical discussions and deployment logs.",
  "Handling customer inquiries and escalations.",
  "Coordinating practice sessions and match schedules.",
  "Staying in touch with former classmates.",
];

const SAMPLE_PHONE_NUMBERS = [
  "919876543210",
  "919876543211",
  "919876543212",
  "919876543213",
  "919876543214",
  "919876543215",
  "919876543216",
  "919876543217",
  "919876543218",
  "919876543219",
];

/**
 * Generates test groups for a phone number
 * @param {object} redisManager - Redis manager
 * @param {object} redisStreamManager - Redis stream manager
 * @param {string} phoneNumberId - Phone number ID
 * @param {string} wbaId - WBA ID
 * @param {number} count - Number of groups to generate
 * @returns {array} Created groups
 */
async function generateTestGroups(redisManager, redisStreamManager, phoneNumberId, wbaId, count = 5) {
  const createdGroups = [];

  for (let i = 0; i < count; i++) {
    const subject = SAMPLE_SUBJECTS[Math.floor(Math.random() * SAMPLE_SUBJECTS.length)];
    const description = SAMPLE_DESCRIPTIONS[Math.floor(Math.random() * SAMPLE_DESCRIPTIONS.length)];
    const join_approval_mode = Math.random() > 0.5 ? "approval_required" : "auto_approve";
    
    // Create group
    const requestId = generateGraphRequestId();
    const group = await createGroupInRedis(redisManager, phoneNumberId, {
      subject: `${subject} ${i + 1}`,
      description,
      join_approval_mode,
      request_id: requestId,
    });

    // Add some random participants
    const participantCount = Math.floor(Math.random() * MAX_PARTICIPANTS) + 1;
    const shuffledPhones = [...SAMPLE_PHONE_NUMBERS].sort(() => 0.5 - Math.random());
    const participantsToAdd = shuffledPhones.slice(0, participantCount);
    
    group.participants = participantsToAdd;
    group.participant_count = group.participants.length;
    
    // Update in Redis
    const groupKey = `group:${phoneNumberId}:${group.id}`;
    const redis = await redisManager.getClient();
    await redis.set(groupKey, JSON.stringify(group));

    // Emit webhooks
    await emitGroupLifecycleWebhook(
      redisStreamManager,
      phoneNumberId,
      group.id,
      "group_create",
      group,
      wbaId,
      { requestId }
    );
    await emitBatchParticipantsWebhooks(redisStreamManager, phoneNumberId, group.id, "group_participants_add", participantsToAdd, wbaId);

    createdGroups.push(group);
  }

  return createdGroups;
}

/**
 * Exports all group data for a phone number
 * @param {object} redisManager - Redis manager
 * @param {string} phoneNumberId - Phone number ID
 * @returns {object} Exported data
 */
async function exportGroupData(redisManager, phoneNumberId) {
  const redis = await redisManager.getClient();
  const indexKey = `group_index:${phoneNumberId}`;
  const groupIds = await redis.smembers(indexKey);
  
  const groups = [];
  for (const groupId of groupIds) {
    const groupData = await redis.get(`group:${phoneNumberId}:${groupId}`);
    if (groupData) {
      groups.push(JSON.parse(groupData));
    }
  }

  return {
    phone_number_id: phoneNumberId,
    exported_at: new Date().toISOString(),
    total_groups: groups.length,
    groups,
  };
}

module.exports = {
  generateTestGroups,
  exportGroupData,
};
