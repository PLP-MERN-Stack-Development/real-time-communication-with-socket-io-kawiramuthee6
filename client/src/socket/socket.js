// socket.js - Socket.io client setup
import { io } from 'socket.io-client';

// Socket.io connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Connect to socket server with user ID
  const connect = (userId) => {
    if (userId) {
      socket.auth = { userId };
    }
    socket.connect();
  };

  // Disconnect from socket server
  const disconnect = () => {
    socket.disconnect();
  };

  // Join a conversation room
  const joinConversation = (conversationId) => {
    socket.emit('conversation:join', { conversationId });
  };

  // Leave a conversation room
  const leaveConversation = (conversationId) => {
    socket.emit('conversation:leave', { conversationId });
  };

  // Send a message
  const sendMessage = (messageData) => {
    socket.emit('message:send', messageData);
  };

  // Start typing indicator
  const startTyping = (conversationId) => {
    socket.emit('typing:start', { conversationId });
  };

  // Stop typing indicator
  const stopTyping = (conversationId) => {
    socket.emit('typing:stop', { conversationId });
  };

  // Mark message as read
  const markAsRead = (messageId, conversationId) => {
    socket.emit('message:read', { messageId, conversationId });
  };

  // Create private conversation
  const createPrivateConversation = (targetUserId) => {
    socket.emit('conversation:create_private', { targetUserId });
  };

  // Socket event listeners
  useEffect(() => {
    // Connection events
    const onConnect = () => {
      setIsConnected(true);
      console.log('✅ Connected to server');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('❌ Disconnected from server');
    };

    const onConnected = (data) => {
      console.log('🔗 Socket authenticated:', data);
    };

    // Message events - THESE ARE THE KEY FIXES!
    const onMessageNew = (message) => {
      console.log('📨 Received new message:', message);
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    };

    const onConversationUpdate = (conversation) => {
      console.log('🔄 Conversation updated:', conversation);
      // Update conversations list
      setConversations((prev) => {
        const existing = prev.find(c => c._id === conversation._id);
        if (existing) {
          return prev.map(c => c._id === conversation._id ? conversation : c);
        }
        return [...prev, conversation];
      });
    };

    // Typing events
    const onUserTyping = (data) => {
      console.log('⌨️ User typing:', data);
      setTypingUsers((prev) => {
        const filtered = prev.filter(user => user.userId !== data.userId);
        if (data.isTyping) {
          return [...filtered, { userId: data.userId, conversationId: data.conversationId }];
        }
        return filtered;
      });
    };

    const onUserActivity = (data) => {
      console.log('👤 User activity:', data);
    };

    // Error events
    const onError = (error) => {
      console.error('❌ Socket error:', error);
    };

    // Register event listeners - MATCHING BACKEND EVENTS
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connected', onConnected); // From backend connection confirmation
    socket.on('message:new', onMessageNew); // When new message arrives
    socket.on('conversation:update', onConversationUpdate); // When conversation updates
    socket.on('user:typing', onUserTyping); // When user starts/stops typing
    socket.on('user:activity', onUserActivity); // User presence updates
    socket.on('error', onError);

    // Clean up event listeners
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connected', onConnected);
      socket.off('message:new', onMessageNew);
      socket.off('conversation:update', onConversationUpdate);
      socket.off('user:typing', onUserTyping);
      socket.off('user:activity', onUserActivity);
      socket.off('error', onError);
    };
  }, []);

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    conversations,
    typingUsers,
    connect,
    disconnect,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    createPrivateConversation,
  };
};

export default socket;