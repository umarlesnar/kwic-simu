const express = require("express");
const http = require("http");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const Redis = require("ioredis");
const RedisStreamManager = require("./utils/RedisStreamManager");
const LogManager = require("./utils/LogManager");

const { configureSocket } = require("./utils/ws/SocketManager");

const config = require("./config");

const RedisManager = require("./utils/RedisManager");

const PORT = process.env.PORT || 3002;
const HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
const REDIS_URL = "redis://default:mskjplwsi9823qposdkm@103.25.47.251:6389" || config.REDIS_URL;

const logManager = new LogManager();
const clients = {};
const app = express();
const server = new http.createServer(app);
const redis = new Redis(REDIS_URL);

const io = configureSocket(server);

redis.on("connect", () => console.log("✅ Connected to Redis"));
redis.on("error", (err) => console.error("❌ Redis Error:", err));

// Paths
const uploadDir = path.join(__dirname, "uploads");
const clientBuildPath = path.join(__dirname, "client");

// Ensure "uploads" directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware for parsing multipart/form-data (file uploads)
const redisStreamManager = new RedisStreamManager(
  redis,
  config.STREAM_NAME,
  1000
);
const redisManager = new RedisManager(redis);

//app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));
app.use(cors());
app.use((req, res, next) => {
  req.redisManager = redisManager;
  req.redisStreamManager = redisStreamManager;
  next();
});
// 🟢 Serve React Static Files
app.use(express.static(clientBuildPath));

