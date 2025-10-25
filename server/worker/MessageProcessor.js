const axios = require("axios");
const Redis = require("ioredis");
const { handleError } = require("./errorHandler");
const config = require("./config");
const LIVECHAT_WEBHOOK_URL =
  process.env.LIVECHAT_WEBHOOK_URL ||
  "https://prev-kwic-dev.nekhop.com/api/wh/livechat";

// Initialize Redis connection for message storage
const redis = new Redis(config.REDIS_URL);

class MessageProcessor {
  static async processWebHookMessage(message) {
    try {
      // Store the message in Redis with the correct key pattern
      await MessageProcessor.storeMessageInRedis(message.payload);
      
      // Forward to external webhook
      await axios.post(config.WEBHOOK_URL, message.payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Webhook message processed successfully", config.WEBHOOK_URL);
    } catch (error) {
      handleError(error, "processWebHookMessage");
    }
  }

  static async storeMessageInRedis(payload) {
    try {
      // Extract message data from the webhook payload structure
      const { entry } = payload;
      
      if (!entry || entry.length === 0) {
        console.log("No entry data found in webhook payload");
        return;
      }

      const entryData = entry[0];
      const changes = entryData.changes;
      
      if (!changes || changes.length === 0) {
        console.log("No changes data found in webhook payload");
        return;
      }

      const changeData = changes[0];
      const value = changeData.value;
      
      if (!value || !value.contacts || !value.messages || value.contacts.length === 0 || value.messages.length === 0) {
        console.log("No valid message data found in webhook payload");
        return;
      }

      const contact = value.contacts[0];
      const messageData = value.messages[0];
      const wa_id = contact.wa_id;
      const phone_number_id = value.metadata?.phone_number_id;
      
      if (!phone_number_id) {
        console.log("Could not determine phone_number_id from webhook payload");
        return;
      }

      const msg_id = messageData.id || `wamid.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
      
      // Create message object in the expected format
      const messageValue = {
        id: msg_id,
        from: wa_id,
        to: phone_number_id,
        type: messageData.type || "text",
        text: messageData.text || { body: messageData.text?.body || "" },
        created_at: new Date().toISOString(),
        status: "sent",
        messaging_product: value.messaging_product || "whatsapp"
      };

      // Handle different message types
      if (messageData.type === "order" && messageData.order) {
        messageValue.order = messageData.order;
      }

      // Store with the correct key pattern that getChatMessages expects
      const messageKey = `message:${phone_number_id}:${wa_id}:${msg_id}`;
      await redis.set(messageKey, JSON.stringify(messageValue));
      
      console.log(`Message stored in Redis with key: ${messageKey}`);
      
    } catch (error) {
      console.error("Error storing message in Redis:", error);
      // Don't throw error here to avoid breaking the webhook processing
    }
  }

  static async processLiveWebHookMessage(message) {
    try {
      await axios.post(LIVECHAT_WEBHOOK_URL, message.payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(
        "Webhook message processed successfully",
        LIVECHAT_WEBHOOK_URL
      );
    } catch (error) {
      handleError(error, "processWebHookMessage");
    }
  }

  static async processRegularMessage(message) {
    try {
      await new Promise((resolve) => {
        setTimeout(() => {
          console.log(`Processed: ${message.id} - ${message.data.text}`);
          resolve();
        }, Math.random() * 2000);
      });
    } catch (error) {
      handleError(error, "processRegularMessage");
    }
  }

  static async closeRedisConnection() {
    try {
      await redis.quit();
      console.log("Redis connection closed");
    } catch (error) {
      console.error("Error closing Redis connection:", error);
    }
  }
}

module.exports = MessageProcessor;
