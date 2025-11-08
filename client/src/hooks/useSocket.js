import { useSocketContext } from '../context/SocketContext';
import { useCallback } from 'react';

export function useSocket() {
  const context = useSocketContext();
  
  const joinConversation = useCallback((conversationId) => {
    if (context.socket && conversationId) {
      console.log('🎯 FRONTEND: Emitting conversation:join for:', conversationId);
      context.socket.emit('conversation:join', { conversationId });
    }
  }, [context.socket]);

  const leaveConversation = useCallback((conversationId) => {
    if (context.socket && conversationId) {
      console.log('🚪 FRONTEND: Emitting conversation:leave for:', conversationId);
      context.socket.emit('conversation:leave', { conversationId });
    }
  }, [context.socket]);

  const sendTypingStart = useCallback((conversationId) => {
    if (context.socket && conversationId) {
      console.log('⌨️ FRONTEND: Emitting typing:start for:', conversationId);
      context.socket.emit('typing:start', { conversationId });
    }
  }, [context.socket]);

  const sendTypingStop = useCallback((conversationId) => {
    if (context.socket && conversationId) {
      console.log('⏹️ FRONTEND: Emitting typing:stop for:', conversationId);
      context.socket.emit('typing:stop', { conversationId });
    }
  }, [context.socket]);

  const sendMessageRead = useCallback((conversationId, messageId) => {
    if (context.socket && conversationId && messageId) {
      console.log('👀 FRONTEND: Emitting message:read for:', conversationId, messageId);
      context.socket.emit('message:read', { conversationId, messageId });
    }
  }, [context.socket]);

  const sendMessage = useCallback((messageData) => {
    if (context.socket) {
      console.log('📤 FRONTEND: Emitting message:send:', messageData);
      context.socket.emit('message:send', messageData);
    }
  }, [context.socket]);

  return {
    ...context,
    joinConversation,
    leaveConversation,
    sendTypingStart,
    sendTypingStop,
    sendMessageRead,
    sendMessage,
  };
}