app.use(express.json()); // Middleware to parse JSON request body
app.use((req, res, next) => {
  logManager.info(`Received ${req.method} request on ${req.url}`);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logManager.info({
      message: "Request handled",
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Simulate POST /v14.0/<phone_number_id>/conversational_automation

app.use("/files", express.static(uploadDir));

const v14Routes = require("./router/v14.0/router");

const apiRoutes = require("./router/api");
const webhookRoutes = require("./router/webhook");
app.use("/v14.0", v14Routes);
app.use("/v21.0", v14Routes);
app.use("/v22.0", v14Routes);
app.use("/api", apiRoutes);
app.use("/webhook", webhookRoutes);

// 🟢 Catch-all Route for React
app.get("*", (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

io.use(async (socket, next) => {
  // const ppk = socket.handshake.query.ppk;

  // if (!ppk) {
  //   return next(new Error("Authentication error: No token provided"));
  // }

  // const project = await redisManager.getByKey(`project:${ppk}`);

  // if (!project) return next(new Error("Authentication error:Invalid token"));

  return next();
});

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);
  clients[socket.id] = {};
  // Handle topic subscriptions
  socket.on("subscribe", (data) => {
    const topic = data.topic;
    socket.join(topic);
    console.log(`User ${socket.id} subscribed to ${topic}`);
  });

  socket.on("subscribeToVisitor", (data) => {
    const { visitorId } = data;
    console.log(`User ${socket.id} subscribed to visitor ${visitorId}`);
    // Join the visitor's room
    socket.join(`visitor_${visitorId}`);
    // Store visitorId in client data
    //clients[socket.id].visitorId = visitorId;
    // Emit userData event with visitorId

    socket.to(`visitor_${visitorId}`).emit("userData", {
      visitorId,
    });

    // socket.emit("userData", {
    //   visitorId,
    // });
  });

  // Handle unsubscriptions
  socket.on("unsubscribe", (data) => {
    const topic = data.topic;
    socket.leave(topic);
    console.log(`User ${socket.id} unsubscribed from ${topic}`);
  });

  socket.on("operatorTyping", async (data) => {
    try {
      const { visitor_id, operator_id, room_id, isTyping, ppk } = data;

      const visitor = await redisManager.getByKey(`visitor:${visitor_id}`);
      if (!visitor) {
        return next(new Error("visitor not found in operatorTyping"));
      }

      // Notify operators
      socket.to("visitor").emit("operatorTyping", {
        ppk,
        operator_id,
        room_id,
        isTyping,
        timestamp: new Date().toISOString(),
      });

      // Also notify other participants in the conversation
      socket.to(visitor.socket_id).emit("operatorTyping", {
        ppk,
        operator_id,
        room_id,
        isTyping,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logManager.error("Error in operatorIsTyping:", error);
    }
  });

  // === NEW OPERATOR SIDE EVENT HANDLERS ===

  // Operator joins a conversation stream
  socket.on("conversationStreamJoin", async (data) => {
    try {
      const timestamp = new Date().toISOString();
      const { room_id, operator_id, visitor_id, ppk, type } = data;

      if (type == "operator") {
        logManager.info(
          `Operator ${operator_id} joining conversation ${room_id}`
        );
        // Join the conversation room
        socket.join(`room_${room_id}`);
      }
      if (type == "visitor") {
        logManager.info(
          `Visitor ${visitor_id} joining conversation ${room_id}`
        );
      }

      // Store operator info
      clients[socket.id] = {
        ...clients[socket.id],
        type: type,
        operator_id,
        visitor_id,
        room_id,
        ppk: ppk,
      };

      if (type == "visitor") {
        socket.to(`room_${room_id}`).emit("visitorJoined", {
          visitor_id,
          timestamp: timestamp,
        });
        const result = await redisStreamManager.sendMessage({
          type: "LIVE_WEBHOOK",
          payload: {
            object: "kwic_live_chat",
            ppk,
            entry: {
              event: "visitor_joined",
              payload: {
                room_id,
                visitor_id,
                timestamp: timestamp,
              },
            },
            created_at: timestamp,
          },
        });
      }
    } catch (error) {
      logManager.error("Error in conversationStreamJoin:", error);
      socket.emit("error", { message: "Failed to join conversation" });
    }
  });

  socket.on("operatorStreamJoin", async (data) => {
    try {
      const { ppk } = data;
      socket.join(`operator_${ppk}`);
      // Store operator info
      clients[socket.id] = {
        ...clients[socket.id],
        ppk: ppk,
      };
    } catch (error) {
      logManager.error("Error in operatorStreamJoin:", error);
      socket.emit("error", { message: "Failed to join operator room" });
    }
  });

  // Operator opens/views a conversation
  socket.on("operatorOpenConversation", async (data) => {
    try {
      const { conversationId, operatorId } = data;
      logManager.info(
        `Operator ${operatorId} opened conversation ${conversationId}`
      );

      // Update operator presence
      await redisManager.set(
        `operator_presence_${operatorId}`,
        JSON.stringify({
          conversationId,
          status: "viewing",
          timestamp: new Date().toISOString(),
        }),
        300
      ); // 5 minutes expiry

      // Notify other operators about the activity
      socket.to("operators").emit("operatorActivity", {
        operatorId,
        conversationId,
        action: "opened",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logManager.error("Error in operatorOpenConversation:", error);
    }
  });

  // Operator marks messages as read
  socket.on("operatorReadMessages", async (data) => {
    try {
      const { conversationId, operatorId, messageIds, lastReadMessageId } =
        data;
      logManager.info(
        `Operator ${operatorId} read messages in conversation ${conversationId}`
      );

      // Store read status in Redis
      await redisManager.set(
        `conversation_${conversationId}_read_by_${operatorId}`,
        JSON.stringify({
          lastReadMessageId,
          messageIds,
          readAt: new Date().toISOString(),
        }),
        86400
      ); // 24 hours expiry

      // Notify visitor that messages were read
      socket.to(`conversation_${conversationId}`).emit("messagesRead", {
        operatorId,
        messageIds,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logManager.error("Error in operatorReadMessages:", error);
    }
  });

  // === VISITOR SIDE EVENT HANDLERS ===

  // Visitor registration
  socket.on("visitorRegister", async (data) => {
    try {
      const {
        visitor_id,
        session_id,
        metadata = {},
        ppk,
        ip,
        country,
        city,
        name,
        email,
        lang,
        browser,
        browser_version,
        os_name,
        os_version,
        timezone,
        refer,
      } = data;
      const timestamp = new Date().toISOString();

      logManager.info(
        `Visitor ${visitor_id} registered with session ${session_id}`
      );

      // Store visitor info
      clients[socket.id] = {
        ...clients[socket.id],
        type: "visitor",
        visitor_id,
        session_id,
        register_at: timestamp,
        ppk: ppk,
        ip,
      };

      // Store in Redis
      await redisManager.putByKey(
        `visitor:${visitor_id}`,
        {
          id: visitor_id,
          ppk: ppk,
          socket_id: session_id,
          metadata,
          register_at: timestamp,
          status: "online",
          ip,
          country,
          city,
          name,
          email,
          lang,
          browser,
          browser_version,
          os_name,
          os_version,
          timezone,
          refer,
        },
        432000
      );

      const result = await redisStreamManager.sendMessage({
        type: "LIVE_WEBHOOK",
        payload: {
          object: "kwic_live_chat",
          ppk,
          entry: {
            event: "visitor_registered",
            payload: {
              ppk,
              visitor_id,
              session_id,
              metadata,
              timestamp,
              ip,
              country,
              city,
              name,
              email,
              lang,
              browser,
              browser_version,
              os_name,
              os_version,
              timezone,
              refer,
            },
          },
          created_at: timestamp,
        },
      });

      // Notify operators about new visitor

      socket.to("operator_" + ppk).emit("visitorJoined", {
        ppk,
        visitor_id,
        session_id,
        metadata,
        timestamp,
        ip,
        country,
        city,
        name,
        email,
        lang,
        browser,
        browser_version,
        os_name,
        os_version,
        timezone,
      });

      // socket.to("operators").emit("visitorEnterWebsite", {
      //   ppk,
      //   visitor_id,
      //   session_id,
      //   metadata,
      //   timestamp,
      //   ip,
      // });
    } catch (error) {
      logManager.error("Error in visitorRegister:", error);
      socket.emit("error", { message: "Registration failed" });
    }
  });

  //visitor page change

  socket.on("pageChanged", async (data) => {
    try {
      const { visitor_id, ppk, newPage, timestamp } = data;

      console.log("data", data);

      const visitor = await redisManager.getByKey(`visitor:${visitor_id}`);
      console.log("visitor", visitor);

      if (!visitor) {
        logManager.error("Visitor not found:", visitor_id);
        socket.emit("error", { message: "Visitor not found" });
      }

      const visited_pages =
        visitor.visited_pages?.length > 0
          ? [...visitor.visited_pages, { newPage, visitor_id, timestamp }]
          : [{ newPage, visitor_id, timestamp }];

      await redisManager.putByKey(`visitor:${visitor_id}`, {
        ...visitor,
        visited_pages,
      });

      const result = await redisStreamManager.sendMessage({
        type: "LIVE_WEBHOOK",
        payload: {
          object: "kwic_live_chat",
          ppk,
          entry: {
            event: "page_changed",
            payload: {
              ppk,
              visitor_id,
              timestamp,
              page: newPage,
            },
          },
          created_at: timestamp,
        },
      });

      // Notify operators about visitor page changed

      socket.to("operator_" + ppk).emit("pageChanged", {
        ppk,
        visitor_id,
        timestamp,
        page: newPage,
      });
    } catch (error) {
      logManager.error("Error in visitor page change:", error);
      socket.emit("error", { message: "visitor page change event error" });
    }
  });

  // Visitor date/data updates
  socket.on("visitorDataUpdated", async (data) => {
    try {
      const { visitorId, sessionId, updateData } = data;
      const timestamp = new Date().toISOString();

      logManager.info(`Visitor ${visitorId} data updated`);

      // Update visitor data in Redis
      const existingData = await redisManager.get(`visitor_${visitorId}`);
      if (existingData) {
        const visitorData = JSON.parse(existingData);
        const updatedData = {
          ...visitorData,
          ...updateData,
          lastUpdated: timestamp,
        };
        await redisManager.set(
          `visitor_${visitorId}`,
          JSON.stringify(updatedData),
          7200
        );
      }

      // Notify operators about visitor update
      socket.to("operators").emit("visitorDateUpdated", {
        visitorId,
        sessionId,
        updateData,
        timestamp,
      });
    } catch (error) {
      logManager.error("Error in visitorDateUpdated:", error);
    }
  });

  // Widget analytics tracking
  socket.on("widgetAnalytics", async (data) => {
    try {
      const { visitorId, sessionId, eventType, eventData } = data;
      const timestamp = new Date().toISOString();

      logManager.info(
        `Widget analytics: ${eventType} from visitor ${visitorId}`
      );

      // Store analytics in Redis stream
      await redisStreamManager.addToStream({
        type: "widget_analytics",
        visitorId,
        sessionId,
        eventType,
        eventData,
        timestamp,
      });
    } catch (error) {
      logManager.error("Error in widgetAnalytics:", error);
    }
  });

  // Visitor clicks on chat icon
  socket.on("visitorClicksOnChatIcon", async (data) => {
    try {
      const { visitorId, sessionId } = data;
      const timestamp = new Date().toISOString();

      logManager.info(`Visitor ${visitorId} clicked chat icon`);

      // Store event
      await redisStreamManager.addToStream({
        type: "chat_icon_clicked",
        visitorId,
        sessionId,
        timestamp,
      });

      // Notify operators
      socket.to("operators").emit("visitorClicksOnChatIcon", {
        visitorId,
        sessionId,
        timestamp,
      });
    } catch (error) {
      logManager.error("Error in visitorClicksOnChatIcon:", error);
    }
  });

  // Chatbot rating
  socket.on("chatBotRated", async (data) => {
    try {
      const { visitorId, sessionId, rating, feedback, conversationId } = data;
      const timestamp = new Date().toISOString();

      logManager.info(`Chatbot rated ${rating} by visitor ${visitorId}`);

      // Store rating
      await redisStreamManager.addToStream({
        type: "chatbot_rated",
        visitorId,
        sessionId,
        conversationId,
        rating,
        feedback,
        timestamp,
      });

      // Notify operators
      socket.to("operators").emit("chatBotRated", {
        visitorId,
        sessionId,
        conversationId,
        rating,
        feedback,
        timestamp,
      });
    } catch (error) {
      logManager.error("Error in chatBotRated:", error);
    }
  });

  // === SHARED EVENT HANDLERS ===

  // New message (both operator and visitor can send)
  socket.on("newMessage", async (data) => {
    try {
      const {
        ppk,
        msg_id,
        room_id,
        visitor_id,
        sender_type = "visitor",
        message,
      } = data;
      const timestamp = new Date().toISOString();

      logManager.info(
        `New message from ${sender_type} ${visitor_id} in conversation ${room_id}`
      );

      const messageData = {
        ppk,
        id: msg_id,
        msg_id,
        room_id,
        visitor_id,
        operator_id: null,
        sender_type,
        message,
        timestamp,
        status: "sent",
        read_at: null,
      };

      await redisManager.putByKey(`message:${msg_id}`, messageData, -1);

      // Broadcast to conversation participants
      socket.to(`room_${room_id}`).emit("newMessage", messageData);

      // Notify operators if message is from visitor
      if (sender_type === "visitor") {
        socket.to("operators").emit("newMessage", messageData);
      }

      const result = await redisStreamManager.sendMessage({
        type: "LIVE_WEBHOOK",
        payload: {
          object: "kwic_live_chat",
          ppk,
          entry: {
            event: "new_message",
            payload: messageData,
          },
          created_at: timestamp,
        },
      });
    } catch (error) {
      logManager.error("Error in newMessage:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("visitorReadMessage", async (data) => {
    try {
      const timestamp = new Date().toISOString();
      const { room_id, visitor_id, msg_id, ppk } = data;
      logManager.info(
        `Visitor ${visitor_id} read messages in conversation ${room_id}`
      );

      const messageData = await redisManager.getByKey(`message:${msg_id}`);
      if (!messageData) {
        logManager.error("Message Not found:", msg_id);
      }

      const updatedMessage = {
        ...messageData,
        status: "read",
        read_at: timestamp,
      };

      await redisManager.putByKey(`message:${msg_id}`, updatedMessage, -1);

      const result = await redisStreamManager.sendMessage({
        type: "LIVE_WEBHOOK",
        payload: {
          object: "kwic_live_chat",
          ppk,
          entry: {
            event: "message_read",
            payload: {
              ppk,
              room_id,
              visitor_id,
              msg_id,
              status: "read",
              read_at: timestamp,
              timestamp: timestamp,
            },
          },
          created_at: timestamp,
        },
      });

      // Notify visitor that messages were read
      socket.to(`room_${room_id}`).emit("messageRead", {
        ppk,
        room_id,
        visitor_id,
        msg_id,
        status: "read",
        read_at: timestamp,
        timestamp: timestamp,
      });
    } catch (error) {
      logManager.error("Error in visitorReadMessage:", error);
    }
  });

  // Visitor typing indicator
  socket.on("visitorTyping", async (data) => {
    try {
      const { visitor_id, room_id, is_typing = true, message, ppk } = data;

      // Notify operators
      socket.to("operators").emit("visitorTyping", {
        ppk,
        visitor_id,
        room_id,
        isTyping,
        message,
        timestamp: new Date().toISOString(),
      });

      // Also notify other participants in the conversation
      socket.to(`room_id_${room_id}`).emit("visitorTyping", {
        ppk,
        visitor_id,
        room_id,
        isTyping,
        message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logManager.error("Error in visitorTyping:", error);
    }
  });

  // Bot typing indicator (sent to visitor)
  socket.on("botIsTyping", async (data) => {
    try {
      const { visitor_id, room_id, is_typing = true, message, ppk } = data;

      const visitor = await redisManager.getByKey(`visitor:${visitor_id}`);

      if (!visitor) {
        return next(new Error("visitor not found in botTyping"));
      }

      // Also notify other participants in the conversation
      socket.to(visitor.socket_id).emit("botTyping", {
        ppk,
        room_id,
        is_typing,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logManager.error("Error in botTyping:", error);
    }
  });

  // Disable text input for visitor
  socket.on("disableTextInput", (data) => {
    try {
      const { visitorId, disabled, reason } = data;

      // Send to specific visitor
      socket.to(`visitor_${visitorId}`).emit("disableTextInput", {
        disabled,
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logManager.error("Error in disableTextInput:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected : " + socket.id);
    const rooms = Array.from(socket.rooms);
    rooms.forEach((room) => socket.leave(room));
    if (clients && clients[socket.id]) {
      console.log("deleting " + socket.id);
      delete clients[socket.id];
      io.emit("removeClient", socket.id);
    }
  });
});

// Clean Up Socket in every minutes
setInterval(() => {
  io.sockets.sockets.forEach((socket) => {
    if (!socket.connected) socket.disconnect();
  });
}, 60000);

io.engine.on("connection_error", (err) => {
  console.log(err.code); // 3
  console.log(err.message); // "Bad request"
  console.log(err.context); // { name: 'TRANSPORT_MISMATCH', transport: 'websocket', previousTransport: 'polling' }
});

// Start the server
server.listen(PORT, HOSTNAME, () => {
  console.log(`✅ Server running at http://${HOSTNAME}:${PORT}`);
});
