module.exports = {
  REDIS_URL: process.env.REDIS_URL || "redis://default:mskjplwsi9823qposdkm@103.25.47.251:6389",
  WEBHOOK_URL:
    process.env.WEBHOOK_URL || "https://prev-kwic-dev.nekhop.com/webhook",
  STREAM_NAME: "my_stream",
  GROUP_NAME: "my_group",
  CONSUMER_NAME: `worker_${Math.random().toString(36).substring(7)}`,
  BATCH_SIZE: 5,
  BLOCK_TIMEOUT: 5000,
};
