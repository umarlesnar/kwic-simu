const express = require("express");
const router = express.Router();
const IdGenerator = require("./../../../utils/IdGenerator");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ShortUniqueId = require("short-unique-id");
const {
  generateCustomId,
  generateUploadString,
  parseUploadString,
  revalidateCustomId,
  generateUniqueId,
} = require("./../../../utils/FileUploadManager");
const { getIO } = require("../../../utils/ws/SocketManager");
const groupsRouter = require("./groups");
const { getGroupFromRedis } = require("./groups/groupService");

const uploadDir = path.join(__dirname, "./../../../uploads");

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:3000";

const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL || "http://wbapp:5000";

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

function decodeBase64(base64String) {
  try {
    let stringToDecode = base64String;
    if (base64String.includes(".")) {
      const parts = base64String.split(".");
      if (parts.length === 3) stringToDecode = parts[1];
    }
    
    const normalized = stringToDecode.replace(/-/g, "+").replace(/_/g, "/");
    const jsonString = Buffer.from(normalized, "base64").toString("utf-8");
    
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      // If it's not JSON, it's an opaque token. 
      // Return a virtual user to avoid crashing.
      return { 
        opaque: true, 
        token: base64String,
        // If the token starts with 11, it's likely a WBA ID being used as a token
        wba_id: base64String.startsWith("11") ? base64String : "1100000000001",
        phone_number_id: "12172328" 
      };
    }
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

// Helper function to identify dynamic value type
function identifyType(value) {
  if (value.startsWith("12")) {
    return "phone_number_id";
  } else if (value.startsWith("11")) {
    return "whatsapp_business_account_id";
  } else if (value.startsWith("13")) {
    return "template_id";
  } else if (value.startsWith("14")) {
    return "app_id";
  } else if (value.startsWith("upload")) {
    return "file_upload_id";
  } else if (value.startsWith("15")) {
    return "media_id";
  } else if (value.startsWith("16")) {
    return "FB_BUSINESS_ID";
  } else if (value.startsWith("17")) {
    return "catalog_id";
  } else if (value.startsWith("18")) {
    return "flow_id";
  } else if (value.startsWith("19")) {
    return "ad_campaign_id";
  } else if (value.startsWith("20")) {
    return "ad_set_id";
  } else if (value.startsWith("21")) {
    return "ad_creative_id";
  } else if (value.startsWith("22")) {
    return "ad_id";
  } else if (value.startsWith("act_")) {
    return "ad_account_id";
  } else if (value.includes("@g.us")) {
    return "group_id";
  } else if (value.length > 10 && /^\d+$/.test(value)) {
    return "flow_id";
  } else {
    return "generic_id";
  }
}

// Helper function to check if number should return error
function getCustomStatusConfig(phoneNumber) {
  if (phoneNumber.startsWith("911441")) {
    return {
      status: "failed",
      errors: [
        {
          code: 131047,
          message: "Re-engagement message",
          title: "Re-engagement message",
          error_data: {
            details:
              "Message failed to send because more than 24 hours have passed since the customer last replied to this number.",
          },
          href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/",
        },
      ],
    };
  } else if (phoneNumber.startsWith("911442")) {
    return {
      status: "failed",
      errors: [
        {
          code: 131049,
          message:
            "This message was not delivered to maintain healthy ecosystem engagement.",
          title:
            "This message was not delivered to maintain healthy ecosystem engagement.",
          error_data: {
            details:
              "In order to maintain a healthy ecosystem engagement, the message failed to be delivered.",
          },
          href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/",
        },
      ],
    };
  } else if (phoneNumber.startsWith("911443")) {
    return {
      status: "failed",
      errors: [
        {
          code: 131026,
          message: "Message undeliverable",
          title: "Message undeliverable",
          error_data: {
            details: "Message Undeliverable.",
          },
          href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/",
        },
      ],
    };
  } else if (phoneNumber.startsWith("911444")) {
    return {
      status: "failed",
      errors: [
        {
          code: 130472,
          message: "User's number is part of an experiment",
          title: "User's number is part of an experiment",
          error_data: {
            details:
              "Failed to send message because this user's phone number is part of an experiment",
          },
          href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/",
        },
      ],
    };
  } else if (phoneNumber.startsWith("911445")) {
    return {
      status: "sent",
    };
  } else if (phoneNumber.startsWith("911446")) {
    return {
      status: "sent",
      delayStatus: "delivered",
      delay: 1000,
    };
  } else if (phoneNumber.startsWith("911447")) {
    return {
      status: "sent",
      delayStatus: "delivered",
      finalStatus: "read",
      delay: 1000,
    };
  }
  return null;
}

router.use((req, res, next) => {
  const authHeader = req.headers.authorization;

  if (req.path === "/oauth/access_token") {
    return next();
  }

  if (req.path === "/debug_token") {
    return next();
  }

  if (req.path === "/app/uploads/") {
    return next();
  }

  let _path = req.path.toString();

  if (_path.startsWith("/upload:")) {
    return next();
  }

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  const [bearer, token] = authHeader.split(" ");

  if (bearer !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid token format" });
  }
  req.user = decodeBase64(token);
  if (!req.user) {
    return res.status(401).json({ error: "Invalid or malformed token" });
  }
  console.log("USER Authenticated:", req.user.wba_id || req.user.whatsapp_business_account_id);
  next();
});

router.use("/", groupsRouter);

router.post("/:dynamic_value/conversational_automation", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "phone_number_id") {
    res.json({
      success: true,
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

// Simulate GET <phone_number_id>/whatsapp_business_profile
router.get("/:dynamic_value/whatsapp_business_profile", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "whatsapp_business_account_id") {
    // yet to test
    res.json({
      data: [
        {
          business_profile: {
            messaging_product: "whatsapp",
            address: "Address Testing",
            description: "This is Testing Informa",
            vertical: "OTHER",
            about: "profile-about-text",
            email: "business-email",
            websites: ["https://website-1.com", "https://website-2.com"],
            profile_picture_handle:
              "2:c2FtcGxlLm1wNA==:image/jpeg:GKAj0gAUCZmJ1voFADip2iIAAAAAbugbAAAA:e:1472075513:ARZ_3ybzrQqEaluMUdI",
            id: "12874775", ///IdGenerator.generatePhoneNumberId(),
          },
          id: req.params.dynamic_value,
        },
      ],
    });
  } else if (valueType === "phone_number_id") {
    // THis correct
    res.json({
      data: [
        {
          messaging_product: "whatsapp",
          address: "Address Testing",
          description: "This is Testing Informa",
          vertical: "OTHER",
          about: "profile-about-text",
          email: "business-email",
          websites: ["https://website-1.com", "https://website-2.com"],
          profile_picture_handle:
            "2:c2FtcGxlLm1wNA==:image/jpeg:GKAj0gAUCZmJ1voFADip2iIAAAAAbugbAAAA:e:1472075513:ARZ_3ybzrQqEaluMUdI",
          id: "12874775", ///IdGenerator.generatePhoneNumberId(),
        },
      ],
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

// Simulate POST <phone_number_id>/whatsapp_business_profile
router.post("/:dynamic_value/whatsapp_business_profile", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "phone_number_id") {
    res.json({
      data: [
        {
          business_profile: {
            messaging_product: "whatsapp",
            address: "Testing Address",
            description: "Testing",
            vertical: "OTHER",
            about: "Yet to update",
            email: "<business-email>",
            websites: ["https://website-1", "https://website-2"],
            profile_picture_url:
              "https://static.kwic.in/nml/app/674ff1a5b90ae6db773e56d2.jpg", // After Update
            id: "1100000001",
          },
          id: "12874775",
        },
      ],
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.post("/app/uploads", (req, res) => {
  res.json({
    id: generateUploadString(),
  });
});

router.get("/debug_token", (req, res) => {
  const queryParams = req.query;
  const _reponse = decodeBase64(queryParams.input_token);

  res.json({
    data: {
      app_id: _reponse.app_id,
      type: "SYSTEM_USER",
      application: "Kwic AI",
      data_access_expires_at: 0,
      expires_at: 0,
      is_valid: true,
      issued_at: 1739969415,
      scopes: [
        "whatsapp_business_management",
        "whatsapp_business_messaging",
        "public_profile",
      ],
      granular_scopes: [
        {
          scope: "whatsapp_business_management",
          target_ids: [_reponse.wba_id],
        },
        {
          scope: "whatsapp_business_messaging",
          target_ids: [_reponse.wba_id],
        },
      ],
      user_id: "122093286434606887",
    },
  });
});

// Simulate GET oauth/access_token
router.get("/oauth/access_token", (req, res) => {
  const queryParams = req.query;

  res.json({
    access_token: queryParams.code,
    token_type: "bearer",
  });
});

router.get("/:dynamic_value/client_whatsapp_business_accounts", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "FB_BUSINESS_ID") {
    res.json({
      data: [
        {
          id: 1906385232743451,
          name: "My WhatsApp Business Account",
          currency: "USD",
          timezone_id: "1",
          message_template_namespace: "abcdefghijk_12lmnop",
        },
        {
          id: 1972385232742141,
          name: "My Regional Account",
          currency: "INR",
          timezone_id: "5",
          message_template_namespace: "12abcdefghijk_34lmnop",
        },
      ],
      paging: {
        cursors: {
          before: "abcdefghij",
          after: "klmnopqr",
        },
      },
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

// Simulate GET oauth/phone_numbers
router.get("/:dynamic_value/phone_numbers", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const user = req.user;
  if (valueType === "phone_number_id") {
    const fkey = `whatsapp:*${req.params.dynamic_value}`;
    const data = await req.redisManager.getValuesByPattern(fkey);

    const final_data = data.map((data) => {
      return JSON.parse(data.value);
    });

    res.json({
      data: final_data,
      paging: {
        cursors: {
          before: "1dn",
          after: "QVF1dn",
        },
      },
    });
  } else if (valueType === "whatsapp_business_account_id") {
    const date = new Date();
    const last_onboarded_time = date
      .toISOString()
      .replace(/\.\d{3}Z$/, "+0000");

    const fkey = `whatsapp:${user.wba_id}:*`;
    const data = await req.redisManager.getValuesByPattern(fkey);

    const final_data = data.map((data) => {
      return JSON.parse(data.value);
    });

    return res.json({
      data: final_data,
      paging: {
        cursors: {
          before: "1dn",
          after: "QVF1dn",
        },
      },
    });
  } else {
    return res
      .status(400)
      .json({ error: `Invalid value type for ${valueType}` });
  }
});

// Flow endpoints - Load flows data
const getFlowsData = () => {
  return {
    flows: [
      {
        id: "1800000000001",
        name: "Feedback Collection",
        status: "PUBLISHED",
        categories: ["FEEDBACK_COLLECTION"],
        validation_errors: [],
        json_version: "3.0",
        data_api_version: "3.0",
        endpoint_uri: "https://example.com/flow-endpoint",
        preview: {
          preview_url:
            "https://business.facebook.com/wa/manage/flows/1800000000001/preview/?token=b9d6abc123",
          expires_at: "2024-12-31T23:59:59+0000",
        },
        whatsapp_business_account: {
          id: "1100000001",
          name: "Test Business Account",
        },
        application: {
          id: "1400000001",
          name: "Test App",
        },
        health_status: {
          can_send_message: "AVAILABLE",
          entities: [
            {
              entity_type: "FLOW",
              id: "1800000000001",
              can_send_message: "AVAILABLE",
              errors: [
                {
                  error_code: 131000,
                  error_description:
                    "endpoint_uri: You need to set the endpoint URI before you can send or publish a flow.",
                },
              ],
            },
          ],
        },
      },
      {
        id: "1800000000002",
        name: "Customer Survey",
        status: "PUBLISHED",
        categories: ["SURVEY"],
        validation_errors: [],
        json_version: "3.0",
        data_api_version: "3.0",
        endpoint_uri: "https://example.com/survey-endpoint",
        preview: {
          preview_url:
            "https://business.facebook.com/wa/manage/flows/1800000000002/preview/?token=xyz789def",
          expires_at: "2024-12-31T23:59:59+0000",
        },
        whatsapp_business_account: {
          id: "1100000001",
          name: "Test Business Account",
        },
        application: {
          id: "1400000001",
          name: "Test App",
        },
        health_status: {
          can_send_message: "AVAILABLE",
        },
      },
      {
        id: "1800000000003",
        name: "Contact Us Form",
        status: "PUBLISHED",
        categories: ["CONTACT_US"],
        validation_errors: [
          {
            error_code: 100001,
            error_description: "Missing required field: phone_number",
          },
        ],
        json_version: "3.0",
        data_api_version: "3.0",
        endpoint_uri: null,
        preview: {
          preview_url:
            "https://business.facebook.com/wa/manage/flows/1800000000003/preview/?token=contact123",
          expires_at: "2024-12-31T23:59:59+0000",
        },
        whatsapp_business_account: {
          id: "1100000001",
          name: "Test Business Account",
        },
        application: {
          id: "1400000001",
          name: "Test App",
        },
        health_status: {
          can_send_message: "AVAILABLE",
        },
      },
    ],
    assets: {
      1800000000001: [
        {
          name: "flow_survey_1.json",
          asset_type: "FLOW_JSON",
          download_url: `${PUBLIC_BASE_URL}/files/flow_survey_1.json`,
        },
      ],
      1800000000002: [
        {
          name: "flow_survey_2.json",
          asset_type: "FLOW_JSON",
          download_url: `${PUBLIC_BASE_URL}/files/flow_survey_2.json`,
        },
      ],
      1800000000003: [
        {
          name: "flow_survey_3.json",
          asset_type: "FLOW_JSON",
          download_url: `${PUBLIC_BASE_URL}/files/flow_survey_3.json`,
        },
      ],
    },
  };
};

// GET /{WABA-ID}/flows - Retrieve list of flows
router.get("/:dynamic_value/flows", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType !== "whatsapp_business_account_id") {
    return res.status(400).json({ error: "Invalid WABA ID" });
  }

  const flowsData = getFlowsData();
  const flows = flowsData.flows.map((flow) => ({
    id: flow.id,
    name: flow.name,
    status: flow.status,
    categories: flow.categories,
    validation_errors: flow.validation_errors,
  }));

  res.json({
    data: flows,
    paging: {
      cursors: {
        before: "QVFI...",
        after: "QVFI...",
      },
    },
  });
});

// GET /{FLOW-ID}/assets - Retrieve flow assets
router.get("/:dynamic_value/assets", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType !== "flow_id") {
    return res.status(400).json({ error: "Invalid Flow ID" });
  }

  const flowsData = getFlowsData();
  const assets = flowsData.assets[req.params.dynamic_value] || [];

  res.json({
    data: assets,
    paging: {
      cursors: {
        before: "QVFIU...",
        after: "QVFIU...",
      },
    },
  });
});

router.get("/:dynamic_value/request_code", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "phone_number_id") {
    res.json({
      success: true,
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.get("/:dynamic_value/verify_code", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "phone_number_id") {
    res.json({
      success: true,
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

// Simulate POST /:dynamic_value/verify_code
router.post("/:dynamic_value/uploads", (req, res) => {
  console.log("POST REQUEST", req.query);

  res.json({ id: "upload:" + generateUniqueId() });
});

// Simulate POST apps/uploads
router.post("apps/uploads", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file part" });
  } else {
    res.json({ status: "File uploaded", filename: req.file.originalname });
  }
});
// Simulate POST :whatsapp_business_account_id/register
router.post("/:dynamic_value/register", async (req, res) => {
  const user = req.user;
  const q_id = req.params.dynamic_value;
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "whatsapp_business_account_id") {
    const _id = q_id + ":own";
    await req.redisManager.put("wb", _id, req.body);
    res.json({
      success: true,
    });
  } else if (valueType === "phone_number_id") {
    res.json({
      success: true,
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.post("/:dynamic_value/deregister", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "phone_number_id") {
    res.json({
      success: true,
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

// Simulate POST :whatsapp_business_account_id/messages
router.post("/:dynamic_value/messages", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const dynamic_value = req.params.dynamic_value;
  const body = req.body;
  const { wba_id } = req.user;

  if (valueType === "phone_number_id") {
    // Handle mark as read
    if (body.status === "read" && body.message_id) {
      const msg_id = body.message_id;
      const pattern = `message:${dynamic_value}:*:${msg_id}`;
      const messages = await req.redisManager.getValuesByPattern(pattern);

      if (messages.length > 0) {
        const messageKey = messages[0].key;
        const wa_id = messageKey.split(":")[2];

        // Mark all messages from this sender as read
        const allUserMessagesPattern = `message:${dynamic_value}:${wa_id}:*`;
        const allUserMessages = await req.redisManager.getValuesByPattern(
          allUserMessagesPattern,
        );

        const updatedMessages = [];
        for (const msgData of allUserMessages) {
          const msg = JSON.parse(msgData.value);
          if (msg.status !== "read") {
            msg.status = "read";
            msg.read_at = new Date().toISOString();
            await req.redisManager.putByKey(msgData.key, msg, -1);
            updatedMessages.push(msg);
          }
        }

        // Handle typing indicator if present
        if (body.typing_indicator) {
          try {
            const io = getIO();
            io.to(`message/whatsapp/${wa_id}`).emit("operatorTyping", {
              phone_number_id: dynamic_value,
              wa_id: wa_id,
              isTyping: true,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            console.log("Error emitting typing indicator:", error);
          }
        }

        // Emit socket event for real-time updates (latest message)
        try {
          const io = getIO();
          const topic = `message/whatsapp/${wa_id}`;
          const latestMsg = JSON.parse(messages[0].value);
          latestMsg.status = "read";
          latestMsg.read_at = new Date().toISOString();

          io.to(topic).emit("topic-data", {
            topic,
            data: latestMsg,
            timestamp: new Date(),
          });
        } catch (error) {
          console.log("Error emitting socket event:", error);
        }

        return res.json({ success: true });
      } else {
        return res.status(404).json({ error: "Message not found" });
      }
    }

    const msg_id = "wamid." + generateUniqueId();
    const isGroupMessage = body.recipient_type === "group" || (body.to && body.to.endsWith("@g.us"));
    
    // VALIDATION: Sync response error if recipient_type and to type do not match
    if (body.recipient_type === "group" && (!body.to || !body.to.endsWith("@g.us"))) {
      return res.status(400).json({
        error: {
          message: "Recipient type 'group' requires a group ID in the 'to' field.",
          type: "OAuthException",
          code: 100,
        }
      });
    }
    if (body.recipient_type === "individual" && body.to && body.to.endsWith("@g.us")) {
      return res.status(400).json({
        error: {
          message: "Recipient type 'individual' cannot be used with a group ID.",
          type: "OAuthException",
          code: 100,
        }
      });
    }

    const recipient_id = body.to;

    // Check if number should return error or custom status (for non-group messages)
    let customStatusConfig;
    if (!isGroupMessage) {
      customStatusConfig = getCustomStatusConfig(body.to);
      if (customStatusConfig && customStatusConfig.status === "failed") {
        // Send failed webhook
        const failedWebhook = {
          object: "whatsapp_business_account",
          entry: [
            {
              id: wba_id,
              changes: [
                {
                  value: {
                    messaging_product: "whatsapp",
                    metadata: {
                      display_phone_number: dynamic_value,
                      phone_number_id: dynamic_value,
                    },
                    statuses: [
                      {
                        id: msg_id,
                        status: "failed",
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        recipient_id: body.to,
                        errors: customStatusConfig.errors,
                      },
                    ],
                  },
                  field: "messages",
                },
              ],
            },
          ],
        };

        try {
          await req.redisStreamManager.sendMessage({
            type: "WEBHOOK",
            payload: failedWebhook,
          });
        } catch (error) {
          console.log("Error sending failed webhook:", error);
        }

        const errorResponse = {
          messaging_product: "whatsapp",
          contacts: [
            {
              input: body.to,
              wa_id: body.to,
            },
          ],
          messages: [
            {
              id: msg_id,
              message_status: "failed",
              errors: customStatusConfig.errors,
            },
          ],
        };
        return res.json(errorResponse);
      }
    }

    const data = {
      messaging_product: "whatsapp",
      contacts: [
        {
          input: body.to,
          wa_id: body.to,
        },
      ],
      messages: [
        {
          id: msg_id,
        },
      ],
    };

    // For groups, we might want to skip client registration or use a different key
    if (!isGroupMessage) {
      // `wb:${wba_id}:${phone_number_id}:client:${wa_id}`
      const client = await req.redisManager.getValuesByPattern(
        `wb:*:${dynamic_value}:client:${body.to}`,
      );

      if (client.length === 0) {
        // TODO Register Client first
        const key = `wb:${wba_id}:${dynamic_value}:client:${body.to}`;
        const value = {
          wa_id: body.to,
          phone_number_id: dynamic_value,
          profile: {
            name: "Testing",
          },
          created_at: new Date().toISOString(),
        };
        await req.redisManager.putByKey(key, value, -1);
      }
    }
    const conversation_window_hours = process.env.CONVERSATION_WINDOW || 24;
    // Generate Expireed timestamp future 24 hours
    const expires_at = Date.now() / 1000;
    const expires_at_24h =
      expires_at + Number(conversation_window_hours) * 60 * 60;
    // Generate unique id using short-unique-id
    const uid = new ShortUniqueId({ length: 18 });
    const conversation_id = uid.rnd();

    //`wb:${wba_id}:${phone_number_id}:client:${wa_id}`
    const conversation_ids = await req.redisManager.getValuesByPattern(
      `conversation:${dynamic_value}:${body.to}:*`,
    );

    let converation_obj = {};

    if (conversation_ids.length === 0) {
      // TODO Register Client first
      const ckey = `conversation:${dynamic_value}:${body.to}:${conversation_id}`;
      const cvalue = {
        id: conversation_id, // Generate random string
        origin: {
          type: isGroupMessage ? "group_marketing" : "marketing",
        },
        expiration_timestamp: expires_at_24h,
      };
      // seconds
      const ttl = expires_at_24h - expires_at;
      converation_obj = cvalue;
      await req.redisManager.putByKey(ckey, cvalue, ttl);
    } else {
      converation_obj = conversation_ids[0].value || {};
    }

    // Create pricing object and store in Redis
    const pricing = {
      billable: true,
      pricing_model: "PMP",
      category: isGroupMessage ? "group_marketing" : "marketing",
      type: "regular",
    };

    // Only create pricing and store it if it's not a pin action
    if (body.type !== "pin") {
      const pricingKey = `pricing:${dynamic_value}:${body.to}:${msg_id}`;
      await req.redisManager.putByKey(pricingKey, pricing);
    }

    // Handle order messages
    if (body.type === "order" || body.interactive?.type === "order_details") {
      const orderData = body.interactive?.action || body.order;
      const orderKey = `order:${dynamic_value}:${body.to}:${msg_id}`;
      await req.redisManager.putByKey(orderKey, {
        id: msg_id,
        catalog_id: orderData.catalog_id,
        product_items:
          orderData.sections?.[0]?.product_items || orderData.product_items,
        created_at: new Date().toISOString(),
      });
    }

    const message_key = `message:${dynamic_value}:${body.to}:${msg_id}`;
    const message_value = {
      id: msg_id,
      ...body,
      created_at: new Date().toISOString(),
      conversation: converation_obj,
      pricing: pricing,
    };

    if (body.type === "template" && body.template) {
      message_value.template = { ...body.template };
      // Check for group_id in button parameters
      const buttonComponent = body.template.components?.find(c => c.type === "button");
      if (buttonComponent && buttonComponent.parameters?.some(p => p.type === "group_id")) {
        message_value.contains_group_invite = true;
      }
    }

    if (body.type === "pin" && body.pin) {
      const pinOp = body.pin.type === "unpin" ? "unpin" : "pin";
      const targetMessageId = body.pin.message_id;

      // Update response data for pin/unpin operations
      data.contacts = [
        {
          input: body.to,
          wa_id: body.to,
        },
      ];
      data.messages[0].id = targetMessageId;

      message_value.pin_update = {
        target_message_id: targetMessageId,
        action: pinOp,
        status: "success",
      };
      message_value.direction = "outgoing";
    }

    if (!message_value.direction) {
      message_value.direction = "outgoing";
    }

    if (isGroupMessage) {
      message_value.to = body.to;
      message_value.recipient_type = "group";
      message_value.phone_number_id = dynamic_value;
      message_value.group_id = body.to;
    } else {
      message_value.recipient_type =
        message_value.recipient_type || "individual";
      message_value.phone_number_id = dynamic_value;
      message_value.to = body.to;
    }
    if (body.type !== "pin") {
      await req.redisManager.putByKey(message_key, message_value);
    }

    // Apply pin/unpin to the target chat message (Messages API simulation)
    if (
      body.type === "pin" &&
      body.pin?.message_id &&
      isGroupMessage
    ) {
      try {
        const op = body.pin.type === "unpin" ? "unpin" : "pin";

        // ADMIN CHECK: Only the group admin can pin or unpin messages.
        // In the simulator, the business account (dynamic_value) must be a participant.
        const group = await getGroupFromRedis(req.redisManager, dynamic_value, body.to);
        if (!group) {
          return res.status(400).json({
            error: {
              message: "The group ID specified is invalid or the group does not exist.",
              type: "OAuthException",
              code: 100,
            }
          });
        }
        const isParticipant = group.participants.some(p => (typeof p === 'string' ? p : p.wa_id) === dynamic_value);
        if (!isParticipant) {
          return res.status(403).json({
            error: {
              message: "Only group admins can pin or unpin messages.",
              type: "OAuthException",
              code: 403,
            }
          });
        }
        
        if (op === "pin") {
          // ENFORCE LIMIT: Maximum 3 pinned messages
          const groupMessagesPattern = `message:${dynamic_value}:${body.to}:*`;
          const allMessagesData = await req.redisManager.getValuesByPattern(groupMessagesPattern);
          const pinnedMessages = allMessagesData
            .map(m => JSON.parse(m.value))
            .filter(m => m.pinned === true)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Oldest first

          if (pinnedMessages.length >= 3) {
            // Unpin the oldest one
            const oldest = pinnedMessages[0];
            const oldestKey = `message:${dynamic_value}:${body.to}:${oldest.id}`;
            oldest.pinned = false;
            oldest.unpinned_at = new Date().toISOString();
            await req.redisManager.putByKey(oldestKey, oldest, -1);
            
            // Notify about auto-unpin
            try {
              const io = getIO();
              io.to(`group/${body.to}`).emit("topic-data", {
                topic: `message/whatsapp/${body.to}`,
                data: oldest,
                timestamp: new Date(),
              });
            } catch (e) {}
          }
        }

        const targetKey = `message:${dynamic_value}:${body.to}:${body.pin.message_id}`;
        const targetMsg = await req.redisManager.getByKey(targetKey);
        if (targetMsg) {
          const updatedTarget = { ...targetMsg };
          if (op === "pin") {
            updatedTarget.pinned = true;
            updatedTarget.pin_expiration_days =
              body.pin.expiration_days != null
                ? Number(body.pin.expiration_days)
                : null;
            updatedTarget.pinned_at = new Date().toISOString();
          } else {
            updatedTarget.pinned = false;
            updatedTarget.pin_expiration_days = null;
            updatedTarget.unpinned_at = new Date().toISOString();
          }
          await req.redisManager.putByKey(targetKey, updatedTarget, -1);
          try {
            const io = getIO();
            const pinPayload = {
              topic: `message/whatsapp/${body.to}`,
              data: updatedTarget,
              timestamp: new Date(),
            };
            io.to(`group/${body.to}`).emit("topic-data", pinPayload);
            io.to(`message/whatsapp/${body.to}`).emit("topic-data", pinPayload);
          } catch (pinIoErr) {
            console.log("Error emitting pin target update:", pinIoErr);
          }
        }
      } catch (pinApplyErr) {
        console.log("Error applying pin to target message:", pinApplyErr);
      }
    }

    if (body.type !== "pin") {
      try {
        const io = getIO();
        if (isGroupMessage) {
          const payload = {
            topic: `message/whatsapp/${body.to}`,
            data: message_value,
            timestamp: new Date(),
          };
          io.to(`group/${body.to}`).emit("topic-data", payload);
          io.to(`message/whatsapp/${body.to}`).emit("topic-data", payload);
        } else {
          io.to(`message/whatsapp/${body.to}`).emit("topic-data", {
            topic: `message/whatsapp/${body.to}`,
            data: message_value,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.log("Error emitting socket event:", error);
      }
    }

    if (isGroupMessage && body.type !== "pin") {
      const groupSentWebhook = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: wba_id,
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: dynamic_value,
                    phone_number_id: dynamic_value,
                  },
                  statuses: [
                    {
                      id: msg_id,
                      recipient_id: body.to,
                      recipient_type: "group",
                      status: "sent",
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };
      try {
        await req.redisStreamManager.sendMessage({
          type: "WEBHOOK",
          payload: groupSentWebhook,
        });
      } catch (e) {
        console.log("Error sending group sent webhook:", e);
      }
    }

    // Handle delayed status updates
    if (customStatusConfig && customStatusConfig.delayStatus) {
      const sendDelayedStatus = async (status, delayTime) => {
        setTimeout(async () => {
          try {
            // Update status in Redis
            const messageData =
              await req.redisManager.getValuesByPattern(message_key);
            if (messageData.length > 0) {
              const message = JSON.parse(messageData[0].value);
              message.status = status;
              if (status === "read") {
                message.read_at = new Date().toISOString();
              } else if (status === "delivered") {
                message.delivered_at = new Date().toISOString();
              }
              await req.redisManager.putByKey(message_key, message, -1);

              // Send webhook
              const statusWebhook = {
                object: "whatsapp_business_account",
                entry: [
                  {
                    id: wba_id,
                    changes: [
                      {
                        value: {
                          messaging_product: "whatsapp",
                          metadata: {
                            display_phone_number: dynamic_value,
                            phone_number_id: dynamic_value,
                          },
                          statuses: [
                            {
                              id: msg_id,
                              status: status,
                              timestamp: Math.floor(
                                Date.now() / 1000,
                              ).toString(),
                              recipient_id: body.to,
                              ...(isGroupMessage
                                ? { recipient_type: "group" }
                                : {}),
                            },
                          ],
                        },
                        field: "messages",
                      },
                    ],
                  },
                ],
              };
              await req.redisStreamManager.sendMessage({
                type: "WEBHOOK",
                payload: statusWebhook,
              });

              // Emit socket event
              try {
                const io = getIO();
                if (isGroupMessage) {
                  const p = {
                    topic: `message/whatsapp/${body.to}`,
                    data: message,
                    timestamp: new Date(),
                  };
                  io.to(`group/${body.to}`).emit("topic-data", p);
                  io.to(`message/whatsapp/${body.to}`).emit("topic-data", p);
                } else {
                  io.to(`message/whatsapp/${body.to}`).emit("topic-data", {
                    topic: `message/whatsapp/${body.to}`,
                    data: message,
                    timestamp: new Date(),
                  });
                }
              } catch (ioError) {
                console.log("Error emitting delayed socket event:", ioError);
              }
            }
          } catch (error) {
            console.log(`Error sending delayed status ${status}:`, error);
          }
        }, delayTime);
      };

      // Schedule "delivered" status
      sendDelayedStatus(
        customStatusConfig.delayStatus,
        customStatusConfig.delay,
      );

      // Schedule "read" status if configured
      if (customStatusConfig.finalStatus) {
        sendDelayedStatus(
          customStatusConfig.finalStatus,
          customStatusConfig.delay * 2,
        );
      }
    }

    // const wba_id = client[0].key.split(":")[1];
    // const wa_id = client[0].key.split(":")[3];
    // const phone_number_id = client[0].key.split(":")[2];
    // const client_data = client[0].value;
    // const result = await req.redisStreamManager.sendMessage({
    //   type: "MESSAGE",
    //   payload: data,
    // });

    return res.json(data);
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.post("/:dynamic_value/marketing_messages", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const dynamic_value = req.params.dynamic_value;
  const body = req.body;
  const { wba_id } = req.user;
  if (valueType === "phone_number_id") {
    const msg_id = "wamid." + generateUniqueId();

    // Check if number should return error or custom status
    const customStatusConfig = getCustomStatusConfig(body.to);
    if (customStatusConfig && customStatusConfig.status === "failed") {
      // Send failed webhook
      const failedWebhook = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: wba_id,
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: dynamic_value,
                    phone_number_id: dynamic_value,
                  },
                  statuses: [
                    {
                      id: msg_id,
                      status: "failed",
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      recipient_id: body.to,
                      errors: customStatusConfig.errors,
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };

      try {
        await req.redisStreamManager.sendMessage({
          type: "WEBHOOK",
          payload: failedWebhook,
        });
      } catch (error) {
        console.log("Error sending failed webhook:", error);
      }

      const errorResponse = {
        messaging_product: "whatsapp",
        contacts: [
          {
            input: body.to,
            wa_id: body.to,
          },
        ],
        messages: [
          {
            id: msg_id,
            message_status: "failed",
            errors: customStatusConfig.errors,
          },
        ],
      };
      return res.json(errorResponse);
    }

    const data = {
      messaging_product: "whatsapp",
      contacts: [
        {
          input: body.to,
          wa_id: body.to,
        },
      ],
      messages: [
        {
          id: msg_id,
        },
      ],
    };

    // Check key existi or not

    //`wb:${wba_id}:${phone_number_id}:client:${wa_id}`
    const client = await req.redisManager.getValuesByPattern(
      `wb:*:${dynamic_value}:client:${body.to}`,
    );

    if (client.length === 0) {
      // TODO Register Client first
      const key = `wb:${wba_id}:${dynamic_value}:client:${body.to}`;
      const value = {
        wa_id: body.to,
        phone_number_id: dynamic_value,
        profile: {
          name: "Testing",
        },
        created_at: new Date().toISOString(),
      };
      await req.redisManager.putByKey(key, value, -1);
    }
    const conversation_window_hours = process.env.CONVERSATION_WINDOW || 24;
    // Generate Expireed timestamp future 24 hours
    const expires_at = Date.now() / 1000;
    const expires_at_24h =
      expires_at + Number(conversation_window_hours) * 60 * 60;
    // Generate unique id using short-unique-id
    const uid = new ShortUniqueId({ length: 18 });
    const conversation_id = uid.rnd();

    //`wb:${wba_id}:${phone_number_id}:client:${wa_id}`
    const conversation_ids = await req.redisManager.getValuesByPattern(
      `conversation:${dynamic_value}:${body.to}:*`,
    );

    let converation_obj = {};

    if (conversation_ids.length === 0) {
      // TODO Register Client first
      const ckey = `conversation:${dynamic_value}:${body.to}:${conversation_id}`;
      const cvalue = {
        id: conversation_id, // Generate random string
        origin: {
          type: "marketing",
        },
        pricing: {
          billable: true,
          pricing_model: "CBP",
          category: "marketing",
        },
        expiration_timestamp: expires_at_24h,
      };
      // seconds
      const ttl = expires_at_24h - expires_at;
      converation_obj = cvalue;
      await req.redisManager.putByKey(ckey, cvalue, ttl);
    } else {
      converation_obj = conversation_ids[0].value || {};
    }

    const message_key = `message:${dynamic_value}:${body.to}:${msg_id}`;
    const message_value = {
      id: msg_id,
      ...body,
      created_at: new Date().toISOString(),
      conversation: converation_obj,
    };

    if (body.type === "template" && body.template) {
      message_value.template = { ...body.template };
    }

    await req.redisManager.putByKey(messaage_key, message_value);
    try {
      const io = getIO();
      const topic = `message/whatsapp/${body.to}`;
      io.to(topic).emit("topic-data", {
        topic,
        data: message_value,
        timestamp: new Date(),
      });
    } catch (error) {
      console.log("Error emitting socket event:", error);
    }

    // Handle delayed status updates
    if (customStatusConfig && customStatusConfig.delayStatus) {
      const sendDelayedStatus = async (status, delayTime) => {
        setTimeout(async () => {
          try {
            // Update status in Redis
            const messageData =
              await req.redisManager.getValuesByPattern(message_key);
            if (messageData.length > 0) {
              const message = JSON.parse(messageData[0].value);
              message.status = status;
              if (status === "read") {
                message.read_at = new Date().toISOString();
              } else if (status === "delivered") {
                message.delivered_at = new Date().toISOString();
              }
              await req.redisManager.putByKey(message_key, message, -1);

              // Send webhook
              const statusWebhook = {
                object: "whatsapp_business_account",
                entry: [
                  {
                    id: wba_id,
                    changes: [
                      {
                        value: {
                          messaging_product: "whatsapp",
                          metadata: {
                            display_phone_number: dynamic_value,
                            phone_number_id: dynamic_value,
                          },
                          statuses: [
                            {
                              id: msg_id,
                              status: status,
                              timestamp: Math.floor(
                                Date.now() / 1000,
                              ).toString(),
                              recipient_id: body.to,
                            },
                          ],
                        },
                        field: "messages",
                      },
                    ],
                  },
                ],
              };
              await req.redisStreamManager.sendMessage({
                type: "WEBHOOK",
                payload: statusWebhook,
                delay: delayTime, // seconds
              });

              // Emit socket event
              try {
                const io = getIO();
                const topic = `message/whatsapp/${body.to}`;
                io.to(topic).emit("topic-data", {
                  topic,
                  data: message,
                  timestamp: new Date(),
                });
              } catch (ioError) {
                console.log("Error emitting delayed socket event:", ioError);
              }
            }
          } catch (error) {
            console.log(`Error sending delayed status ${status}:`, error);
          }
        }, delayTime);
      };

      // Schedule "delivered" status
      sendDelayedStatus(
        customStatusConfig.delayStatus,
        customStatusConfig.delay,
      );

      // Schedule "read" status if configured
      if (customStatusConfig.finalStatus) {
        sendDelayedStatus(
          customStatusConfig.finalStatus,
          customStatusConfig.delay * 2,
        );
      }
    }

    // const wba_id = client[0].key.split(":")[1];
    // const wa_id = client[0].key.split(":")[3];
    // const phone_number_id = client[0].key.split(":")[2];
    // const client_data = client[0].value;
    // const result = await req.redisStreamManager.sendMessage({
    //   type: "MESSAGE",
    //   payload: data,
    // });

    return res.json(data);
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.put("/:dynamic_value/messages", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "phone_number_id") {
    const data = {
      success: true,
    };
    return res.json(data);
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.post("/:dynamic_value/subscribed_apps", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "whatsapp_business_account_id") {
    console.log("DATA", body);
    const data = {
      success: true,
    };
    return res.json(data);
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.get("/:dynamic_value/subscribed_apps", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "whatsapp_business_account_id") {
    const data = {
      data: [
        {
          whatsapp_business_api_data: {
            link: "<APP1_LINK>",
            name: "<APP1_NAME>",
            id: "7234002551525653",
          },
        },
        {
          whatsapp_business_api_data: {
            link: "<APP2_LINK>",
            name: "<APP2_LINK>",
            id: "3736565603394103",
          },
        },
      ],
    };
    return res.json(data);
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.delete("/:dynamic_value/subscribed_apps", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "whatsapp_business_account_id") {
    const data = {
      success: true,
    };
    return res.json(data);
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.post("/:dynamic_value/media", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "phone_number_id") {
    const data = {
      id: "164490709327384033",
    };
    return res.json(data);
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.post("/:dynamic_value/flows", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "whatsapp_business_account_id") {
    const data = {
      data: [
        {
          name: "NEKHOP",
          status: "DRAFT",
          categories: ["SURVEY"],
          validation_errors: [],
          id: "1161643762281675",
        },
        {
          name: "onboarding",
          status: "PUBLISHED",
          categories: ["SIGN_UP"],
          validation_errors: [],
          id: "1372735903682123",
        },
        {
          name: "GZAUSDBOaWhnUTBZAbTZAIam80Q1hxcy0yWTVPZAHRXdVUtTzhOQnpmbWh4LVZA0WFhTQU5NUmxmNFNTZAC1ud1VFQXBn",
          after:
            "QVFIUlk5VkRTWGkyYU5BVEpOYkZAzQS04ODRQaklYdGtvVUEwNDJNLV93NXMyM0NfZAFFMOFp3S2FDdkVOTkN5VEFwcEYwNnlwVnl6VkNoRmRUUzRZATnpkemln",
        },
      ],
    };
    return res.json(data);
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.get("/:dynamic_value/payment_configurations", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "whatsapp_business_account_id") {
    const data = {
      data: [
        {
          payment_configurations: [
            {
              configuration_name: "NekhopGpay",
              merchant_category_code: {
                code: "8999",
                description: "Professional services not elsewhere classified",
              },
              purpose_code: { code: "11", description: "Global UPI" },
              status: "Active",
              merchant_vpa: "imthiyazan@okhdfcbank",
              created_timestamp: 1738141024,
              updated_timestamp: 1738141024,
            },
            {
              configuration_name: "Gpay",
              merchant_category_code: {
                code: "5734",
                description: "Computer software outlets",
              },
              purpose_code: { code: "11", description: "Global UPI" },
              status: "Active",
              merchant_vpa: "subramani6202@icici",
              created_timestamp: 1738140775,
              updated_timestamp: 1738140775,
            },
            {
              configuration_name: "payment_config_test",
              merchant_category_code: {
                code: "0000",
                description: "Test MCC Code",
              },
              purpose_code: { code: "00", description: "Test Purpose Code" },
              status: "Active",
              provider_mid: "acc_JoixWHb9AlWTpt",
              provider_name: "Razorpay",
              created_timestamp: 1736513050,
              updated_timestamp: 1736513218,
            },
          ],
        },
      ],
    };
    return res.json(data);
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.get("/:dynamic_value/products", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "whatsapp_business_account_id") {
    const data = {
      data: [
        {
          payment_configurations: [
            {
              configuration_name: "NekhopGpay",
              merchant_category_code: {
                code: "8999",
                description: "Professional services not elsewhere classified",
              },
              purpose_code: { code: "11", description: "Global UPI" },
              status: "Active",
              merchant_vpa: "imthiyazan@okhdfcbank",
              created_timestamp: 1738141024,
              updated_timestamp: 1738141024,
            },
            {
              configuration_name: "Gpay",
              merchant_category_code: {
                code: "5734",
                description: "Computer software outlets",
              },
              purpose_code: { code: "11", description: "Global UPI" },
              status: "Active",
              merchant_vpa: "subramani6202@icici",
              created_timestamp: 1738140775,
              updated_timestamp: 1738140775,
            },
            {
              configuration_name: "payment_config_test",
              merchant_category_code: {
                code: "0000",
                description: "Test MCC Code",
              },
              purpose_code: { code: "00", description: "Test Purpose Code" },
              status: "Active",
              provider_mid: "acc_JoixWHb9AlWTpt",
              provider_name: "Razorpay",
              created_timestamp: 1736513050,
              updated_timestamp: 1736513218,
            },
          ],
        },
      ],
    };
    return res.json(data);
  } else if (valueType === "catalog_id") {
    const catalog_key = `catalog:${req.params.dynamic_value}`;
    //const catalog = await redis.get(catalog_key);

    const catalog = await req.redisManager.getByKey(catalog_key);
    let products = [];
    if (catalog) {
      products = catalog.products || [];
      return res.json({ data: products });
    }

    res.status(200).json({
      data: products,
      paging: {
        cursors: {
          before:
            "QVFIUi01VWt1cE9oRm8zaXhmRzhoTW1FQnNpWTdkNnV6MW1ZASUJBWWIxeFdzcHZAvVW85cE5rS05abVRXT0YxanBKRU1oRWtGdW93Q2t6ajFVZAzBUbE43R1Fn",
          after:
            "QVFIUnZADYkNpNTZAJVE5uOUFibGZAWamJKOUUyUlU4LUlOQ2dWQWRZAdGkwUzZANQW9VSGFKclNIM3JjNUtqM01vT2t1VGtRenRUS2x1aEpCUFVFTHVZAcEJSZAVF3",
        },
        next: "https://graph.facebook.com/v21.0/468166506023280/products?fields=id,retailer_id,name,title,description,availability,condition,price,url,image_url,brand,product_catalog&limit=25&after=QVFIUnZADYkNpNTZAJVE5uOUFibGZAWamJKOUUyUlU4LUlOQ2dWQWRZAdGkwUzZANQW9VSGFKclNIM3JjNUtqM01vT2t1VGtRenRUS2x1aEpCUFVFTHVZAcEJSZAVF3",
        previous:
          "https://graph.facebook.com/v21.0/468166506023280/products?fields=id,retailer_id,name,title,description,availability,condition,price,url,image_url,brand,product_catalog&limit=25&before=QVFIUi01VWt1cE9oRm8zaXhmRzhoTW1FQnNpWTdkNnV6MW1ZASUJBWWIxeFdzcHZAvVW85cE5rS05abVRXT0YxanBKRU1oRWtGdW93Q2t6ajFVZAzBUbE43R1Fn",
      },
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.get("/:dynamic_value/product_sets", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "whatsapp_business_account_id") {
    // https://developers.facebook.com/docs/marketing-api/reference/product-catalog/product_sets/
    const data = {
      data: [],
      paging: {},
      summary: {},
    };

    return res.json(data);
  } else if (valueType === "catalog_id") {
    const catalog_set_key = `catalog_set:${req.params.dynamic_value}`;
    //const catalog = await redis.get(catalog_key);

    const catalog_sets = await req.redisManager.getByKey(catalog_set_key);
    let products = [];
    if (catalog_sets) {
      products = catalog_sets.products || [];
      return res.json({ data: products });
    }

    res.status(200).json({
      data: products,
      paging: {
        cursors: {
          before:
            "QVFIUi01VWt1cE9oRm8zaXhmRzhoTW1FQnNpWTdkNnV6MW1ZASUJBWWIxeFdzcHZAvVW85cE5rS05abVRXT0YxanBKRU1oRWtGdW93Q2t6ajFVZAzBUbE43R1Fn",
          after:
            "QVFIUnZADYkNpNTZAJVE5uOUFibGZAWamJKOUUyUlU4LUlOQ2dWQWRZAdGkwUzZANQW9VSGFKclNIM3JjNUtqM01vT2t1VGtRenRUS2x1aEpCUFVFTHVZAcEJSZAVF3",
        },
        next: "https://graph.facebook.com/v21.0/468166506023280/products?fields=id,retailer_id,name,title,description,availability,condition,price,url,image_url,brand,product_catalog&limit=25&after=QVFIUnZADYkNpNTZAJVE5uOUFibGZAWamJKOUUyUlU4LUlOQ2dWQWRZAdGkwUzZANQW9VSGFKclNIM3JjNUtqM01vT2t1VGtRenRUS2x1aEpCUFVFTHVZAcEJSZAVF3",
        previous:
          "https://graph.facebook.com/v21.0/468166506023280/products?fields=id,retailer_id,name,title,description,availability,condition,price,url,image_url,brand,product_catalog&limit=25&before=QVFIUi01VWt1cE9oRm8zaXhmRzhoTW1FQnNpWTdkNnV6MW1ZASUJBWWIxeFdzcHZAvVW85cE5rS05abVRXT0YxanBKRU1oRWtGdW93Q2t6ajFVZAzBUbE43R1Fn",
      },
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.get("/:dynamic_value/whatsapp_commerce_settings", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "phone_number_id") {
    // https://developers.facebook.com/docs/marketing-api/reference/product-catalog/product_sets/
    const data = { success: true };

    return res.json(data);
  } else if (valueType === "catalog_id") {
    const catalog_key = `catalog:${req.params.dynamic_value}`;
    const catalog = await req.redisManager.getByKey(catalog_key);

    let products = [];
    if (catalog) {
      products = catalog.products || [];
    }

    res.status(200).json({
      data: products,
      paging: {
        cursors: {
          before:
            "QVFIUi01VWt1cE9oRm8zaXhmRzhoTW1FQnNpWTdkNnV6MW1ZASUJBWWIxeFdzcHZAvVW85cE5rS05abVRXT0YxanBKRU1oRWtGdW93Q2t6ajFVZAzBUbE43R1Fn",
          after:
            "QVFIUnZADYkNpNTZAJVE5uOUFibGZAWamJKOUUyUlU4LUlOQ2dWQWRZAdGkwUzZANQW9VSGFKclNIM3JjNUtqM01vT2t1VGtRenRUS2x1aEpCUFVFTHVZAcEJSZAVF3",
        },
        next: "https://graph.facebook.com/v21.0/468166506023280/products?fields=id,retailer_id,name,title,description,availability,condition,price,url,image_url,brand,product_catalog&limit=25&after=QVFIUnZADYkNpNTZAJVE5uOUFibGZAWamJKOUUyUlU4LUlOQ2dWQWRZAdGkwUzZANQW9VSGFKclNIM3JjNUtqM01vT2t1VGtRenRUS2x1aEpCUFVFTHVZAcEJSZAVF3",
        previous:
          "https://graph.facebook.com/v21.0/468166506023280/products?fields=id,retailer_id,name,title,description,availability,condition,price,url,image_url,brand,product_catalog&limit=25&before=QVFIUi01VWt1cE9oRm8zaXhmRzhoTW1FQnNpWTdkNnV6MW1ZASUJBWWIxeFdzcHZAvVW85cE5rS05abVRXT0YxanBKRU1oRWtGdW93Q2t6ajFVZAzBUbE43R1Fn",
      },
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.post("/:dynamic_value/whatsapp_commerce_settings", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "phone_number_id") {
    // https://developers.facebook.com/docs/marketing-api/reference/product-catalog/product_sets/
    const data = { success: true };

    return res.json(data);
  } else if (valueType === "catalog_id") {
    res.status(200).json({
      success: true,
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

// GET /:dynamic_value/product_catalogs - Retrieve connected catalogs
router.get("/:dynamic_value/owned_product_catalogs", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "whatsapp_business_account_id") {
    res.json({
      data: [
        {
          vertical: "commerce",
          name: "KWIC Plan Catalog",
          product_count: 5,
          id: "653476411028390",
        },
        {
          vertical: "commerce",
          name: "Electronics Store Catalog",
          product_count: 12,
          id: "170000000002",
        },
        {
          vertical: "commerce",
          name: "Fashion & Apparel Collection",
          product_count: 28,
          id: "170000000003",
        },
        {
          vertical: "commerce",
          name: "Home & Garden Essentials",
          product_count: 15,
          id: "170000000004",
        },
        {
          vertical: "commerce",
          name: "Sports & Fitness Gear",
          product_count: 9,
          id: "170000000005",
        },
      ],
    });
  } else if (valueType === "FB_BUSINESS_ID") {
    const business_account_id = req.params.dynamic_value;
    const catalogs = await req.redisManager.getByKey(
      `business-account-catalogs:${business_account_id}`,
    );
    res.json({
      data: catalogs,
      paging: {
        cursors: {
          before: "MAZDZD",
          after: "MjQZD",
        },
      },
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

// POST /:dynamic_value/product_catalogs - Connect a catalog to WBA
router.post("/:dynamic_value/product_catalogs", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "whatsapp_business_account_id") {
    const { catalog_id } = req.body;

    if (!catalog_id) {
      return res
        .status(400)
        .json({ error: "Missing required parameter: catalog_id" });
    }

    res.json({ success: true });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

// DELETE /:dynamic_value/product_catalogs - Disconnect a catalog from WBA
router.delete("/:dynamic_value/product_catalogs", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "whatsapp_business_account_id") {
    res.json({ success: true });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.get("/:dynamic_value/message_templates", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;
  if (valueType === "phone_number_id") {
    // https://developers.facebook.com/docs/marketing-api/reference/product-catalog/product_sets/
    const data = { success: true };

    return res.json(data);
  } else if (valueType === "whatsapp_business_account_id") {
    res.status(200).json({
      data: [
        {
          name: "order_delivery_update",
          components: [
            {
              type: "HEADER",
              format: "LOCATION",
            },
            {
              type: "BODY",
              text: "Good news {{1}}! Your order #{{2}} is on its way to the location above. Thank you for your order!",
              example: {
                body_text: [["Mark", "566701"]],
              },
            },
            {
              type: "FOOTER",
              text: "To stop receiving delivery updates, tap the button below.",
            },
            {
              type: "BUTTONS",
              buttons: [
                {
                  type: "QUICK_REPLY",
                  text: "Stop Delivery Updates",
                },
              ],
            },
          ],
          language: "en_US",
          status: "APPROVED",
          category: "UTILITY",
          id: "1667192013751005",
        },
      ],
      paging: {
        cursors: {
          before: "MAZDZD",
          after: "MjQZD",
        },
      },
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.post("/:dynamic_value/message_templates", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);

  const { dynamic_value } = req.params;

  const body = req.body;
  if (valueType === "phone_number_id") {
    // https://developers.facebook.com/docs/marketing-api/reference/product-catalog/product_sets/
    const data = {
      success: true,
    };
    return res.json(data);
  } else if (valueType === "whatsapp_business_account_id") {
    // https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/message_templates/
    const id = IdGenerator.generateTemplateId();
    const key = `template:${dynamic_value}:${id}`;
    await req.redisManager.putByKey(
      key,
      {
        id: id,
        data: body,
        status: "PENDING",
        category: "MARKETING",
      },
      -1,
    );

    res.status(200).json({
      id: id,
      status: "PENDING",
      category: "MARKETING",
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

router.delete("/:dynamic_value/message_templates", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const body = req.body;

  if (valueType === "phone_number_id") {
    // https://developers.facebook.com/docs/marketing-api/reference/product-catalog/product_sets/
    const data = { success: true };

    return res.json(data);
  } else if (valueType === "whatsapp_business_account_id") {
    // Delete Templates from meessage template
    res.status(200).json({
      success: true,
    });
  } else {
    res.status(400).json({ error: `Invalid value type for ${valueType}` });
  }
});

// More routes as per your requirements...

// Simulate POST <file_upload_id>

router.post("/upload::dynamic_value", async (req, res) => {
  // File name validator
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const contentType = req.query["file_type"];
  if (!contentType || !allowedTypes.includes(contentType)) {
    return res.status(400).json({ error: "Invalid content type" });
  }
  const fileName = req.query["file_name"].replace(/[^a-z0-9.]/gi, "_");
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    res.json({
      h: PUBLIC_BASE_URL + "/files/" + fileName,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Upload failed");
  }
});

// Simulate GET <common>
router.get("/:dynamic_value", async (req, res) => {
  const queryParams = req.query;
  const valueType = identifyType(req.params.dynamic_value);

  // Handle ad campaign
  if (valueType === "ad_campaign_id") {
    const campaignKey = `campaign:*:${req.params.dynamic_value}`;
    const campaigns = await req.redisManager.getValuesByPattern(campaignKey);

    if (campaigns.length === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const campaign = JSON.parse(campaigns[0].value);
    const fields = req.query.fields ? req.query.fields.split(",") : null;

    if (fields) {
      const response = { id: campaign.id };
      fields.forEach((field) => {
        if (campaign[field]) response[field] = campaign[field];
      });
      return res.json(response);
    }

    return res.json(campaign);
  }

  // Handle ad set
  if (valueType === "ad_set_id") {
    const adSetKey = `adset:*:${req.params.dynamic_value}`;
    const adSets = await req.redisManager.getValuesByPattern(adSetKey);

    if (adSets.length === 0) {
      return res.status(404).json({ error: "Ad set not found" });
    }

    const adSet = JSON.parse(adSets[0].value);
    const fields = req.query.fields ? req.query.fields.split(",") : null;

    if (fields) {
      const response = { id: adSet.id };
      fields.forEach((field) => {
        if (adSet[field]) response[field] = adSet[field];
      });
      return res.json(response);
    }

    return res.json(adSet);
  }

  // Handle ad creative
  if (valueType === "ad_creative_id") {
    const creativeKey = `adcreative:*:${req.params.dynamic_value}`;
    const creatives = await req.redisManager.getValuesByPattern(creativeKey);

    if (creatives.length === 0) {
      return res.status(404).json({ error: "Ad creative not found" });
    }

    const creative = JSON.parse(creatives[0].value);
    const fields = req.query.fields ? req.query.fields.split(",") : null;

    if (fields) {
      const response = { id: creative.id };
      fields.forEach((field) => {
        if (field.includes("{")) {
          const parts = field.split("{");
          const mainField = parts[0];
          if (creative[mainField]) {
            response[mainField] = creative[mainField];
          }
        } else if (creative[field]) {
          response[field] = creative[field];
        }
      });
      return res.json(response);
    }

    return res.json(creative);
  }

  // Handle ad
  if (valueType === "ad_id") {
    const adKey = `ad:*:${req.params.dynamic_value}`;
    const ads = await req.redisManager.getValuesByPattern(adKey);

    if (ads.length === 0) {
      return res.status(404).json({ error: "Ad not found" });
    }

    const ad = JSON.parse(ads[0].value);
    const fields = req.query.fields ? req.query.fields.split(",") : null;

    if (fields) {
      const response = { id: ad.id };
      fields.forEach((field) => {
        if (ad[field]) response[field] = ad[field];
      });
      return res.json(response);
    }

    return res.json(ad);
  }

  // Handle Flow ID requests - check if it's a valid flow ID
  const flowsData = getFlowsData();
  const flow = flowsData.flows.find((f) => f.id === req.params.dynamic_value);
  if (flow) {
    let response = { ...flow };
    if (queryParams.fields) {
      const requestedFields = queryParams.fields.split(",");
      const filteredResponse = {};
      requestedFields.forEach((field) => {
        if (flow[field] !== undefined) {
          filteredResponse[field] = flow[field];
        }
      });
      response = filteredResponse;
    }
    return res.json(response);
  }
  if (valueType === "media_id") {
    const mediaData = await req.redisManager.getByKey(
      `media:${req.params.dynamic_value}`,
    );
    if (mediaData) {
      mediaData.url = mediaData.url.replace(
        "https://wb.nekhop.com",
        MEDIA_BASE_URL,
      );

      return res.json(mediaData);
    }
    return res.json({
      messaging_product: "whatsapp",
      url: "https://static.kwic.in/nml/app/674ff1a5b90ae6db773e56d2.jpg",
      mime_type: "image/jpeg",
      sha256:
        "d5642bca4cdc2347b1450d83d776c6901a19be81d1db7a42b706ec2aaed944e9",
      file_size: "314107",
      id: req.params.dynamic_value,
    });
  } else if (valueType === "phone_number_id") {
    if (queryParams?.fields == "conversational_automation") {
      return res.json({
        conversational_automation: {
          prompts: ["Kwic", "Products"],
          commands: [
            {
              command_name: "kwic",
              command_description: "Get Product Information",
            },
          ],
          enable_welcome_message: false,
          id: "900733182162109",
        },
        id: "103154992420791",
      });
    }

    const key = `whatsapp:*:${req.params.dynamic_value}`;
    const lists = await req.redisManager.getKeysByPattern(key);

    if (lists.length === 0) {
      return res.status(404).json({
        verified_name: "Jasper's Market",
        display_phone_number: "+1 631-555-5555",
        id: "1906385232743451",
        quality_rating: "GREEN",
      });
    }
    const data = await req.redisManager.getByKey(lists[0]);
    return res.json(data);
  } else if (valueType === "template_id") {
    return res.json({
      template_id: req.params.dynamic_value,
      content: `Template Content for ${req.params.dynamic_value}`,
    });
  } else if (valueType === "file_upload_id") {
    return res.json({
      data: {
        h: generateCustomId(`${Date.now()}-${originalname}.jpeg`),
      },
    });
  } else if (valueType === "flow_id") {
    const flowsData = getFlowsData();
    const flow = flowsData.flows.find((f) => f.id === req.params.dynamic_value);
    if (!flow) {
      return res.status(404).json({ error: "Flow not found" });
    }

    let response = { ...flow };
    if (queryParams.fields) {
      const requestedFields = queryParams.fields.split(",");
      const filteredResponse = {};
      requestedFields.forEach((field) => {
        if (flow[field] !== undefined) {
          filteredResponse[field] = flow[field];
        }
      });
      response = filteredResponse;
    }
    return res.json(response);
  } else if (valueType === "whatsapp_business_account_id") {
    // get whatsapp business account

    const wbaData = await req.redisManager.getByKey(
      `whatsapp-account:${req.params.dynamic_value}`,
    );
    if (wbaData) {
      return res.json(wbaData);
    }

    if (queryParams?.fields) {
      return res.status(200).json({
        conversation_analytics: {
          data: [
            {
              data_points: [
                {
                  start: 1739385000,
                  end: 1739471400,
                  conversation: 2,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1739385000,
                  end: 1739471400,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "FREE_ENTRY_POINT",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1739385000,
                  end: 1739471400,
                  conversation: 2,
                  phone_number: "917667554692",
                  conversation_type: "REGULAR",
                  conversation_direction: "UNKNOWN",
                  cost: 0.0121,
                },
                {
                  start: 1739298600,
                  end: 1739385000,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1739298600,
                  end: 1739385000,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "REGULAR",
                  conversation_direction: "UNKNOWN",
                  cost: 0.0107,
                },
                {
                  start: 1739212200,
                  end: 1739298600,
                  conversation: 3,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1739557800,
                  end: 1739644200,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1739471400,
                  end: 1739557800,
                  conversation: 2,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1738607400,
                  end: 1738693800,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1738607400,
                  end: 1738693800,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "REGULAR",
                  conversation_direction: "UNKNOWN",
                  cost: 0.0107,
                },
                {
                  start: 1738521000,
                  end: 1738607400,
                  conversation: 2,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1738521000,
                  end: 1738607400,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "REGULAR",
                  conversation_direction: "UNKNOWN",
                  cost: 0.0107,
                },
                {
                  start: 1738434600,
                  end: 1738521000,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1738434600,
                  end: 1738521000,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "REGULAR",
                  conversation_direction: "UNKNOWN",
                  cost: 0.0014,
                },
                {
                  start: 1738866600,
                  end: 1738953000,
                  conversation: 3,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1738866600,
                  end: 1738953000,
                  conversation: 3,
                  phone_number: "917667554692",
                  conversation_type: "REGULAR",
                  conversation_direction: "UNKNOWN",
                  cost: 0.0321,
                },
                {
                  start: 1738780200,
                  end: 1738866600,
                  conversation: 2,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1738780200,
                  end: 1738866600,
                  conversation: 2,
                  phone_number: "917667554692",
                  conversation_type: "FREE_ENTRY_POINT",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1738780200,
                  end: 1738866600,
                  conversation: 3,
                  phone_number: "917667554692",
                  conversation_type: "REGULAR",
                  conversation_direction: "UNKNOWN",
                  cost: 0.0321,
                },
                {
                  start: 1738693800,
                  end: 1738780200,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1738693800,
                  end: 1738780200,
                  conversation: 3,
                  phone_number: "917667554692",
                  conversation_type: "REGULAR",
                  conversation_direction: "UNKNOWN",
                  cost: 0.0228,
                },
                {
                  start: 1738348200,
                  end: 1738434600,
                  conversation: 4,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1738348200,
                  end: 1738434600,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "REGULAR",
                  conversation_direction: "UNKNOWN",
                  cost: 0.0107,
                },
                {
                  start: 1739125800,
                  end: 1739212200,
                  conversation: 2,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1739039400,
                  end: 1739125800,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1739817000,
                  end: 1739903400,
                  conversation: 2,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
                {
                  start: 1739817000,
                  end: 1739903400,
                  conversation: 2,
                  phone_number: "917667554692",
                  conversation_type: "REGULAR",
                  conversation_direction: "UNKNOWN",
                  cost: 0.0028,
                },
                {
                  start: 1739730600,
                  end: 1739817000,
                  conversation: 1,
                  phone_number: "917667554692",
                  conversation_type: "FREE_TIER",
                  conversation_direction: "UNKNOWN",
                  cost: 0,
                },
              ],
            },
          ],
        },
        id: "101522485919782",
      });
    } else {
      return res
        .status(400)
        .json({ error: `Invalid value type for ${valueType}` });
    }
  } else if (valueType === "file_upload_id") {
  }

  return res.status(400).json({ error: `Invalid value type for ${valueType}` });
});

router.delete("/:dynamic_value", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType === "media_id") {
    res.json({
      success: true,
    });
  }
  return res.status(400).json({ error: `Invalid value type for ${valueType}` });
});

// Click to WhatsApp Ads Endpoints

// Step 1: Create an ad campaign
router.post("/:dynamic_value/campaigns", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType !== "ad_account_id") {
    return res.status(400).json({ error: "Invalid ad account ID" });
  }

  const { name, objective, special_ad_categories, status } = req.body;

  if (!name || !objective || special_ad_categories === undefined) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const campaignId = "19" + generateUniqueId();
  const campaignKey = `campaign:${req.params.dynamic_value}:${campaignId}`;

  await req.redisManager.putByKey(
    campaignKey,
    {
      id: campaignId,
      name,
      objective,
      special_ad_categories,
      status: status || "PAUSED",
      created_at: new Date().toISOString(),
    },
    -1,
  );

  res.json({ id: campaignId });
});

// Update campaign, ad set, ad creative, or ad
router.post("/:dynamic_value", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);

  if (valueType === "ad_campaign_id") {
    const campaignKey = `campaign:*:${req.params.dynamic_value}`;
    const campaigns = await req.redisManager.getValuesByPattern(campaignKey);

    if (campaigns.length === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const campaign = JSON.parse(campaigns[0].value);
    const updatedCampaign = {
      ...campaign,
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    await req.redisManager.putByKey(campaigns[0].key, updatedCampaign, -1);
    return res.json({ success: true });
  }

  if (valueType === "ad_set_id") {
    const adSetKey = `adset:*:${req.params.dynamic_value}`;
    const adSets = await req.redisManager.getValuesByPattern(adSetKey);

    if (adSets.length === 0) {
      return res.status(404).json({ error: "Ad set not found" });
    }

    const adSet = JSON.parse(adSets[0].value);
    const updatedAdSet = {
      ...adSet,
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    await req.redisManager.putByKey(adSets[0].key, updatedAdSet, -1);
    return res.json({ success: true });
  }

  if (valueType === "ad_creative_id") {
    const creativeKey = `adcreative:*:${req.params.dynamic_value}`;
    const creatives = await req.redisManager.getValuesByPattern(creativeKey);

    if (creatives.length === 0) {
      return res.status(404).json({ error: "Ad creative not found" });
    }

    const creative = JSON.parse(creatives[0].value);
    const updatedCreative = {
      ...creative,
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    await req.redisManager.putByKey(creatives[0].key, updatedCreative, -1);
    return res.json({ success: true });
  }

  if (valueType === "ad_id") {
    const adKey = `ad:*:${req.params.dynamic_value}`;
    const ads = await req.redisManager.getValuesByPattern(adKey);

    if (ads.length === 0) {
      return res.status(404).json({ error: "Ad not found" });
    }

    const ad = JSON.parse(ads[0].value);
    const updatedAd = {
      ...ad,
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    await req.redisManager.putByKey(ads[0].key, updatedAd, -1);
    return res.json({ success: true });
  }
  if (valueType === "file_upload_id") {
    return res.json({
      data: {
        h: generateCustomId(`${Date.now()}-${originalname}.jpeg`),
      },
    });
  }
  return res.status(400).json({ error: `Invalid value type for ${valueType}` });
});

// Step 2: Create an ad set
router.post("/:dynamic_value/adsets", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType !== "ad_account_id") {
    return res.status(400).json({ error: "Invalid ad account ID" });
  }

  const {
    name,
    campaign_id,
    billing_event,
    destination_type,
    optimization_goal,
    promoted_object,
    targeting,
    status,
    daily_budget,
    lifetime_budget,
    start_time,
    end_time,
    bid_amount,
    bid_strategy,
  } = req.body;

  if (
    !name ||
    !campaign_id ||
    !billing_event ||
    !destination_type ||
    !optimization_goal ||
    !promoted_object ||
    !targeting
  ) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  if (!daily_budget && !lifetime_budget) {
    return res
      .status(400)
      .json({ error: "Either daily_budget or lifetime_budget is required" });
  }

  const adSetId = "20" + generateUniqueId();
  const adSetKey = `adset:${req.params.dynamic_value}:${adSetId}`;

  await req.redisManager.putByKey(
    adSetKey,
    {
      id: adSetId,
      name,
      campaign_id,
      billing_event,
      destination_type,
      optimization_goal,
      promoted_object,
      targeting,
      status: status || "PAUSED",
      daily_budget,
      lifetime_budget,
      start_time,
      end_time,
      bid_amount,
      bid_strategy,
      created_at: new Date().toISOString(),
    },
    -1,
  );

  res.json({ id: adSetId });
});

// Step 3: Create an ad creative
router.post("/:dynamic_value/adcreatives", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType !== "ad_account_id") {
    return res.status(400).json({ error: "Invalid ad account ID" });
  }

  const {
    name,
    object_story_spec,
    degrees_of_freedom_spec,
    source_instagram_media_id,
    instagram_user_id,
    object_id,
    call_to_action,
    asset_feed_spec,
  } = req.body;

  if (!object_story_spec && !source_instagram_media_id) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const creativeId = "21" + generateUniqueId();
  const creativeKey = `adcreative:${req.params.dynamic_value}:${creativeId}`;

  await req.redisManager.putByKey(
    creativeKey,
    {
      id: creativeId,
      name,
      object_story_spec,
      degrees_of_freedom_spec,
      source_instagram_media_id,
      instagram_user_id,
      object_id,
      call_to_action,
      asset_feed_spec,
      created_at: new Date().toISOString(),
    },
    -1,
  );

  res.json({ id: creativeId });
});

// Step 4: Create an ad
router.post("/:dynamic_value/ads", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType !== "ad_account_id") {
    return res.status(400).json({ error: "Invalid ad account ID" });
  }

  const { name, adset_id, creative, status } = req.body;

  if (!name || !adset_id || !creative || !status) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const adId = "22" + generateUniqueId();
  const adKey = `ad:${req.params.dynamic_value}:${adId}`;

  // Get campaign_id from adset
  const adSetKey = `adset:*:${adset_id}`;
  const adSets = await req.redisManager.getValuesByPattern(adSetKey);
  let campaign_id = null;
  if (adSets.length > 0) {
    const adSet = JSON.parse(adSets[0].value);
    campaign_id = adSet.campaign_id;
  }

  await req.redisManager.putByKey(
    adKey,
    {
      id: adId,
      name,
      adset_id,
      campaign_id,
      creative,
      status,
      created_at: new Date().toISOString(),
    },
    -1,
  );

  res.json({ id: adId });
});

// --- WhatsApp QR Codes and Short Links Endpoints ---

// Helper to generate a QR Code object
const createQRCodeObject = (code, prefilledMessage) => ({
  code: code,
  prefilled_message: prefilledMessage,
  deep_link_url: `https://wa.me/message/${code}`,
  qr_image_url: `${PUBLIC_BASE_URL}/files/qr_mock_${code}.png`, // Mocked image URL
});

// POST /:phone_number_id/message_qrdls - Create or Update a QR code
router.post("/:dynamic_value/message_qrdls", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const phoneNumberId = req.params.dynamic_value;
  const { prefilled_message, code: existingCode } = req.body;

  if (valueType !== "phone_number_id") {
    return res.status(400).json({ error: "Invalid Phone Number ID" });
  }

  if (existingCode) {
    // UPDATE Logic
    const qrKey = `qr:${phoneNumberId}:${existingCode}`;
    const existingData = await req.redisManager.getByKey(qrKey);

    if (!existingData) {
      return res.status(404).json({ error: "QR code not found" });
    }

    const updatedData = createQRCodeObject(
      existingCode,
      prefilled_message || existingData.prefilled_message,
    );
    await req.redisManager.putByKey(qrKey, updatedData, -1);
    return res.json(updatedData);
  } else {
    // CREATE Logic
    if (!prefilled_message) {
      return res.status(400).json({ error: "prefilled_message is required" });
    }

    // Generate unique alphanumeric code (length 14 as per FB example)
    const uid = new ShortUniqueId({ length: 14, dictionary: "alphanum_upper" });
    const newCode = uid.rnd();

    const qrKey = `qr:${phoneNumberId}:${newCode}`;
    const qrData = createQRCodeObject(newCode, prefilled_message);

    await req.redisManager.putByKey(qrKey, qrData, -1);
    res.json(qrData);
  }
});

// GET /:phone_number_id/message_qrdls - List all QR codes for a phone number
router.get("/:dynamic_value/message_qrdls", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const phoneNumberId = req.params.dynamic_value;

  if (valueType !== "phone_number_id") {
    return res.status(400).json({ error: "Invalid Phone Number ID" });
  }

  const pattern = `qr:${phoneNumberId}:*`;
  const records = await req.redisManager.getValuesByPattern(pattern);

  const data = records.map((r) =>
    typeof r.value === "string" ? JSON.parse(r.value) : r.value,
  );

  res.json({ data });
});

// GET /:phone_number_id/message_qrdls/:qr_code_id - Get a specific QR code
router.get("/:dynamic_value/message_qrdls/:qr_code_id", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const phoneNumberId = req.params.dynamic_value;
  const qrCodeId = req.params.qr_code_id;

  if (valueType !== "phone_number_id") {
    return res.status(400).json({ error: "Invalid Phone Number ID" });
  }

  const qrKey = `qr:${phoneNumberId}:${qrCodeId}`;
  const qrData = await req.redisManager.getByKey(qrKey);

  if (!qrData) {
    return res.status(404).json({ error: "QR code not found" });
  }

  res.json(qrData);
});

// DELETE /:phone_number_id/message_qrdls/:qr_code_id - Delete a QR code
router.delete("/:dynamic_value/message_qrdls/:qr_code_id", async (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  const phoneNumberId = req.params.dynamic_value;
  const qrCodeId = req.params.qr_code_id;

  if (valueType !== "phone_number_id") {
    return res.status(400).json({ error: "Invalid Phone Number ID" });
  }

  const qrKey = `qr:${phoneNumberId}:${qrCodeId}`;
  const existing = await req.redisManager.getByKey(qrKey);

  if (!existing) {
    return res.status(404).json({ error: "QR code not found" });
  }

  await req.redisManager.redisClient.del(qrKey);

  res.json({ success: true });
});

// GET /message_template_library or /:dynamic_value/message_template_library
const getMessageTemplateLibrary = (req, res) => {
  const { category, topic, language } = req.query;

  // Exact mock data as requested by the user
  const mockTemplates = [
    {
      name: "group_invite_link",
      language: "en",
      category: "UTILITY",
      topic: "GROUP_INVITE_LINK",
      usecase: "GROUP_INVITE_UPON_REQUEST",
      industry: ["E_COMMERCE"],
      body: "Hi {{1}}, your request for {{2}} service from {{3}} was successfully received!\n\nYou can start the service by clicking and joining the group below.\n{{4}}\n\nThank you!",
      body_params: [
        "John",
        "live demo service",
        "ABC consultation",
        "Y2FwaV9ncm91cDoxOTUwNTU1MDA3OToxMjAzNjMyNDQwODgyNzY1NDYZD"
      ],
      body_param_types: ["TEXT", "TEXT", "TEXT", "GROUP_ID"],
      id: "24815161548079300"
    },
    {
      name: "group_invite_link_concise",
      language: "en",
      category: "UTILITY",
      topic: "GROUP_INVITE_LINK",
      usecase: "GROUP_INVITE_UPON_REQUEST",
      industry: ["E_COMMERCE"],
      body: "Your {{1}} request with {{2}} is confirmed. Please join the WhatsApp group to start:\n{{3}} Thank you!",
      body_params: [
        "live demo service",
        "ABC consultation",
        "Y2FwaV9ncm91cDoxOTUwNTU1MDA3OToxMjAzNjMyNDQwODgyNzY1NDYZD"
      ],
      body_param_types: ["TEXT", "TEXT", "GROUP_ID"],
      id: "32074222165509377"
    },
    {
      name: "group_invite_link_detailed",
      language: "en",
      category: "UTILITY",
      topic: "GROUP_INVITE_LINK",
      usecase: "GROUP_INVITE_UPON_REQUEST",
      industry: ["E_COMMERCE"],
      body: "Hi {{1}},\nWe are pleased to inform you that your request for {{2}} from {{3}} has been successfully received.\n\nTo facilitate your session, we have created a dedicated WhatsApp group. Please join the group using the link below to proceed with your request:\n{{4}}\n\nThank you for using our service!",
      body_params: [
        "John",
        "live demo service",
        "ABC consultation",
        "Y2FwaV9ncm91cDoxOTUwNTU1MDA3OToxMjAzNjMyNDQwODgyNzY1NDYZD"
      ],
      body_param_types: ["TEXT", "TEXT", "TEXT", "GROUP_ID"],
      id: "30603657932611250"
    }
  ];

  // Optional filtering based on query params
  let filtered = mockTemplates;

  if (category) {
    const catUpper = category.toUpperCase();
    filtered = filtered.filter(t => t.category === catUpper);
  }

  if (topic) {
    const topicUpper = topic.toUpperCase();
    filtered = filtered.filter(t => t.topic === topicUpper);
  }

  if (language) {
    const langLower = language.toLowerCase();
    filtered = filtered.filter(t => t.language.toLowerCase() === langLower);
  }

  return res.json({
    data: filtered,
    paging: {
      cursors: {
        before: "MAZDZD",
        after: "MgZDZD"
      }
    }
  });
};

router.get("/message_template_library", getMessageTemplateLibrary);
router.get("/:dynamic_value/message_template_library", (req, res) => {
  return getMessageTemplateLibrary(req, res);
});

module.exports = router;
