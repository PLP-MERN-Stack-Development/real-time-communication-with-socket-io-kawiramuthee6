const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const { connectDB } = require("./config/db");
const { socketAuthMiddleware } = require("./middleware/socketAuth");
const { ChatHandlers } = require("./socket/chatHandlers"); 

const ConnectionManager = require("./socket/connectionManager");

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

connectDB();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;

if (process.env.NODE_ENV !== "production") {
  const timestamp = new Date().toISOString();
  process.stdout.write(`[${timestamp}] CORS origins: ${corsOrigins.join(", ")}\n`);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin) || corsOrigins.includes("*")) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV !== "production") {
        process.stderr.write(`[CORS] Blocked origin: ${origin}\n`);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-User-Id"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 600
};

app.use(cors(corsOptions));

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

global.io = io;

// Initialize socket managers
const connectionManager = new ConnectionManager(io);
const chatHandlers = new ChatHandlers(io);

io.use(socketAuthMiddleware);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.send("Chat API OK"));
app.get("/healthz", (req, res) => res.json({ status: "ok" }));

// Socket connection handling
io.on("connection", (socket) => {
  const { userId } = socket.data;
  
  if (userId) {
    // Add connection to manager
    connectionManager.addConnection(socket, userId);
    
    // Track connection for debugging (ADDED THIS)
    chatHandlers.trackConnection(socket);
    
    if (process.env.NODE_ENV !== "production") {
      const timestamp = new Date().toISOString();
      process.stdout.write(`[${timestamp}] User ${userId} connected (socket: ${socket.id})\n`);
    }

    // Core chat events
    socket.on("conversation:join", (data) => {
      console.log('🎯 SERVER: Received conversation:join from user:', userId, 'for conversation:', data.conversationId);
      chatHandlers.handleJoinConversation(socket, data.conversationId);
    });

    socket.on("conversation:leave", (data) => {
      console.log('🚶 SERVER: User leaving conversation:', data.conversationId);
      socket.leave(`conversation:${data.conversationId}`);
    });

    socket.on("message:send", (data) => {
      console.log('📤 SERVER: Received message:send from user:', userId);
      chatHandlers.handleSendMessage(socket, data);
    });

    socket.on("typing:start", (data) => {
      console.log('⌨️ SERVER: Received typing:start from user:', userId);
      chatHandlers.handleTypingStart(socket, data);
    });

    socket.on("typing:stop", (data) => {
      console.log('⏹️ SERVER: Received typing:stop from user:', userId);
      chatHandlers.handleTypingStop(socket, data);
    });

    socket.on("message:read", (data) => {
      console.log('👀 SERVER: Received message:read from user:', userId);
      chatHandlers.handleMessageRead(socket, data);
    });

    socket.on("conversation:create_private", (data) => {
      console.log('💬 SERVER: Received conversation:create_private from user:', userId);
      chatHandlers.handleCreatePrivateMessage(socket, data);
    });

    // Presence events
    socket.on("presence:update", (data) => {
      console.log('👤 SERVER: Received presence:update from user:', userId);
      socket.broadcast.emit("user:activity", {
        userId,
        ...data,
        timestamp: new Date()
      });
    });

    // Error handling
    socket.on("error", (error) => {
      console.error(`❌ SERVER: Socket error for user ${userId}:`, error);
    });

    // Disconnection handling
    socket.on("disconnect", (reason) => {
      if (process.env.NODE_ENV !== "production") {
        const timestamp = new Date().toISOString();
        process.stdout.write(`[${timestamp}] User ${userId} disconnected: ${reason}\n`);
      }

      // Clean up typing indicators
      chatHandlers.cleanupUserTyping(userId);
      
      // Remove connection
      connectionManager.removeConnection(socket);
    });

    // Send initial connection confirmation
    socket.emit("connected", {
      userId,
      socketId: socket.id,
      timestamp: new Date()
    });

    console.log('✅ SERVER: Socket event listeners registered for user:', userId);
  } else {
    console.log('❌ SERVER: No userId found, disconnecting socket:', socket.id);
    socket.disconnect();
  }
});

// API Routes
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");

app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// Error handling middleware
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const response = {
    message: err.message || "Internal server error"
  };
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }
  res.status(status).json(response);
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  if (process.env.NODE_ENV !== "production") {
    const timestamp = new Date().toISOString();
    process.stdout.write(`[${timestamp}] Server ready on http://localhost:${PORT}\n`);
    process.stdout.write(`[${timestamp}] Socket.IO server initialized\n`);
  }
});

module.exports = { io, connectionManager, chatHandlers };