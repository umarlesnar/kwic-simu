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

const uploadDir = path.join(__dirname, "./../../../uploads");

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:3000";

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

function decodeBase64(base64String) {
  try {
    const jsonString = Buffer.from(base64String, "base64").toString("utf-8"); // Decode Base64 to string
    return JSON.parse(jsonString); // Parse JSON string to object
  } catch (error) {
    console.error("Error decoding Base64:", error);
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
  } else if (value.length > 10 && /^\d+$/.test(value)) {
    return "flow_id";
  } else {
    return "generic_id";
  }
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
  console.log("USER", req.user);
  next();
});

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
        name: "Lead Generation Flow",
        status: "DRAFT",
        categories: ["LEAD_GENERATION"],
        validation_errors: [],
        json_version: "3.0",
        data_api_version: "3.0",
        endpoint_uri: "https://example.com/flow-endpoint",
        preview: {
          preview_url: "https://business.facebook.com/wa/manage/flows/1800000000001/preview/?token=b9d6abc123",
          expires_at: "2024-12-31T23:59:59+0000"
        },
        whatsapp_business_account: {
          id: "1100000001",
          name: "Test Business Account"
        },
        application: {
          id: "1400000001",
          name: "Test App"
        },
        health_status: {
          can_send_message: "BLOCKED",
          entities: [{
            entity_type: "FLOW",
            id: "1800000000001",
            can_send_message: "BLOCKED",
            errors: [{
              error_code: 131000,
              error_description: "endpoint_uri: You need to set the endpoint URI before you can send or publish a flow."
            }]
          }]
        }
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
          preview_url: "https://business.facebook.com/wa/manage/flows/1800000000002/preview/?token=xyz789def",
          expires_at: "2024-12-31T23:59:59+0000"
        },
        whatsapp_business_account: {
          id: "1100000001",
          name: "Test Business Account"
        },
        application: {
          id: "1400000001",
          name: "Test App"
        },
        health_status: {
          can_send_message: "AVAILABLE"
        }
      },
      {
        id: "1800000000003",
        name: "Contact Us Form",
        status: "DRAFT",
        categories: ["CONTACT_US"],
        validation_errors: [{
          error_code: 100001,
          error_description: "Missing required field: phone_number"
        }],
        json_version: "3.0",
        data_api_version: "3.0",
        endpoint_uri: null,
        preview: {
          preview_url: "https://business.facebook.com/wa/manage/flows/1800000000003/preview/?token=contact123",
          expires_at: "2024-12-31T23:59:59+0000"
        },
        whatsapp_business_account: {
          id: "1100000001",
          name: "Test Business Account"
        },
        application: {
          id: "1400000001",
          name: "Test App"
        },
        health_status: {
          can_send_message: "BLOCKED"
        }
      }
    ],
    assets: {
      "1800000000001": [{
        name: "flow_survey_1.json",
        asset_type: "FLOW_JSON",
        download_url: `${PUBLIC_BASE_URL}/files/flow_survey_1.json`
      }],
      "1800000000002": [{
        name: "flow_survey_2.json",
        asset_type: "FLOW_JSON",
        download_url: `${PUBLIC_BASE_URL}/files/flow_survey_2.json`
      }],
      "1800000000003": [{
        name: "flow_survey_3.json",
        asset_type: "FLOW_JSON",
        download_url: `${PUBLIC_BASE_URL}/files/flow_survey_3.json`
      }]
    }
  };
};

// GET /{WABA-ID}/flows - Retrieve list of flows
router.get("/:dynamic_value/flows", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType !== "whatsapp_business_account_id") {
    return res.status(400).json({ error: 'Invalid WABA ID' });
  }
  
  const flowsData = getFlowsData();
  const flows = flowsData.flows.map(flow => ({
    id: flow.id,
    name: flow.name,
    status: flow.status,
    categories: flow.categories,
    validation_errors: flow.validation_errors
  }));
  
  res.json({
    data: flows,
    paging: {
      cursors: {
        before: "QVFI...",
        after: "QVFI..."
      }
    }
  });
});

