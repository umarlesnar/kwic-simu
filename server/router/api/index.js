const express = require("express");
const ApiRouter = express.Router();
const ShortUniqueId = require("short-unique-id");
const multer = require("multer");
const path = require("path");
const axios = require("axios");
const useragent = require("useragent");
const geoip = require("geoip-lite");
const { body, validationResult } = require("express-validator");
const { getIO } = require("../../utils/ws/SocketManager");
const groupsRouter = require("../v14.0/router/groups");
const { validateJoinGroupByInviteLinkRequest } = require("../v14.0/router/groups/groupValidator");
const { joinGroupByInviteLink } = require("../v14.0/router/groups/groupService");
const { sendErrorResponse } = require("../v14.0/router/groups/errorHandler");
const { HTTP_STATUS, ERROR_MESSAGES } = require("../v14.0/router/groups/constants");
const { emitGroupParticipantsWebhook } = require("../v14.0/router/groups/groupWebhooks");

ApiRouter.use("/", groupsRouter);

const task_url =
  process.env.TASK_API_URL || "https://master-node.nekhop.com/run-task";

const uploadDir = path.join(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Validation middleware for conversation
const validateConversation = [
  body("visitor_id")
    .isString()
    .notEmpty()
    .withMessage("visitor_id is required and must be a string"),
  body("email").isEmail().withMessage("Valid email is required"),
];

// Validation middleware for message
const validateMessage = [
  body("room_id")
    .isString()
    .notEmpty()
    .withMessage("Conversation ID is required"),
  body("message").isString().notEmpty().withMessage("Message is required"),
  body("operator_id")
    .isString()
    .notEmpty()
    .withMessage("Sender ID is required"),
];

// Validation middleware
const validateRequest = [
  body("PHONE_NUMBER_ID")
    .isString()
    .notEmpty()
    .withMessage("PHONE_NUMBER_ID is required and must be a string"),
  body("DISPLAY_PHONE_NUMBER")
    .isString()
    .notEmpty()
    .withMessage("DISPLAY_PHONE_NUMBER is required and must be a string"),
  body("DOWNLOAD_URL").isURL().withMessage("DOWNLOAD_URL must be a valid URL"),
  body("WBA_ID")
    .isString()
    .notEmpty()
    .withMessage("WBA_ID is required and must be a string"),
  body("CONCURRENCY")
    .isInt({ min: 1 })
    .withMessage("CONCURRENCY must be an integer greater than 0"),
  body("REQUEST_DELAY")
    .isInt({ min: 0 })
    .withMessage("REQUEST_DELAY must be an integer 0 or greater"),
  body("WEBHOOK_URL").isURL().withMessage("WEBHOOK_URL must be a valid URL"),
];

const validateProject = [
  body("name")
    .isString()
    .notEmpty()
    .withMessage("Name is required and must be a string"),
  body("ppk")
    .isString()
    .notEmpty()
    .withMessage("ppk is required and must be a string"),
  body("widget_url")
    .isString()
    .notEmpty()
    .withMessage("Widget url is required and must be a string"),
  body("widget_config")
    .isObject()
    .withMessage("Widget Config is required and must be a string"),
];

ApiRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }

    const baseUrl = `https://${req.get("host")}`;
    // const fileUrl = `https://static.kwic.in/nml/app/674ff1a5b90ae6db773e56d2.jpg`;
    const fileUrl = `${baseUrl}/files/${req.file.filename}`;
    const uid = new ShortUniqueId({ length: 15 });
    const mediaId = "15" + uid.rnd();

    const responseBody = {
      id: mediaId,
      url: fileUrl,
      filename: req.file.originalname,
      mime_type: req.file.mimetype,
      size: req.file.size,
    };

    const bXK = {
      messaging_product: "whatsapp",
      url: fileUrl,
      mime_type: req.file.mimetype,
      sha256:
        "d5642bca4cdc2347b1450d83d776c6901a19be81d1db7a42b706ec2aaed944e9",
      file_size: req.file.size,
      id: mediaId,
    };

    await req.redisManager.putByKey(`media:${mediaId}`, bXK, -1);

    res.json({
      success: true,
      data: responseBody,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
});

ApiRouter.post("/publish", async (req, res) => {
  const { action, topic, data } = req.body;
  const io = getIO();
  // Broadcast to topic room
  // wb-cs-data
  // ig-cs-data
  // tg-cs-data

  // wb-msg-data
  // ig-msg-data
  // tg-msg-data

  io.to(topic).emit("topic-data", {
    topic,
    data,
    timestamp: new Date(),
  });
  return res.json({ success: true });
});

ApiRouter.post("/project", validateProject, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { ppk, name, widget_url, widget_config } = req.body;

    const projectExist = await req.redisManager.getByKey(`project:${ppk}`);

    if (projectExist) {
      return res.status(422).json({
        status_code: 422,
        data: {
          ppk: "Ppk aready register",
        },
        message: "Validation Error",
      });
    }

    const uid = new ShortUniqueId({ length: 12 });

    const projectBody = {
      id: uid.rnd(),
      ppk,
      name,
      widget_url,
      widget_config,
    };
    await req.redisManager.putByKey(`project:${ppk}`, projectBody, -1);

    res.json({
      success: true,
      status_code: 200,
      data: {
        project_id: projectBody.id,
      },
      message: "Project Created Successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      status_code: 500,
      data: error,
      message: "server error",
    });
  }
});

