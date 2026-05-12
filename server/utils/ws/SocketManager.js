const { Server } = require("socket.io");

let io = null;
const connectedUsers = new Map();

const configureSocket = (server) => {
  if (io) return io; // Return existing instance if already initialized

  io = new Server(server, {
    cors: {
      origin: "*", // In production, specify actual origin
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Handle joining a topic room
    socket.on("join", (topic) => {
      socket.join(topic);
      console.log(`Socket ${socket.id} joined topic: ${topic}`);
    });

    // Handle leaving a topic room
    socket.on("leave", (topic) => {
      socket.leave(topic);
      console.log(`Socket ${socket.id} left topic: ${topic}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      // Remove user from connectedUsers if they exist
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { configureSocket, getIO, connectedUsers };
