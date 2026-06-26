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

      if (message.delay) {
        await new Promise((resolve) => setTimeout(resolve, message.delay));
      }
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

      // Handle status updates
      if (value.statuses && value.statuses.length > 0) {
        const statusData = value.statuses[0];
        const phone_number_id = value.metadata?.phone_number_id;
        const recipient_id = statusData.recipient_id;
        const msg_id = statusData.id;

        if (!phone_number_id || !recipient_id || !msg_id) {
          console.log("Missing required fields in status update");
          return;
        }

        const messageKey = `message:${phone_number_id}:${recipient_id}:${msg_id}`;
        const existingMessage = await redis.get(messageKey);

        if (existingMessage) {
          const messageObj = JSON.parse(existingMessage);
          messageObj.status = statusData.status;
          if (statusData.recipient_type) {
            messageObj.recipient_type = statusData.recipient_type;
          }

          if (statusData.errors && statusData.errors.length > 0) {
            messageObj.error_reason = statusData.errors[0];
          }

          await redis.set(messageKey, JSON.stringify(messageObj));
          console.log(
            `Message status updated to ${statusData.status} for key: ${messageKey}`,
          );
        }
        return;
      }

      if (
        !value ||
        !value.contacts ||
        !value.messages ||
        value.contacts.length === 0 ||
        value.messages.length === 0
      ) {
        console.log("No valid message data found in webhook payload");
        return;
      }

      const contact = value.contacts[0];
      const messageData = value.messages[0];
      const wa_id = contact.wa_id;
      const phone_number_id = value.metadata?.phone_number_id;

      if (messageData.type === "pin") {
        return;
      }
      if (messageData.group_id) {
        return;
      }

      if (!phone_number_id) {
        console.log("Could not determine phone_number_id from webhook payload");
        return;
      }

      const msg_id =
        messageData.id ||
        `wamid.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;

      // Create message object in the expected format
      const messageValue = {
        id: msg_id,
        from: wa_id,
        to: phone_number_id,
        type: messageData.type || "text",
        text: messageData.text || { body: messageData.text?.body || "" },
        created_at: new Date().toISOString(),
        status: "sent",
        messaging_product: value.messaging_product || "whatsapp",
        referral: messageData.referral || null,
      };

      // Handle different message types
      const mediaTypes = ["image", "video", "audio", "document", "location", "contacts", "sticker", "interactive", "order", "button"];
      mediaTypes.forEach(type => {
        if (messageData[type]) {
          messageValue[type] = messageData[type];
        }
      });

      // Handle flow responses (nfm_reply) for interactive messages
      if (
        messageData.type === "interactive" &&
        messageData.interactive &&
        messageData.interactive.type === "nfm_reply" &&
        messageData.interactive.nfm_reply
      ) {
        const nfmReply = messageData.interactive.nfm_reply;

          // Store flow response in separate collection
          try {
            const flowResponseKey = `wb_flow_response:${phone_number_id}:${wa_id}:${msg_id}`;
            const flowResponseData = {
              _id: msg_id,
              business_id: entryData.id,
              wb_flow_id: nfmReply.flow_id || "unknown",
              name: nfmReply.name || "flow",
              wa_id: wa_id,
              response: nfmReply.response_json
                ? JSON.parse(nfmReply.response_json)
                : {},
              created_at: new Date().toISOString(),
              workspace_id: phone_number_id,
              message_id: msg_id,
            };

            await redis.set(flowResponseKey, JSON.stringify(flowResponseData));
            console.log(`Flow response stored with key: ${flowResponseKey}`);
          } catch (flowError) {
            console.error("Error storing flow response:", flowError);
          }
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
        LIVECHAT_WEBHOOK_URL,
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