ApiRouter.post("/project/update", validateProject, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { ppk, name, widget_url, widget_config } = req.body;

    const projectExist = await req.redisManager.getByKey(`project:${ppk}`);

    if (!projectExist) {
      return res.status(404).json({
        status_code: 404,
        data: {
          ppk: "Project not found",
        },
        message: "Project not found",
      });
    }

    await req.redisManager.putByKey(
      `project:${ppk}`,
      {
        ...projectBody,
        name,
        widget_url,
        widget_config,
      },
      -1,
    );

    res.json({
      success: true,
      status_code: 200,
      data: {
        name,
        widget_url,
        widget_config,
      },
      message: "Project updated Successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      status_code: 500,
      data: error,
      message: "server error",
    });
  }
});

ApiRouter.post("/conversation", validateConversation, async (req, res) => {
  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   return res.status(400).json({ errors: errors.array() });
  // }

  try {
    const { name, email, phone = null, ppk, visitor_id } = req.body;

    const projectExist = await req.redisManager.getByKey(`project:${ppk}`);

    if (!projectExist) {
      return res.status(404).json({
        status_code: 404,
        data: null,
        message: "Project not found",
      });
    }

    const uid = new ShortUniqueId({ length: 12 });
    const room_id = uid.rnd();

    const room = {
      id: room_id,
      ppk,
      email,
      visitor_id,
      createdAt: new Date().toISOString(),
    };

    // Get IP, OS, browser
    const ip = (
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      ""
    )
      .split(",")[0]
      .trim();
    const agent = useragent.parse(req.headers["user-agent"]);
    const os = agent.os.toString();
    const browser = agent.toAgent();

    // Get location
    const geo = geoip.lookup(ip);
    const city = geo?.city || "";
    const country = geo?.country || "";

    await req.redisManager.putByKey(`room:${room_id}`, room, 432000);

    const result = await req.redisStreamManager.sendMessage({
      type: "LIVE_WEBHOOK",
      payload: {
        object: "kwic_live_chat",
        ppk,
        entry: {
          event: "new_conversation",
          payload: {
            ppk: ppk,
            email: email,
            phone: phone,
            name: name,
            visitor_id: visitor_id,
            room_id: room_id,
            ip_address: ip,
            os: os,
            browser: browser,
            city: city,
            country: country,
            timestamp: new Date().toISOString(),
          },
        },
        created_at: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      status_code: 200,
      data: {
        room_id,
      },
      message: "Conversation Created Successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      status_code: 500,
      data: error,
      message: "server error",
    });
  }
});

ApiRouter.post("/conversation/update", async (req, res) => {
  const ppk = req.query.ppk;
  const body = req.body;

  try {
    const projectExist = await req.redisManager.getByKey(`project:${ppk}`);

    if (!projectExist) {
      return res.status(422).json({
        status_code: 422,
        data: null,
        message: "Project Not FOund",
      });
    }

    const io = getIO();
    if (io) {
      const roomID = `operator_${ppk}`;
      io.to(roomID).emit("sessionUpdate", body);
    }

    return res.status(200).json({
      status_code: 200,
      data: null,
      message: "Success",
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      status_code: 500,
      data: error,
      message: "server error",
    });
  }
});

ApiRouter.post("/message/send", validateMessage, async (req, res) => {
  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   return res.status(400).json({ errors: errors.array() });
  // }

  try {
    const {
      room_id,
      message,
      operator_id,
      visitor_id,
      sender_type,
      is_operator_bot,
    } = req.body;
    const uid = new ShortUniqueId({ length: 16 });
    const messageId = uid.rnd();

    const messageData = {
      id: messageId,
      msg_id: messageId,
      room_id,
      operator_id,
      visitor_id,
      message,
      sender_type,
      is_operator_bot,
      status: "sent",
      timestamp: new Date().toISOString(),
      read_at: null,
    };

    await req.redisManager.putByKey(`message:${messageId}`, messageData, -1);

    const visitor = await req.redisManager.getByKey(`visitor:${visitor_id}`);

    if (!visitor) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    // Emit to Socket.IO room
    const io = getIO();
    if (io) {
      const roomID = `room_${room_id}`;
      io.to(roomID).emit("newMessage", messageData);

      if (messageData.message.type !== "info_text") {
        io.to(visitor.socket_id).emit("newMessage", messageData);
      }
    }

    res.status(200).json({
      success: true,
      status_code: 200,
      data: {
        msg_id: messageId,
      },
      message: "Message sent successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      status_code: 500,
      data: error,
      message: "server error",
    });
  }
});

ApiRouter.post("/bot/typing", async (req, res) => {
  try {
    const { room_id, visitor_id, ppk, operator_id, isTyping } = req.body;

    const room = await req.redisManager.getByKey(`room:${room_id}`);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const visitor = await req.redisManager.getByKey(`visitor:${visitor_id}`);

    if (!visitor) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    // Emit to Socket.IO room
    const io = getIO();

    if (io) {
      io.to(visitor.socket_id).emit("operatorTyping", {
        ppk,
        operator_id,
        room_id,
        isTyping,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      status_code: 200,
      data: null,
      message: "success",
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      status_code: 500,
      data: error,
      message: "server error",
    });
  }
});

ApiRouter.post("/message/:messageId/read", async (req, res) => {
  const { messageId } = req.params;

  const messageData = await req.redisManager.getByKey(`message:${messageId}`);
  if (!messageData) {
    return res.status(404).json({ error: "Message not found" });
  }

  const updatedMessage = {
    ...messageData,
    status: "read",
    read_at: new Date().toISOString(),
  };

  await req.redisManager.putByKey(`message:${messageId}`, updatedMessage, -1);

  // Emit read status to Socket.IO room
  const io = getIO();
  if (io) {
    io.to(updatedMessage.room_id).emit("messageRead", {
      msg_id: messageId,
      readAt: updatedMessage.read_at,
    });
  }

  res.json({
    success: true,
    msg_id: messageId,
    readAt: updatedMessage.read_at,
  });
});

ApiRouter.post("/webhook/push", async (req, res) => {
  try {
    const payload = req.body;

    // Always forward to stream (existing behavior)
    await req.redisStreamManager.sendMessage({
      type: "WEBHOOK",
      payload,
    });

    // Persist messages and statuses to Redis so they can be retrieved by
    // GET "/:dynamic_value/:wa_id/messages"
    if (
      payload?.object === "whatsapp_business_account" &&
      Array.isArray(payload.entry)
    ) {
      for (const entry of payload.entry) {
        const change = entry?.changes?.[0];
        const value = change?.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        const contactWaId =
          value?.contacts?.[0]?.wa_id || value?.messages?.[0]?.from;

        // Store these with a TTL of 24 hours (86400 seconds) and do not affect other Redis writes
        try {
          if (change?.field === "message_template_status_update") {
            const templateValue = value || {};
            const wbaId = entry.id;
            const templateId =
              templateValue?.message_template_id ||
              templateValue?.message_template_id ||
              "unknown";
            const uid = new ShortUniqueId({ length: 12 });
            const statusId = uid.rnd();
            const templateKey = `template_status:${wbaId}:${templateId}:${statusId}`;
            const templateStore = {
              id: statusId,
              wba_id: wbaId,
              message_template_id: templateId,
              event: templateValue?.event || null,
              new_quality_score: templateValue?.new_quality_score || null,
              reason: templateValue?.reason || null,
              created_at: new Date().toISOString(),
              raw: templateValue,
            };
            // 24 hours in seconds
            const ttlSeconds = 24 * 60 * 60;
            await req.redisManager.putByKey(
              templateKey,
              templateStore,
              ttlSeconds,
            );
            console.log("Template status update TTL (seconds):", ttlSeconds);
          }
        } catch (err) {
          console.log("Error persisting template status update:", err);
        }

        // Persist inbound messages
        if (phoneNumberId && Array.isArray(value?.messages)) {
          for (const msg of value.messages) {
            const senderWa =
              value?.contacts?.[0]?.wa_id || msg.from || null;

            if (!senderWa) {
              console.log("Skipping message: no sender wa_id / contacts");
              continue;
            }

            const msgId =
              msg.id ||
              "wamid." + Date.now() + Math.random().toString(36).slice(2, 10);
            const createdAt = msg.timestamp
              ? new Date(parseInt(msg.timestamp, 10) * 1000).toISOString()
              : new Date().toISOString();

            const groupId = msg.group_id || msg.context?.group_id;
            const isGroup = Boolean(groupId);
            const conversationId = groupId || senderWa;
            const contactWaId = senderWa;

            const messageForStore = { ...msg };
            if (isGroup) {
              messageForStore.recipient_type = "group";
            }

            const storedMessage = {
              id: msgId,
              from: msg.from || contactWaId,
              to: isGroup ? groupId : phoneNumberId,
              phone_number_id: phoneNumberId,
              recipient_type: isGroup ? "group" : "individual",
              type: msg.type || (msg.text ? "text" : "unknown"),
              text: msg.text,
              message: messageForStore,
              created_at: createdAt,
              status: "delivered",
              direction: "incoming",
              ...(isGroup ? { group_id: groupId } : {}),
            };

            const messageKey = `message:${phoneNumberId}:${conversationId}:${msgId}`;
            await req.redisManager.putByKey(messageKey, storedMessage, -1);

            // Emit socket event for real-time updates (This was missing for webhooks!)
            try {
              const io = getIO();
              const topic = `message/whatsapp/${conversationId}`;
              io.to(topic).emit("topic-data", {
                topic,
                data: storedMessage,
                timestamp: new Date(),
              });
            } catch (error) {
              console.log("Error emitting socket event for webhook:", error);
            }

            // Optionally persist order details for order-type messages
            if (
              msg.type === "order" ||
              msg.interactive?.type === "order_details"
            ) {
              const orderData =
                msg.order ||
                msg.interactive?.action?.parameters ||
                msg.interactive?.action;
              const orderKey = `order:${phoneNumberId}:${contactWaId}:${msgId}`;
              await req.redisManager.putByKey(
                orderKey,
                {
                  id: msgId,
                  name:
                    orderData?.name ||
                    orderData?.order?.name ||
                    orderData?.order?.items?.[0]?.name ||
                    null,
                  catalog_id: orderData?.catalog_id,
                  currency:
                    orderData?.currency ||
                    orderData?.total_amount?.currency ||
                    (Array.isArray(orderData?.order?.items) &&
                      orderData.order.items[0]?.currency) ||
                    null,
                  product_items:
                    orderData?.product_items ||
                    orderData?.order?.items ||
                    orderData?.sections?.[0]?.product_items ||
                    [],
                  totals: {
                    total_amount: orderData?.total_amount || null,
                    subtotal: orderData?.order?.subtotal || null,
                    tax: orderData?.order?.tax || null,
                    shipping: orderData?.order?.shipping || null,
                    discount: orderData?.order?.discount || null,
                  },
                  created_at: createdAt,
                },
                -1,
              );
            }

            // Handle flow responses (nfm_reply)
            if (
              msg.type === "interactive" &&
              msg.interactive?.type === "nfm_reply" &&
              msg.interactive?.nfm_reply
            ) {
              try {
                const nfmReply = msg.interactive.nfm_reply;
                const flowResponseKey = `flow_response:${phoneNumberId}:${contactWaId}:${msgId}`;

                let parsedResponse = {};
                try {
                  parsedResponse = nfmReply.response_json
                    ? JSON.parse(nfmReply.response_json)
                    : {};
                } catch (parseError) {
                  console.error(
                    "Error parsing flow response JSON:",
                    parseError,
                  );
                  parsedResponse = { raw: nfmReply.response_json };
                }

                const flowResponseData = {
                  _id: msgId,
                  business_id: entry.id,
                  wb_flow_id: nfmReply.flow_id || "unknown",
                  name: nfmReply.name || "flow",
                  wa_id: contactWaId,
                  response: parsedResponse,
                  created_at: createdAt,
                  workspace_id: phoneNumberId,
                  message_id: msgId,
                  context: msg.context || null,
                };

                await req.redisManager.putByKey(
                  flowResponseKey,
                  flowResponseData,
                  -1,
                );
                console.log(
                  `Flow response stored with key: ${flowResponseKey}`,
                );
              } catch (flowError) {
                console.error("Error storing flow response:", flowError);
              }
            }
          }
        }

        // Persist and apply STATUS updates to existing messages
        if (phoneNumberId && Array.isArray(value?.statuses)) {
          for (const statusUpdate of value.statuses) {
            try {
              const msgId = statusUpdate.id;
              const recipientId = statusUpdate.recipient_id;
              const status = statusUpdate.status; // sent | delivered | read | failed | unknown | pending
              const ts = statusUpdate.timestamp
                ? new Date(
                    parseInt(statusUpdate.timestamp, 10) * 1000,
                  ).toISOString()
                : new Date().toISOString();

              if (!msgId || !recipientId) continue;

              // 1:1 uses recipient_id = wa_id; group uses recipient_id = group_id + recipient_type "group"
              const messageKey = `message:${phoneNumberId}:${recipientId}:${msgId}`;
              const existing = await req.redisManager.getByKey(messageKey);
              if (!existing) continue; // nothing to update

              const updated = { ...existing, status };
              if (statusUpdate.recipient_type) {
                updated.recipient_type = statusUpdate.recipient_type;
              }
              if (status === "delivered") updated.delivered_at = ts;
              if (status === "read") updated.read_at = ts;
              const participantReceipt =
                statusUpdate.participant_recipient_id ||
                statusUpdate.recipient_participant_id;
              if (participantReceipt) {
                updated.last_status_participant_id = participantReceipt;
              }
              if (
                statusUpdate.conversation &&
                (!existing.conversation ||
                  Object.keys(existing.conversation).length === 0)
              ) {
                // Capture conversation details if provided by status webhook
                updated.conversation = {
                  id: statusUpdate.conversation.id,
                  origin: statusUpdate.conversation.origin,
                  pricing: statusUpdate.conversation.pricing,
                  expiration_timestamp:
                    statusUpdate.conversation.expiration_timestamp,
                };
              }
              if (
                statusUpdate.pricing &&
                (!updated.conversation ||
                  !updated.conversation.pricing)
              ) {
                updated.conversation = {
                  ...(updated.conversation || {}),
                  id:
                    (updated.conversation && updated.conversation.id) ||
                    statusUpdate.conversation?.id,
                  origin:
                    (updated.conversation && updated.conversation.origin) ||
                    statusUpdate.conversation?.origin,
                  pricing: statusUpdate.pricing,
                };
              }

              await req.redisManager.putByKey(messageKey, updated, -1);

              // Emit socket event for real-time updates (best effort)
              try {
                const io = getIO();
                const topic = `message/whatsapp/${recipientId}`;
                io.to(topic).emit("topic-data", {
                  topic,
                  data: updated,
                  timestamp: new Date(),
                });
              } catch (error) {
                console.log("Error emitting socket event:", error);
              }
            } catch (e) {
              console.log("Error applying status update:", e);
            }
          }
        }
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.log("Error in /webhook/push:", error);
    // Keep original behavior of returning success to avoid breaking senders
    return res.json({ success: true });
  }
});

ApiRouter.post("/tasks", validateRequest, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const uid = new ShortUniqueId({ length: 10 });
  const id = uid.rnd();
  const control_key = `load-test-${id}-control`;
  const progress_key = `load-test-${id}-progress`;

  const rquest_data = req.body;

  const task_payload = {
    image_name: "nekhop/simulator-worker:latest",
    container_name: "worker-task",
    environment: {
      REDIS_URL: process.env.REDIS_URL,
      CONTROL_KEY: control_key,
      PROGRESS_KEY: progress_key,
      PHONE_NUMBER_ID: rquest_data.PHONE_NUMBER_ID,
      DISPLAY_PHONE_NUMBER: rquest_data.DISPLAY_PHONE_NUMBER,
      DOWNLOAD_URL: rquest_data.DOWNLOAD_URL,
      WBA_ID: rquest_data.WBA_ID,
      CONCURRENCY: rquest_data.CONCURRENCY.toString(),
      REQUEST_DELAY: rquest_data.CONCURRENCY.toString(),
      WEBHOOK_URL: rquest_data.WEBHOOK_URL.toString(),
    },
  };
  const response = await axios.post(task_url, task_payload);
  return res.json({
    success: true,
    id: id,
    task: response.data,
  });
});

ApiRouter.get("/tasks/:id/progress", async (req, res) => {
  const key = `load-test-${req.params.id}-progress`;
  const data = await req.redisManager.hget(key);
  return res.json({
    success: true,
    data: data,
  });
});

ApiRouter.get("/tasks", async (req, res) => {
  const data = await req.redisManager.getValuesByPattern("load-test-*-control");
  return res.json({
    success: true,
    data: data,
  });
});

ApiRouter.get("/wb-accounts", async (req, res) => {
  const keys = await req.redisManager.getKeysByPattern("whatsapp:*");
  const final_data = await Promise.all(
    keys.map(async (key) => ({
      key,
      ...(await req.redisManager.getByKey(key)),
    })),
  );
  res.json(final_data);
});

// Custom validation function
const validateLoginInput = (username, password) => {
  const errors = {};

  if (!username) {
    errors.username = "Username is required";
  } else if (username.length < 3 || username.length > 30) {
    errors.username = "Username must be between 3 and 30 characters";
  }

  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

ApiRouter.post("/login", async (req, res) => {
  const body = req.body;
  const { username, password } = req.body;

  // Validate input
  const { isValid, errors } = validateLoginInput(username, password);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      errors,
    });
  }

  // Check user credentials in Redis
  const storedUser = await req.redisManager.get("user", username);

  if (!storedUser) {
    // In production, use proper password hashing
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Generate phone number ID

  return res.json({
    success: true,
    token: "asdasdasdasdasd",
  });
});

ApiRouter.get("/:dynamic_value/phone_numbers", async (req, res) => {
  const { dynamic_value } = req.params;
  const data = await req.redisManager.getValuesByPattern(
    `wb:${dynamic_value}:phone:*`,
  );

  const final_data = data.map((data) => {
    return JSON.parse(data.value);
  });
  res.json(final_data);
});

ApiRouter.get("/:dynamic_value/templates", async (req, res) => {
  const { dynamic_value } = req.params;
  const data = await req.redisManager.getValuesByPattern(
    `template:${dynamic_value}:*`,
  );
  const final_data = data.map((data) => {
    return JSON.parse(data.value);
  });
  res.json(final_data);
});

ApiRouter.get("/:dynamic_value/marketing_messages", async (req, res) => {
  const { dynamic_value } = req.params;
  console.log("KEY PATTERN", `message:${dynamic_value}:*:*`);
  const data = await req.redisManager.getValuesByPattern(
    `message:${dynamic_value}:*:*`,
  );

  const final_data = data.map((data) => {
    return JSON.parse(data.value);
  });
  res.json(final_data);
});

ApiRouter.get("/:dynamic_value/messages", async (req, res) => {
  const { dynamic_value } = req.params;
  console.log("KEY PATTERN", `message:${dynamic_value}:*:*`);
  const data = await req.redisManager.getValuesByPattern(
    `message:${dynamic_value}:*:*`,
  );

  const final_data = data.map((data) => {
    return JSON.parse(data.value);
  });
  res.json(final_data);
});

ApiRouter.get("/:dynamic_value/:wa_id/session", async (req, res) => {
  const { dynamic_value, wa_id } = req.params;
  // console.log("KEY PATTERN", `message:${dynamic_value}:*:*`);
  const conversation_key = `conversation:${dynamic_value}:${wa_id}:*`;
  const client_key = `wb:*:${dynamic_value}:client:${wa_id}`;
  const phone_number = `whatsapp:*:${dynamic_value}`;
  const profiles = await req.redisManager.getValuesByPattern(client_key);
  let profile =
    profiles.map((data) => {
      return {
        id: data.key,
        value: JSON.parse(data.value),
      };
    })[0] || null;

  const phone_numbers = await req.redisManager.getValuesByPattern(phone_number);
  const phone_numbers_out = phone_numbers.map((data) => {
    return {
      id: data.key,
      value: JSON.parse(data.value),
    };
  });
  const data = await req.redisManager.getValuesByPattern(conversation_key);
  const final_data = data.map((data) => {
    return {
      id: data.key,
      value: JSON.parse(data.value),
      profile: profile ? profile?.profile?.value : null,
    };
  });
  if (final_data.length > 0) {
    return res.json({
      ...final_data[0],
      phone_number: phone_numbers_out.length > 0 ? phone_numbers_out[0] : null,
    });
  } else {
    const conversation_window_hours = process.env.CONVERSATION_WINDOW || 24;

    const expires_at = Date.now() / 1000;
    const expires_at_24h =
      expires_at + Number(conversation_window_hours) * 60 * 60;
    // Generate unique id using short-unique-id
    const uid = new ShortUniqueId({ length: 18 });
    const conversation_id = uid.rnd();
    const ckey = `conversation:${dynamic_value}:${wa_id}:${conversation_id}`;
    const cvalue = {
      id: conversation_id, // Generate random string
      origin: {
        type: "service",
      },
      pricing: {
        billable: true,
        pricing_model: "PMP",
        category: "service",
      },
      expiration_timestamp: expires_at_24h,
    };
    // seconds
    const ttl = expires_at_24h - expires_at;
    await req.redisManager.putByKey(ckey, cvalue, ttl);

    return res.status(200).json({
      id: ckey,
      value: cvalue,
      profile: profile ? profile?.profile?.value : null,
      phone_number: phone_numbers_out.length > 0 ? phone_numbers_out[0] : null,
    });
  }
});

ApiRouter.get("/:dynamic_value/client", async (req, res) => {
  const { dynamic_value } = req.params;
  const data = await req.redisManager.getValuesByPattern(
    `wb:*:${dynamic_value}:client:*`,
  );
  const final_data = data.map((data) => {
    const parsed = JSON.parse(data.value);
    return { ...parsed, id: data.key };
  });
  res.json(final_data);
});

ApiRouter.get("/:dynamic_value/catalog", async (req, res) => {
  const { dynamic_value } = req.params;
  const data = await req.redisManager.getValuesByPattern(
    `catalog:${dynamic_value}`,
  );
  const final_data = data.map((data) => {
    return JSON.parse(data.value);
  });
  res.json(final_data);
});

ApiRouter.get("/:dynamic_value/:wa_id/messages", async (req, res) => {
  const { dynamic_value, wa_id } = req.params;
  const conversation_key = `message:${dynamic_value}:${wa_id}:*`;
  const data = await req.redisManager.getValuesByPattern(conversation_key);

  const messages = await Promise.all(data.map(async (item) => {
    const messageData = JSON.parse(item.value);
    const raw = messageData.message || messageData;
    const type =
      messageData.type || raw?.type || (raw?.text ? "text" : "unknown");
    const text = messageData.text?.body || raw?.text?.body || null;

    let direction = messageData.direction;
    if (!direction) {
      const fromVal = messageData.from || raw?.from;
      const groupIdOnMsg = raw?.group_id || messageData.group_id;
      if (wa_id.endsWith("@g.us")) {
        if (groupIdOnMsg === wa_id && fromVal && fromVal !== dynamic_value) {
          direction = "incoming";
        } else {
          direction = "outgoing";
        }
      } else {
        direction = fromVal === wa_id ? "incoming" : "outgoing";
      }
    }

    // Resolve media link dynamically from Redis if it's an ID
    const mediaTypes = ["image", "video", "audio", "document", "sticker"];
    if (mediaTypes.includes(type) && raw?.[type]) {
      const mediaObj = raw[type];
      if (mediaObj && mediaObj.id && !mediaObj.link) {
        try {
          const mediaData = await req.redisManager.getByKey(`media:${mediaObj.id}`);
          if (mediaData) {
            mediaObj.link = mediaData.url || mediaData.link;
          } else {
            mediaObj.link = "https://static.kwic.in/nml/app/674ff1a5b90ae6db773e56d2.jpg";
          }
        } catch (e) {
          console.error(`Error resolving media ID ${mediaObj.id}:`, e);
          mediaObj.link = "https://static.kwic.in/nml/app/674ff1a5b90ae6db773e56d2.jpg";
        }
      }
    }

    // Order extraction (supports both order and interactive order_details)
    let order = null;
    if (type === "order" || raw?.interactive?.type === "order_details") {
      const orderRoot =
        raw?.order ||
        raw?.interactive?.action?.parameters ||
        raw?.interactive?.action;
      const items = orderRoot?.product_items || orderRoot?.order?.items || [];
      const currency =
        orderRoot?.currency ||
        orderRoot?.total_amount?.currency ||
        items[0]?.currency ||
        null;
      // Normalize items for UI: { name, qty, price }
      const normalizedItems = items.map((it) => ({
        name: it.name || it.product_name || it.product_retailer_id || "Item",
        qty: it.quantity || 1,
        price: it.item_price || 0,
      }));
      const total =
        orderRoot?.total_amount?.value ??
        normalizedItems.reduce(
          (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1),
          0,
        );
      order = {
        currency: currency || "INR",
        items: normalizedItems,
        total,
        metadata: {
          subtotal: orderRoot?.order?.subtotal || null,
          expiration: orderRoot?.order?.expiration || null,
        },
      };
    }

    // Template extraction
    let template = null;
    if (type === "template" || raw?.type === "template") {
      const t = raw?.template || {};
      template = {
        name: t.name,
        components: t.components || [],
      };
    }

    // Preserve conversation details at top-level if present
    const conversation = messageData.conversation || raw?.conversation || null;
    if (raw && raw.conversation) {
      try {
        delete raw.conversation;
      } catch (e) {
        // ignore
      }
    }
    // Provide a normalized timestamp field but omit the original created_at
    const timestamp = messageData.created_at || messageData.timestamp || null;

    return {
      id: messageData.id,
      from: messageData.from || raw?.from || dynamic_value,
      to:
        messageData.to !== undefined && messageData.to !== null
          ? messageData.to
          : raw?.to ?? wa_id,
      recipient_type: messageData.recipient_type || raw?.recipient_type,
      phone_number_id: messageData.phone_number_id || dynamic_value,
      group_id: messageData.group_id || raw?.group_id,
      pinned: Boolean(messageData.pinned),
      pin_expiration_days: messageData.pin_expiration_days ?? null,
      type,
      text, // convenience
      message: raw, // full payload (with conversation removed)
      order,
      template,
      conversation,
      timestamp,
      status: messageData.status || raw?.status || "sent",
      direction,
    };
  }));

  const uniqueById = new Map();
  for (const m of messages) {
    if (!uniqueById.has(m.id)) uniqueById.set(m.id, m);
  }
  const uniqueMessages = Array.from(uniqueById.values());
  uniqueMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  res.json({ success: true, data: uniqueMessages });
});

// Delete a specific message (Redis + emit optional socket event)
ApiRouter.delete(
  "/:dynamic_value/:wa_id/messages/:message_id",
  async (req, res) => {
    try {
      const { dynamic_value, wa_id, message_id } = req.params;
      const messageKey = `message:${dynamic_value}:${wa_id}:${message_id}`;

      const existing = await req.redisManager.getByKey(messageKey);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Message not found" });
      }

      const redis = await req.redisManager.getClient();
      await redis.del(messageKey);

      // Also clean possible order record
      const orderKey = `order:${dynamic_value}:${wa_id}:${message_id}`;
      await redis.del(orderKey);

      try {
        const io = getIO();
        const topic = `message/whatsapp/${wa_id}`;
        io.to(topic).emit("messageDeleted", {
          topic,
          data: { id: message_id, wa_id, phone_number_id: dynamic_value },
          timestamp: new Date(),
        });
      } catch (e) {
        // ignore socket emission errors
      }

      return res.json({ success: true });
    } catch (error) {
      console.log("Error deleting message:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

ApiRouter.get("/:dynamic_value/:wa_id/info", async (req, res) => {
  const { dynamic_value, wa_id } = req.params;
  const client_key = `wb:*:${dynamic_value}:client:${wa_id}`;
  const conversation_key = `conversation:${dynamic_value}:${wa_id}:*`;

  const clientData = await req.redisManager.getValuesByPattern(client_key);
  const conversationData =
    await req.redisManager.getValuesByPattern(conversation_key);

  res.json({
    success: true,
    data: {
      client: clientData[0] ? JSON.parse(clientData[0].value) : null,
      conversation: conversationData[0]
        ? JSON.parse(conversationData[0].value)
        : null,
    },
  });
});

// Add endpoint to send messages from chatbot client
ApiRouter.post("/:dynamic_value/:wa_id/send-message", async (req, res) => {
  const { dynamic_value, wa_id } = req.params;
  const { message, type = "text" } = req.body;

  if (!message) {
    return res
      .status(400)
      .json({ success: false, error: "Message is required" });
  }

  const msg_id =
    "wamid." + Date.now() + Math.random().toString(36).substr(2, 9);
  const timestamp = new Date().toISOString();

  const messageData = {
    id: msg_id,
    from: wa_id,
    to: dynamic_value,
    type: type,
    text: { body: message },
    created_at: timestamp,
    status: "sent",
  };

  const message_key = `message:${dynamic_value}:${wa_id}:${msg_id}`;
  await req.redisManager.putByKey(message_key, messageData, -1);

  // Emit socket event for real-time updates
  try {
    const io = getIO();
    const topic = `message/whatsapp/${wa_id}`;
    io.to(topic).emit("topic-data", {
      topic,
      data: messageData,
      timestamp: new Date(),
    });
  } catch (error) {
    console.log("Error emitting socket event:", error);
  }

  res.json({ success: true, message_id: msg_id, data: messageData });
});

ApiRouter.post("/:dynamic_value/client", async (req, res) => {
  const { dynamic_value } = req.params;
  const body = req.body;
  const { wa_id, profile, wba_id } = body;

  // dynamic_value is the phone_number_id
  const phone_number_id = dynamic_value;

  // Find the wba_id by searching for any client key with this phone_number_id
  const clientData = await req.redisManager.getValuesByPattern(
    `wb:${wba_id}:${phone_number_id}:client:${wa_id}`,
  );

  // Extract wba_id from existing client keys
  if (clientData && clientData.length > 0) {
    // Key format: wb:${wba_id}:${phone_number_id}:client:${wa_id}
    return res.json({ success: true, wba_id: clientData[0].key.split(":")[1] });
  }

  await req.redisManager.putByKey(
    `wb:${wba_id}:${phone_number_id}:client:${wa_id}`,
    {
      wa_id: wa_id,
      phone_number_id: phone_number_id,
      profile: profile,
      created_at: new Date().toISOString(),
    },
  );
  res.json({
    success: true,
  });
});

ApiRouter.get(
  "/:dynamic_value/whatsapp_commerce_settings",
  async (req, res) => {
    const { dynamic_value } = req.params;
    const catalog_key = `catalog:${dynamic_value}`;
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
  },
);

ApiRouter.post(
  "/:dynamic_value/whatsapp_commerce_settings",
  async (req, res) => {
    res.status(200).json({
      success: true,
    });
  },
);

// Delete multiple messages by IDs
ApiRouter.delete("/:dynamic_value/messages", async (req, res) => {
  try {
    const { dynamic_value } = req.params;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "messageIds array is required" });
    }

    const redis = await req.redisManager.getClient();
    const deletedCount = { success: 0, failed: 0 };

    for (const messageId of messageIds) {
      try {
        const keys = await req.redisManager.getKeysByPattern(
          `message:${dynamic_value}:*:${messageId}`,
        );
        for (const key of keys) {
          await redis.del(key);
          const orderKey = key.replace("message:", "order:");
          await redis.del(orderKey);
          deletedCount.success++;
        }
      } catch (e) {
        deletedCount.failed++;
      }
    }

    return res.json({
      success: true,
      deleted: deletedCount.success,
      failed: deletedCount.failed,
    });
  } catch (error) {
    console.log("Error deleting messages:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Rename client
ApiRouter.patch("/:dynamic_value/client/:wa_id", async (req, res) => {
  try {
    const { dynamic_value, wa_id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    const clientKeys = await req.redisManager.getKeysByPattern(
      `wb:*:${dynamic_value}:client:${wa_id}`,
    );

    if (clientKeys.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    const clientKey = clientKeys[0];
    const clientData = await req.redisManager.getByKey(clientKey);

    if (!clientData) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    const updatedClient = {
      ...clientData,
      profile: {
        ...clientData.profile,
        name: name.trim(),
      },
    };

    await req.redisManager.putByKey(clientKey, updatedClient, -1);

    return res.json({
      success: true,
      message: "Client renamed successfully",
      data: updatedClient,
    });
  } catch (error) {
    console.log("Error renaming client:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete client and all associated messages
ApiRouter.delete("/:dynamic_value/client/:wa_id", async (req, res) => {
  try {
    const { dynamic_value, wa_id } = req.params;
    const redis = await req.redisManager.getClient();

    // Delete all messages for this client
    const messageKeys = await req.redisManager.getKeysByPattern(
      `message:${dynamic_value}:${wa_id}:*`,
    );
    for (const key of messageKeys) {
      await redis.del(key);
    }

    // Delete all orders for this client
    const orderKeys = await req.redisManager.getKeysByPattern(
      `order:${dynamic_value}:${wa_id}:*`,
    );
    for (const key of orderKeys) {
      await redis.del(key);
    }

    // Delete all flow responses for this client
    const flowResponseKeys = await req.redisManager.getKeysByPattern(
      `flow_response:${dynamic_value}:${wa_id}:*`,
    );
    for (const key of flowResponseKeys) {
      await redis.del(key);
    }

    // Delete conversation
    const conversationKeys = await req.redisManager.getKeysByPattern(
      `conversation:${dynamic_value}:${wa_id}:*`,
    );
    for (const key of conversationKeys) {
      await redis.del(key);
    }

    // Delete client profile
    const clientKeys = await req.redisManager.getKeysByPattern(
      `wb:*:${dynamic_value}:client:${wa_id}`,
    );
    for (const key of clientKeys) {
      await redis.del(key);
    }

    return res.json({
      success: true,
      message: "Client and all associated data deleted",
    });
  } catch (error) {
    console.log("Error deleting client:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get flow responses for a specific phone number and wa_id
ApiRouter.get("/:dynamic_value/:wa_id/flow_responses", async (req, res) => {
  try {
    const { dynamic_value, wa_id } = req.params;
    const flowResponseKey = `flow_response:${dynamic_value}:${wa_id}:*`;
    const data = await req.redisManager.getValuesByPattern(flowResponseKey);

    const flowResponses = data.map((item) => {
      return JSON.parse(item.value);
    });

    flowResponses.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );

    res.json({ success: true, data: flowResponses });
  } catch (error) {
    console.log("Error fetching flow responses:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get all flow responses for a phone number
ApiRouter.get("/:dynamic_value/flow_responses", async (req, res) => {
  try {
    const { dynamic_value } = req.params;
    const flowResponseKey = `flow_response:${dynamic_value}:*:*`;
    const data = await req.redisManager.getValuesByPattern(flowResponseKey);

    const flowResponses = data.map((item) => {
      return JSON.parse(item.value);
    });

    flowResponses.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );

    res.json({ success: true, data: flowResponses });
  } catch (error) {
    console.log("Error fetching flow responses:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = ApiRouter;
