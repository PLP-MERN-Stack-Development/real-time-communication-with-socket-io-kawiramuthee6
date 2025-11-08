const UserProfile = require("../models/UserProfile");

class ConnectionManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId[]
    this.userSockets = new Map(); // socketId -> userId
  }

  addConnection(socket, userId) {
    // Track user's sockets
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socket.id);
    this.userSockets.set(socket.id, userId);

    // Update user's last seen and online status
    this.updateUserOnlineStatus(userId, true);
    
    // Notify other users about this user coming online
    this.broadcastUserPresence(userId, true);
  }

  removeConnection(socket) {
    const userId = this.userSockets.get(socket.id);
    
    if (userId) {
      // Remove socket from user's connections
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // If no more sockets for this user, mark as offline
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
          this.updateUserOnlineStatus(userId, false);
          this.broadcastUserPresence(userId, false);
        }
      }
      
      this.userSockets.delete(socket.id);
    }
  }

  async updateUserOnlineStatus(userId, isOnline) {
    try {
      await UserProfile.findOneAndUpdate(
        { clerkUserId: userId },
        { 
          lastSeenAt: isOnline ? null : new Date()
        }
      );
    } catch (error) {
      console.error("Error updating user online status:", error);
    }
  }

  broadcastUserPresence(userId, isOnline) {
    this.io.emit("user:presence", {
      userId,
      isOnline,
      lastSeen: isOnline ? null : new Date(),
      timestamp: new Date()
    });
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }

  getUserSockets(userId) {
    return this.connectedUsers.get(userId) || new Set();
  }

  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Get all sockets for a user
  getUserSocketIds(userId) {
    const sockets = this.connectedUsers.get(userId);
    return sockets ? Array.from(sockets) : [];
  }
}

module.exports = ConnectionManager;