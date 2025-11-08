const { io } = require("../server");

class SocketUtils {
  // Emit to specific user
  static emitToUser(userId, event, data) {
    if (io && userId) {
      io.to(userId).emit(event, data);
    }
  }

  // Emit to multiple users
  static emitToUsers(userIds, event, data) {
    if (io && userIds && Array.isArray(userIds)) {
      userIds.forEach(userId => {
        io.to(userId).emit(event, data);
      });
    }
  }

  // Emit to all users in a conversation
  static emitToConversation(conversationId, event, data) {
    if (io && conversationId) {
      io.to(`conversation:${conversationId}`).emit(event, data);
    }
  }

  // Check if user is online
  static isUserOnline(userId) {
    if (!io || !userId) return false;
    
    const userRooms = io.sockets.adapter.rooms.get(userId);
    return !!(userRooms && userRooms.size > 0);
  }

  // Get all online users
  static getOnlineUsers() {
    if (!io) return [];
    
    const onlineUsers = [];
    const rooms = io.sockets.adapter.rooms;
    
    rooms.forEach((_, roomName) => {
      // Check if room name is a userId (not a conversation room)
      if (!roomName.startsWith('conversation:')) {
        onlineUsers.push(roomName);
      }
    });
    
    return onlineUsers;
  }

  // Send notification to user
  static sendNotification(userId, notification) {
    this.emitToUser(userId, 'notification:new', {
      ...notification,
      timestamp: new Date(),
      read: false
    });
  }

  // Broadcast system message
  static broadcastSystemMessage(message, conversationId = null) {
    const systemMessage = {
      type: 'system',
      text: message,
      timestamp: new Date()
    };

    if (conversationId) {
      this.emitToConversation(conversationId, 'message:system', systemMessage);
    } else {
      io.emit('message:system', systemMessage);
    }
  }
}

module.exports = SocketUtils;