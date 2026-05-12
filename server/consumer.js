const RedisStreamConsumer = require("./worker/RedisStreamConsumer");

async function main() {
  const consumer = new RedisStreamConsumer();
  await consumer.setup();
  await consumer.start();
}

main().catch((error) => {
  console.error("Application failed to start:", error);
  process.exit(1);
});
