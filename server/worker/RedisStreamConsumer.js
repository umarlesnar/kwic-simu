const Redis = require("ioredis");
const config = require("./../config");
const MessageProcessor = require("./MessageProcessor");
const { handleError } = require("./errorHandler");
const { withRetry, RetryConfig } = require("./retry");

class RedisStreamConsumer {
  constructor() {
    this.redis = new Redis(config.REDIS_URL);
    this.isShuttingDown = false;
    this.pendingOperations = new Set();

    // Setup shutdown handlers
    this.setupShutdownHandlers();
  }

  setupShutdownHandlers() {
    const shutdown = async () => {
      console.log("Shutdown initiated...");
      this.isShuttingDown = true;

      // Wait for pending operations to complete (with timeout)
      const timeout = setTimeout(() => {
        console.log("Forced shutdown due to timeout");
        process.exit(1);
      }, 30000);

      try {
        if (this.pendingOperations.size > 0) {
          console.log(
            `Waiting for ${this.pendingOperations.size} operations to complete...`
          );
          await Promise.all(Array.from(this.pendingOperations));
        }

        await this.redis.quit();
        await MessageProcessor.closeRedisConnection();
        clearTimeout(timeout);
        console.log("Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }

  async setup() {
    return withRetry(async () => {
      try {
        await this.redis.xgroup(
          "CREATE",
          config.STREAM_NAME,
          config.GROUP_NAME,
          "0",
          "MKSTREAM"
        );
        console.log(`Consumer group '${config.GROUP_NAME}' created.`);
      } catch (err) {
        if (!err.message.includes("BUSYGROUP")) {
          throw err;
        }
      }
    }, new RetryConfig(5, 2000, 20000));
  }

  async processEntry([id, fields]) {
    const operationPromise = (async () => {
      try {
        const data = JSON.parse(fields[1]);
        console.log(`Processing message:`, id, data.type);

        await withRetry(async () => {
          if (data.type === "WEBHOOK") {
            await MessageProcessor.processWebHookMessage(data);
          } else if (data.type === "LIVE_WEBHOOK") {
            await MessageProcessor.processLiveWebHookMessage(data);
          } else {
            await MessageProcessor.processRegularMessage({ id, data });
          }
        }, new RetryConfig(3, 1000, 5000));

        await this.redis.xack(config.STREAM_NAME, config.GROUP_NAME, id);
        await this.redis.xdel(config.STREAM_NAME, id);
      } catch (error) {
        handleError(error, "processEntry");
        // Move to dead letter queue if all retries failed
        await this.moveToDeadLetterQueue(id, fields);
      } finally {
        //timer();
      }
    })();

    this.pendingOperations.add(operationPromise);
    try {
      await operationPromise;
    } finally {
      this.pendingOperations.delete(operationPromise);
    }
  }

  async moveToDeadLetterQueue(id, fields) {
    try {
      const deadLetterStream = `${config.STREAM_NAME}:dlq`;
      await this.redis.xadd(
        deadLetterStream,
        "*",
        "original_id",
        id,
        "data",
        fields[1]
      );
      await this.redis.xack(config.STREAM_NAME, config.GROUP_NAME, id);
      await this.redis.xdel(config.STREAM_NAME, id);
      console.log(`Message ${id} moved to DLQ`);
    } catch (error) {
      console.error(`Failed to move message ${id} to DLQ:`, error);
    }
  }

  async start() {
    while (!this.isShuttingDown) {
      try {
        const messages = await this.redis.xreadgroup(
          "GROUP",
          config.GROUP_NAME,
          config.CONSUMER_NAME,
          "COUNT",
          config.BATCH_SIZE,
          "BLOCK",
          config.BLOCK_TIMEOUT,
          "STREAMS",
          config.STREAM_NAME,
          ">"
        );

        if (messages) {
          for (const [stream, entries] of messages) {
            await Promise.all(entries.map((entry) => this.processEntry(entry)));
          }
        }
      } catch (error) {
        if (!this.isShuttingDown) {
          handleError(error, "start");
          // Wait before retrying to prevent tight error loops
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  }
}

module.exports = RedisStreamConsumer;
