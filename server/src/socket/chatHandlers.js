const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const UserProfile = require("../models/UserProfile");

class ChatHandlers {
  constructor(io) {
    this.io = io;
    this.typingUsers = new Map(); // conversationId -> Set of userIds
  }

  async handleJoinConversation(socket, conversationId) {
    try {
      const { userId } = socket.data;
      
      console.log('🚪 SERVER: User', userId, 'joining conversation:', conversationId);

      // Verify user has access to conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.members.includes(userId)) {
        console.log('❌ SERVER: Access denied for user', userId, 'to conversation', conversationId);
        socket.emit("error", { message: "Access denied to conversation" });
        return;
      }

      // Leave previous conversation rooms
      const rooms = Array.from(socket.rooms);
      console.log('🏠 SERVER: User current rooms BEFORE:', rooms);
      
      rooms.forEach(room => {
        if (room.startsWith('conversation:')) {
          socket.leave(room);
          console.log('🚶 SERVER: User left room:', room);
        }
      });

      // Join new conversation room
      const roomName = `conversation:${conversationId}`;
      
      console.log('🔑 SERVER: Attempting to join room:', roomName);
      socket.join(roomName);
      
      // Wait a bit for socket.io to process the room join
      setTimeout(() => {
        const room = this.io.sockets.adapter.rooms.get(roomName);
        const socketIds = room ? Array.from(room) : [];
        console.log('👥 SERVER: Users in room AFTER join:', roomName, ':', socketIds.length, 'users -', socketIds);
        
        // Also check all conversation rooms
        console.log('🏠 SERVER: All conversation rooms:');
        for (const [roomName, room] of this.io.sockets.adapter.rooms.entries()) {
          if (roomName.startsWith('conversation:')) {
            console.log('   ', roomName, ':', Array.from(room));
          }
        }
      }, 100);

      console.log('✅ SERVER: User join command sent for room:', roomName);

      // Notify others in the conversation
      socket.to(roomName).emit("user:joined", {
        conversationId,
        userId,
        timestamp: new Date()
      });

      // Send current typing users in this conversation
      const typingUsers = this.typingUsers.get(conversationId) || new Set();
      if (typingUsers.size > 0) {
        socket.emit("typing:update", {
          conversationId,
          userIds: Array.from(typingUsers)
        });
      }

      // Update user's online status
      this.updateUserPresence(socket, true);
    } catch (error) {
      console.error("❌ SERVER: Error joining conversation:", error);
      socket.emit("error", { message: "Failed to join conversation" });
    }
  }

  async handleSendMessage(socket, data) {
    try {
      const { userId } = socket.data;
      const { conversationId, text, tempId } = data;

      console.log('📤 SERVER: Message received from user:', userId);
      console.log('📤 SERVER: Conversation ID:', conversationId);
      console.log('📤 SERVER: Message content:', text);
      console.log('📤 SERVER: Temp ID:', tempId);

      if (!conversationId || !text?.trim()) {
        console.log('❌ SERVER: Missing conversationId or text');
        socket.emit("error", { message: "conversationId and text are required" });
        return;
      }

      // Verify conversation access
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.members.includes(userId)) {
        console.log('❌ SERVER: Access denied for user', userId, 'to conversation', conversationId);
        socket.emit("error", { message: "Access denied" });
        return;
      }

      // Get user profile
      const profile = await UserProfile.findOne({ clerkUserId: userId }) || {
        displayName: "Unknown User",
        avatarUrl: ""
      };

      console.log('💾 SERVER: Creating message in database');

      // Create message
      const message = await Message.create({
        conversationId,
        senderId: userId,
        senderName: profile.displayName,
        senderAvatar: profile.avatarUrl,
        text: text.trim(),
        readBy: [userId],
        status: "sent"
      });

      console.log('✅ SERVER: Message created with ID:', message._id);

      // Update conversation
      if (!conversation.unreadCounts) {
        conversation.unreadCounts = new Map();
      }

      conversation.members.forEach(memberId => {
        const currentCount = conversation.unreadCounts.get(memberId) || 0;
        conversation.unreadCounts.set(
          memberId, 
          memberId === userId ? 0 : currentCount + 1
        );
      });

      conversation.lastMessage = {
        text: message.text,
        senderId: message.senderId,
        senderName: message.senderName,
        senderAvatar: message.senderAvatar,
        createdAt: message.createdAt
      };
      conversation.lastMessageAt = message.createdAt;
      await conversation.save();

      console.log('✅ SERVER: Conversation updated');

      // Prepare message for emission
      const messageData = {
        _id: message._id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.senderName,
        senderAvatar: message.senderAvatar,
        text: message.text,
        status: message.status,
        readBy: message.readBy,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      };

      // Emit to all users in the conversation
      const roomName = `conversation:${conversationId}`;

      // DEBUG: Check ALL rooms before emitting
      console.log('🏠 SERVER: All active rooms before emit:');
      for (const [roomName, room] of this.io.sockets.adapter.rooms.entries()) {
        if (roomName.startsWith('conversation:')) {
          console.log('   ', roomName, ':', Array.from(room));
        }
      }

      const room = this.io.sockets.adapter.rooms.get(roomName);
      const socketIds = room ? Array.from(room) : [];
      console.log('👥 SERVER: Users in target room', roomName, ':', socketIds.length, 'users -', socketIds);

      if (socketIds.length === 0) {
        console.log('⚠️ SERVER: WARNING - Room is empty! No one will receive this message.');
      }

      console.log('🚀 SERVER: Emitting message:new to room:', roomName);
      this.io.to(roomName).emit("message:new", {
        conversationId,
        message: messageData,
        tempId // Include tempId for client-side message tracking
      });

      console.log('✅ SERVER: Message emitted successfully');

      // Notify conversation members about update
      conversation.members
        .filter(memberId => memberId !== userId)
        .forEach(memberId => {
          console.log('🔄 SERVER: Notifying user about conversation update:', memberId);
          this.io.to(memberId).emit("conversation:update", { 
            conversationId,
            lastMessage: messageData
          });
        });

      // Send notifications to offline users
      this.sendNotifications(conversation, messageData, userId);

    } catch (error) {
      console.error("❌ SERVER: Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  }

  handleTypingStart(socket, data) {
    const { userId } = socket.data;
    const { conversationId } = data;

    console.log('⌨️ SERVER: Typing start from user:', userId, 'in conversation:', conversationId);

    if (!conversationId) return;

    let typingUsers = this.typingUsers.get(conversationId);
    if (!typingUsers) {
      typingUsers = new Set();
      this.typingUsers.set(conversationId, typingUsers);
    }

    typingUsers.add(userId);

    console.log('👥 SERVER: Current typing users:', Array.from(typingUsers));

    socket.to(`conversation:${conversationId}`).emit("typing:start", {
      conversationId,
      userId,
      timestamp: new Date()
    });
  }

  handleTypingStop(socket, data) {
    const { userId } = socket.data;
    const { conversationId } = data;

    console.log('⏹️ SERVER: Typing stop from user:', userId, 'in conversation:', conversationId);

    if (!conversationId) return;

    const typingUsers = this.typingUsers.get(conversationId);
    if (typingUsers) {
      typingUsers.delete(userId);
      
      console.log('👥 SERVER: Remaining typing users:', Array.from(typingUsers));

      socket.to(`conversation:${conversationId}`).emit("typing:stop", {
        conversationId,
        userId,
        timestamp: new Date()
      });
    }
  }

  async handleMessageRead(socket, data) {
    try {
      const { userId } = socket.data;
      const { conversationId, messageId } = data;

      console.log('👀 SERVER: Marking message as read - User:', userId, 'Message:', messageId);

      // Update message read status
      await Message.updateOne(
        { _id: messageId, conversationId },
        { 
          $addToSet: { readBy: userId },
          $set: { status: "seen" }
        }
      );

      // Update conversation unread count
      await Conversation.updateOne(
        { _id: conversationId },
        { 
          $set: { 
            [`unreadCounts.${userId}`]: 0 
          } 
        }
      );

      console.log('✅ SERVER: Message marked as read');

      // Notify others in conversation
      socket.to(`conversation:${conversationId}`).emit("message:read", {
        conversationId,
        messageId,
        userId,
        timestamp: new Date()
      });

    } catch (error) {
      console.error("❌ SERVER: Error marking message as read:", error);
    }
  }

  async handleCreatePrivateMessage(socket, data) {
    try {
      const { userId } = socket.data;
      const { targetUserId } = data;

      console.log('💬 SERVER: Creating private message between:', userId, 'and', targetUserId);

      if (!targetUserId || targetUserId === userId) {
        console.log('❌ SERVER: Invalid target user');
        socket.emit("error", { message: "Invalid target user" });
        return;
      }

      // Check if conversation already exists
      let conversation = await Conversation.findOne({
        isGroup: false,
        members: { $all: [userId, targetUserId], $size: 2 }
      });

      if (!conversation) {
        console.log('🆕 SERVER: Creating new conversation');
        conversation = await Conversation.create({
          members: [userId, targetUserId],
          lastMessageAt: null,
          unreadCounts: new Map([
            [userId, 0],
            [targetUserId, 0]
          ])
        });
      } else {
        console.log('🔍 SERVER: Found existing conversation:', conversation._id);
      }

      // Get user profiles for the conversation
      const profiles = await UserProfile.find({
        clerkUserId: { $in: [userId, targetUserId] }
      });

      const profileMap = new Map();
      profiles.forEach(profile => {
        profileMap.set(profile.clerkUserId, profile);
      });

      // Format conversation data
      const otherUser = profiles.find(p => p.clerkUserId === targetUserId);
      const conversationData = {
        id: conversation._id.toString(),
        name: otherUser?.displayName || `User ${targetUserId.slice(-4)}`,
        isGroup: false,
        avatar: otherUser?.avatarUrl || "",
        members: [
          {
            clerkUserId: userId,
            displayName: "You",
            avatarUrl: profileMap.get(userId)?.avatarUrl || "",
            email: profileMap.get(userId)?.email || ""
          },
          {
            clerkUserId: targetUserId,
            displayName: otherUser?.displayName || `User ${targetUserId.slice(-4)}`,
            avatarUrl: otherUser?.avatarUrl || "",
            email: otherUser?.email || ""
          }
        ],
        unreadCount: 0,
        lastMessage: null,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt
      };

      console.log('✅ SERVER: Conversation created/retrieved:', conversationData.id);

      // Emit to both users
      socket.emit("conversation:created", conversationData);
      socket.to(targetUserId).emit("conversation:created", conversationData);

    } catch (error) {
      console.error("❌ SERVER: Error creating private message:", error);
      socket.emit("error", { message: "Failed to create conversation" });
    }
  }

  updateUserPresence(socket, isOnline) {
    const { userId } = socket.data;
    
    if (userId) {
      console.log('👤 SERVER: User presence update -', userId, 'is', isOnline ? 'online' : 'offline');
      this.io.emit("user:presence", {
        userId,
        isOnline,
        lastSeen: isOnline ? null : new Date()
      });
    }
  }

  sendNotifications(conversation, message, senderId) {
    console.log('🔔 SERVER: Sending notifications for conversation:', conversation._id);
    
    conversation.members
      .filter(memberId => memberId !== senderId)
      .forEach(memberId => {
        // Check if user is online
        const memberSockets = this.io.sockets.adapter.rooms.get(memberId);
        const isOnline = memberSockets && memberSockets.size > 0;

        if (!isOnline) {
          console.log(`📱 SERVER: Push notification needed for offline user ${memberId}`);
          // Here you would integrate with a push notification service
          // For now, we'll just log it
        } else {
          console.log(`✅ SERVER: User ${memberId} is online, no push notification needed`);
        }
      });
  }

  // Clean up typing indicators for disconnected users
  cleanupUserTyping(userId) {
    console.log('🧹 SERVER: Cleaning up typing indicators for user:', userId);
    
    for (const [conversationId, typingUsers] of this.typingUsers.entries()) {
      if (typingUsers.has(userId)) {
        typingUsers.delete(userId);
        console.log('🗑️ SERVER: Removed typing indicator for user', userId, 'in conversation', conversationId);
        
        this.io.to(`conversation:${conversationId}`).emit("typing:stop", {
          conversationId,
          userId,
          timestamp: new Date()
        });
      }
    }
  }

  // Add connection tracking for debugging
  trackConnection(socket) {
    console.log('🔗 SERVER: New connection - Socket:', socket.id, 'User:', socket.data.userId);
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 SERVER: Socket disconnected - Socket:', socket.id, 'User:', socket.data.userId, 'Reason:', reason);
      this.cleanupUserTyping(socket.data.userId);
      this.updateUserPresence(socket, false);
    });
  }
}

module.exports = { ChatHandlers };