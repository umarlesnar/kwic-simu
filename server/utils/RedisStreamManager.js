// RedisStreamManager.js
class RedisStreamManager {
  constructor(redis, streamName, maxLength) {
    this.redis = redis;
    this.streamName = streamName;
    this.maxLength = maxLength;
  }
  // Send message to Redis Stream
  async sendMessage(data) {
    try {
      const messageId = await this.redis.xadd(
        this.streamName,
        "*",
        "data",
        JSON.stringify(data)
      );

      // Trim the stream to avoid excessive growth
      await this.trimStream();

      return { success: true, messageId };
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error("Error sending message to Redis stream");
    }
  }

  async sendWebhookMessage(data) {
    try {
      const messageId = await this.redis.xadd(
        this.streamName,
        "*",
        "data",
        JSON.stringify(data)
      );

      // Trim the stream to avoid excessive growth
      await this.trimStream();

      return { success: true, messageId };
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error("Error sending message to Redis stream");
    }
  }

  // Trim the stream to keep only the last `maxLength` messages
  async trimStream() {
    try {
      await this.redis.xtrim(this.streamName, "MAXLEN", "~", this.maxLength);
    } catch (error) {
      console.error("Error trimming stream:", error);
      throw new Error("Error trimming Redis stream");
    }
  }

  // Start a consumer group to consume messages
  async consumeMessages(groupName, consumerName) {
    try {
      // Read new messages from the stream (blocking and reading in consumer group)
      const messages = await this.redis.xreadgroup(
        "GROUP",
        groupName,
        consumerName,
        "COUNT",
        5, // Fetch up to 5 messages at a time
        "BLOCK",
        5000, // Block for 5 seconds if no messages
        "STREAMS",
        this.streamName,
        ">"
      );

      // Process each message
      messages.forEach(([stream, entries]) => {
        entries.forEach(([id, fields]) => {
          const data = JSON.parse(fields[1]);

          console.log(`Processing message: ${id} - ${data}`);

          // Call the webhook API with the data
          this.sendToWebhook(data)
            .then((response) => {
              console.log(
                `Successfully sent data to webhook: ${response.status}`
              );
              // Acknowledge the message after successful processing
              this.redis.xack(this.streamName, groupName, id);
            })
            .catch((error) => {
              console.error("Error calling webhook:", error);
              // Optionally, add retry logic here
            });
        });
      });
    } catch (error) {
      console.error("Error consuming messages:", error);
    }
  }

  // Send data to the target webhook API
  async sendToWebhook(data) {
    try {
      const response = await axios.post(this.webhookUrl, data);
      return response;
    } catch (error) {
      console.error("Error posting data to webhook:", error);
      throw error;
    }
  }
}

module.exports = RedisStreamManager;
