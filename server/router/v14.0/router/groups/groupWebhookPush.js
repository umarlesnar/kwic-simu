/**
 * Delivers group webhooks via the same Redis stream path as POST /webhook/push.
 * Skips when the simulator UI will push (X-Simulator-Webhook-Source: client).
 */

const SIMULATOR_WEBHOOK_SOURCE_HEADER = "x-simulator-webhook-source";
const CLIENT_WEBHOOK_SOURCE = "client";

function isClientWebhookSource(req) {
  const raw =
    req?.headers?.[SIMULATOR_WEBHOOK_SOURCE_HEADER] ??
    req?.headers?.["X-Simulator-Webhook-Source"] ??
    req?.headers?.["x-simulator-webhook-source"];
  return String(raw || "").toLowerCase() === CLIENT_WEBHOOK_SOURCE;
}

/**
 * @param {object} req
 * @param {object} redisStreamManager
 * @param {object} payload Meta webhook payload
 */
async function pushGroupWebhookUnlessClient(req, redisStreamManager, payload) {
  if (!redisStreamManager || isClientWebhookSource(req)) {
    return null;
  }
  return redisStreamManager.sendWebhookMessage(payload);
}

module.exports = {
  SIMULATOR_WEBHOOK_SOURCE_HEADER,
  CLIENT_WEBHOOK_SOURCE,
  isClientWebhookSource,
  pushGroupWebhookUnlessClient,
};
