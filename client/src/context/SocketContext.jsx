import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { user, isLoaded } = useUser();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map());

  // Stable function to update typing users
  const updateTypingUsers = useCallback((conversationId, userId, shouldAdd) => {
    setTypingUsers(prev => {
      const next = new Map(prev);
      const users = next.get(conversationId) || new Set();
      
      const hadUser = users.has(userId);
      
      if (shouldAdd && !hadUser) {
        users.add(userId);
        next.set(conversationId, users);
        return next;
      } else if (!shouldAdd && hadUser) {
        users.delete(userId);
        if (users.size === 0) {
          next.delete(conversationId);
        } else {
          next.set(conversationId, users);
        }
        return next;
      }
      
      return prev; // No change needed
    });
  }, []);

  // Stable function to update online users
  const updateOnlineUsers = useCallback((userId, isOnline) => {
    setOnlineUsers(prev => {
      const next = new Set(prev);
      const hadUser = next.has(userId);
      
      if (isOnline && !hadUser) {
        next.add(userId);
        return next;
      } else if (!isOnline && hadUser) {
        next.delete(userId);
        return next;
      }
      
      return prev; // No change needed
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;
    console.log('🔄 Connecting to socket:', socketUrl);

    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: { userId: user.id }
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('user:presence', ({ userId, isOnline }) => {
      updateOnlineUsers(userId, isOnline);
    });

    newSocket.on('typing:start', ({ conversationId, userId }) => {
      updateTypingUsers(conversationId, userId, true);
    });

    newSocket.on('typing:stop', ({ conversationId, userId }) => {
      updateTypingUsers(conversationId, userId, false);
    });

    newSocket.on('message:read', ({ conversationId, messageId, userId }) => {
      // This will be handled in individual components
      console.log('Message read:', { conversationId, messageId, userId });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      console.log('🧹 Cleaning up socket connection');
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers(new Set());
      setTypingUsers(new Map());
    };
  }, [user, isLoaded, updateOnlineUsers, updateTypingUsers]);

  const isUserOnline = useCallback((userId) => onlineUsers.has(userId), [onlineUsers]);

  const value = {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
    isUserOnline
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
}