// GET /{FLOW-ID}/assets - Retrieve flow assets
router.get("/:dynamic_value/assets", (req, res) => {
  const valueType = identifyType(req.params.dynamic_value);
  if (valueType !== "flow_id") {
    return res.status(400).json({ error: 'Invalid Flow ID' });
  }
  
  const flowsData = getFlowsData();
  const assets = flowsData.assets[req.params.dynamic_value] || [];
  
  res.json({
    data: assets,
    paging: {
      cursors: {
        before: "QVFIU...",
        after: "QVFIU..."
      }
    }
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
    const msg_id = "wamid." + generateUniqueId();
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
      `wb:*:${dynamic_value}:client:${body.to}`
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
      `conversation:${dynamic_value}:${body.to}:*`
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

    // Handle order messages
    if (body.type === "order" || body.interactive?.type === "order_details") {
      const orderData = body.interactive?.action || body.order;
      const orderKey = `order:${dynamic_value}:${body.to}:${msg_id}`;
      await req.redisManager.putByKey(orderKey, {
        id: msg_id,
        catalog_id: orderData.catalog_id,
        product_items: orderData.sections?.[0]?.product_items || orderData.product_items,
        created_at: new Date().toISOString()
      });
    }

    const messaage_key = `message:${dynamic_value}:${body.to}:${msg_id}`;
    const message_value = {
      id: msg_id,
      ...body,
      created_at: new Date().toISOString(),
      conversation: converation_obj,
    };

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
      `wb:*:${dynamic_value}:client:${body.to}`
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
      `conversation:${dynamic_value}:${body.to}:*`
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

    const messaage_key = `message:${dynamic_value}:${body.to}:${msg_id}`;
    const message_value = {
      id: msg_id,
      ...body,
      created_at: new Date().toISOString(),
      conversation: converation_obj,
    };

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
      -1
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
  const allowedTypes = ["image/jpeg", "application/pdf"];
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
router.get("/:dynamic_value", (req, res) => {
  const queryParams = req.query;
  const valueType = identifyType(req.params.dynamic_value);

  // Handle Flow ID requests - check if it's a valid flow ID
  const flowsData = getFlowsData();
  const flow = flowsData.flows.find(f => f.id === req.params.dynamic_value);
  if (flow) {
    let response = { ...flow };
    if (queryParams.fields) {
      const requestedFields = queryParams.fields.split(',');
      const filteredResponse = {};
      requestedFields.forEach(field => {
        if (flow[field] !== undefined) {
          filteredResponse[field] = flow[field];
        }
      });
      response = filteredResponse;
    }
    return res.json(response);
  }
  if (valueType === "media_id") {
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
    return res.json({
      verified_name: "Jasper's Market",
      display_phone_number: "+1 631-555-5555",
      id: "1906385232743451",
      quality_rating: "GREEN",
    });
  } else if (valueType === "template_id") {
    return res.json({
      template_id: req.params.dynamic_value,
      content: `Template Content for ${req.params.dynamic_value}`,
    });
  } else if (valueType === "file_upload_id") {
    return res.json({
      data: {
        h: generateCustomId("WhatsApp Image 2025-02-06 at 5.33.23 PM.jpeg"),
      },
    });
  }
  else if (valueType === "flow_id") {
    const flowsData = getFlowsData();
    const flow = flowsData.flows.find(f => f.id === req.params.dynamic_value);
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    let response = { ...flow };
    if (queryParams.fields) {
      const requestedFields = queryParams.fields.split(',');
      const filteredResponse = {};
      requestedFields.forEach(field => {
        if (flow[field] !== undefined) {
          filteredResponse[field] = flow[field];
        }
      });
      response = filteredResponse;
    }
    return res.json(response);
  }
  
  else if (valueType === "whatsapp_business_account_id") {
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



module.exports = router;
