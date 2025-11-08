import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import MessageBubble from "./MessageBubble";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";
import { useSocket } from "../hooks/useSocket";
import TypingIndicator from "./TypingIndicator";

const longDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function ChatWindow({
  messagesApi,
  conversation,
  conversationId,
  currentUser,
  onConversationSeen,
  onMessageSent,
  isBootstrapping,
  currentUserId
}) {
  const service = useMemo(() => messagesApi || {
    async list() { return []; },
    async send() { throw new Error("messagesApi not provided"); }
  }, [messagesApi]);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const viewportRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasLoadedRef = useRef(false);

  const {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
    isUserOnline,
    joinConversation,
    leaveConversation,
    sendTypingStart,
    sendTypingStop,
    sendMessageRead,
    sendMessage
  } = useSocket();

  const otherMember = useMemo(() => {
    if (!conversation || !currentUser?.id) return null;
    return conversation.members?.find(member => member.clerkUserId !== currentUser.id) || null;
  }, [conversation, currentUser]);

  const currentTypingUsers = useMemo(() => 
    typingUsers.get(conversationId) || new Set(), 
    [typingUsers, conversationId]
  );

  const isOtherUserOnline = useMemo(() => 
    otherMember && isUserOnline(otherMember.clerkUserId), 
    [otherMember, isUserOnline]
  );

  // === DEBUG USEFFECT ===
  useEffect(() => {
    console.log('🔍 DEBUG - ChatWindow State:', {
      conversationId,
      messagesCount: messages.length,
      isConnected,
      currentTypingUsers: Array.from(currentTypingUsers),
      isLoading,
      isSending
    });
  }, [messages, conversationId, isConnected, currentTypingUsers, isLoading, isSending]);

  // Reset state when conversation changes
  useEffect(() => {
    console.log('🔄 Conversation changed:', conversationId);
    setMessages([]);
    setDraft("");
    setError(null);
    hasLoadedRef.current = false;
  }, [conversationId]);

  // Load messages - SIMPLIFIED VERSION
  useEffect(() => {
    if (!conversationId || hasLoadedRef.current) return;
    
    console.log('📥 Loading messages for conversation:', conversationId);
    
    let active = true;
    setIsLoading(true);
    
    const loadMessages = async () => {
      try {
        const data = await service.list(conversationId);
        if (!active) return;
        
        console.log('✅ Messages loaded:', data.length, 'messages');
        setMessages(Array.isArray(data) ? data : []);
        hasLoadedRef.current = true;
        onConversationSeen?.(conversationId);
      } catch (err) {
        console.error('❌ Failed to load messages:', err);
        if (active) setError("Failed to load messages.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    
    loadMessages();
    
    return () => {
      active = false;
    };
  }, [service, conversationId, onConversationSeen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (viewportRef.current && messages.length > 0) {
      console.log('📜 Auto-scrolling to bottom, messages:', messages.length);
      viewportRef.current.scrollTo({ 
        top: viewportRef.current.scrollHeight, 
        behavior: "smooth" 
      });
    }
  }, [messages]);

  // === CRITICAL FIX: Join conversation room when connected ===
  useEffect(() => {
    if (!conversationId || !isConnected) {
      console.log('⏳ Waiting to join - conversationId:', conversationId, 'isConnected:', isConnected);
      return;
    }

    console.log('🎯 JOINING conversation room:', conversationId);
    joinConversation(conversationId);

    return () => {
      console.log('🚪 LEAVING conversation room:', conversationId);
      leaveConversation(conversationId);
    };
  }, [conversationId, isConnected, joinConversation, leaveConversation]);

  // Socket events - FIXED VERSION
  useEffect(() => {
    if (!socket || !conversationId) return;

    console.log('🎯 Setting up socket listener for conversation:', conversationId);

 // In ChatWindow.jsx - update the socket handler:
const handleNewMessage = (data) => {
  console.log('📨 Raw socket data received:', data);
  
  const { conversationId: incomingConvId, message } = data;
  
  if (incomingConvId === conversationId) {
    console.log('✅ Processing message for UI:', message.text, 'tempId:', message.tempId);
    
    setMessages(prev => {
      // More robust duplicate detection and replacement
      const hasTemp = prev.some(m => m.tempId === message.tempId);
      const hasReal = prev.some(m => m._id === message._id);
      
      if (hasTemp) {
        // Replace temp message with real message - completely remove temp and add real
        console.log('🔄 Replacing temp message with real message');
        const newMessages = prev
          .filter(m => m.tempId !== message.tempId) // Remove the temp message
          .concat({ 
            ...message, 
            status: 'delivered' // Ensure status is set to delivered
          }); // Add the real message
        
        // Re-sort by date to maintain correct order
        return newMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else if (!hasReal) {
        // Add new message (for messages from other users)
        console.log('➕ Adding new message from other user');
        return [...prev, { ...message, status: 'delivered' }];
      } else {
        console.log('⚠️ Message already exists, skipping');
        return prev;
      }
    });
    
    // Mark as read and update conversation
    if (message._id && currentUser?.id !== message.senderId) {
      sendMessageRead(conversationId, message._id);
    }
    
    // Update conversation in parent
    if (currentUser?.id === message.senderId) {
      onMessageSent?.(conversationId, message);
    }
  }
};

    const handleConversationUpdate = (data) => {
      console.log('🔄 Conversation updated:', data);
      // Handle conversation updates if needed
    };

    const handleUserTyping = (data) => {
      console.log('⌨️ User typing event:', data);
      // This is handled by the context, but we log it for debugging
    };

    // Listen for messages
    socket.on("message:new", handleNewMessage);
    socket.on("conversation:update", handleConversationUpdate);
    socket.on("user:typing", handleUserTyping);

    return () => {
      console.log('🧹 Removing socket listeners');
      socket.off("message:new", handleNewMessage);
      socket.off("conversation:update", handleConversationUpdate);
      socket.off("user:typing", handleUserTyping);
    };
  }, [socket, conversationId, currentUser?.id, sendMessageRead, onMessageSent]);

  // Typing handlers
  const handleTypingStart = useCallback(() => {
    if (!conversationId || !isConnected) return;
    
    console.log('⌨️ Starting typing indicator');
    sendTypingStart(conversationId);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop(conversationId);
    }, 3000);
  }, [conversationId, isConnected, sendTypingStart, sendTypingStop]);

  const handleTypingStop = useCallback(() => {
    if (!conversationId || !isConnected) return;
    
    console.log('⏹️ Stopping typing indicator');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTypingStop(conversationId);
  }, [conversationId, isConnected, sendTypingStop]);

  const handleInputChange = useCallback((e) => {
    setDraft(e.target.value);
    if (e.target.value.trim() && isConnected) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  }, [handleTypingStart, handleTypingStop, isConnected]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!draft.trim() || !conversationId || !isConnected) return;

  console.log('🚀 CLIENT: Starting message send process...');

  setIsSending(true);
  setError(null);
  handleTypingStop();

  // Create temporary message for instant UI feedback
  const tempMessage = {
    _id: `temp-${Date.now()}`,
    tempId: `temp-${Date.now()}`,
    conversationId,
    senderId: currentUser.id,
    senderName: currentUser.name || 'You',
    senderAvatar: currentUser.avatar,
    text: draft.trim(),
    status: 'sending', // Explicitly set status
    readBy: [currentUser.id],
    createdAt: new Date(),
    updatedAt: new Date(),
    isTemp: true // Add flag to identify temp messages
  };

  // Add temp message immediately for instant UI
  setMessages(prev => [...prev, tempMessage]);
  const messageText = draft.trim();
  setDraft("");

  try {
    console.log('📤 CLIENT: Sending message via socket ONLY...');
    
    // Send via socket ONLY - backend handles persistence
    sendMessage({
      conversationId,
      text: messageText,
      tempId: tempMessage.tempId
    });
    console.log('✅ CLIENT: Socket message sent - waiting for real message from server');

  } catch (err) {
    console.error('❌ CLIENT: Failed to send message:', err);
    setError("Failed to send message.");
    
    // Update temp message to show error
    setMessages(prev => prev.map(m => 
      m.tempId === tempMessage.tempId 
        ? { ...m, status: 'failed', error: err.message }
        : m
    ));
  } finally {
    setIsSending(false);
  }
};

  // Test function for manual socket testing
  const testManualMessage = () => {
    if (socket && conversationId) {
      console.log('🧪 TEST: Manual socket message send');
      sendMessage({
        conversationId,
        text: 'TEST MESSAGE ' + Date.now(),
        tempId: 'test-' + Date.now()
      });
    } else {
      console.log('❌ TEST: Socket not available for testing');
    }
  };

  if (isBootstrapping) {
    return (
      <section className="flex flex-1 flex-col justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center gap-3 justify-center text-slate-300">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          Preparing your conversations…
        </div>
      </section>
    );
  }

  if (!conversationId || !conversation) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <div className="max-w-xs space-y-4">
          <div className="text-6xl">💬</div>
          <p className="text-sm text-slate-400">
            Choose a conversation from the sidebar or start a new one to begin chatting.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar
              src={conversation.isGroup ? conversation.avatar : otherMember?.avatarUrl}
              alt={conversation.name}
              fallback={conversation.name}
            />
            {!conversation.isGroup && isOtherUserOnline && (
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400"></div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{conversation.name}</p>
            <p className="text-xs text-slate-400">
              {!conversation.isGroup ? (
                isOtherUserOnline ? (
                  <span className="text-emerald-400">Online now</span>
                ) : (
                  otherMember?.lastSeenAt ? `Last seen ${longDateFormatter.format(new Date(otherMember.lastSeenAt))}` : 'Offline'
                )
              ) : (
                `${conversation.members?.length || 0} participants`
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 text-xs",
            isConnected ? "text-emerald-400" : "text-amber-400"
          )}>
            <div className={cn(
              "h-2 w-2 rounded-full",
              isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            )}></div>
            {isConnected ? "Live" : "Connecting..."}
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100"
          >
            Real-time Chat
          </Badge>
        </div>
      </header>

      <div
        ref={viewportRef}
        className="custom-scroll flex-1 space-y-4 overflow-y-auto bg-chat-gradient px-6 py-6"
      >
        {isLoading && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
              Loading messages…
            </div>
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.04] px-4 py-12 text-center">
            <div className="text-4xl mb-3">👋</div>
            <p className="text-sm text-slate-400 max-w-xs">
              No messages yet — start the conversation!
            </p>
          </div>
        )}

        {messages.map((message, index) => {
          // Create truly unique keys to prevent React duplicate key warnings
          const uniqueKey = message._id 
            ? `msg-${message._id}` 
            : `temp-${message.tempId}-${index}`;
          
          return (
            <MessageBubble
              key={uniqueKey}
              message={message}
              isMine={message.senderId === currentUser.id}
              currentUser={currentUser}
              otherMember={otherMember}
              isUserOnline={isUserOnline}
            />
          );
        })}

        {currentTypingUsers.size > 0 && (
          <TypingIndicator 
            typingUsers={currentTypingUsers}
            members={conversation.members}
            currentUserId={currentUserId}
          />
        )}
      </div>

      <footer className="border-t border-white/10 bg-white/[0.04] px-6 py-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <Input
            value={draft}
            onChange={handleInputChange}
            onBlur={handleTypingStop}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={isSending || !isConnected}
            className="flex-1 bg-white/5 border-white/10 focus:border-indigo-400/50 text-white placeholder:text-slate-400"
          />
          <Button
            type="submit"
            disabled={!draft.trim() || isSending || !isConnected}
            className={cn(
              "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-0",
              (isSending || !isConnected) && "opacity-50"
            )}
          >
            {isSending ? "Sending..." : "Send"}
          </Button>
        </form>

        {/* Temporary test button */}
        <div className="mt-2 flex gap-2">
          <Button 
            onClick={testManualMessage}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Test Socket Send
          </Button>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-300 flex items-center gap-1">
            <span>⚠️</span>
            {error}
          </p>
        )}
        
        {/* Debug info in footer */}
        <div className="mt-2 text-xs text-slate-500">
          Debug: {messages.length} messages • {isConnected ? '🟢 Connected' : '🔴 Disconnected'} • Socket: {socket?.id ? '✅' : '❌'}
        </div>
      </footer>
    </section>
  );
}