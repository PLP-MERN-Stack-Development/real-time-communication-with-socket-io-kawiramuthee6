import { Avatar } from "./ui/avatar";
import { cn } from "../lib/utils";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "numeric"
});

const statusIcons = {
  sending: "⏳",
  sent: "✓",
  delivered: "✓✓", 
  seen: "👁️",
  failed: "❌"
};

export default function MessageBubble({
  message,
  isMine,
  currentUser,
  otherMember,
  isUserOnline
}) {
  const timestamp = message?.createdAt ? new Date(message.createdAt) : null;
  
  // Determine message status - if it has _id, it's delivered from server
  const status = message._id ? "delivered" : (message.status || "sending");
  const statusIcon = statusIcons[status] || "⏳";

  const isSeenByOther = isMine && message.readBy?.some(id => id !== currentUser?.id);
  const isSending = status === "sending";
  const isFailed = status === "failed";

  return (
    <div className={cn("flex items-end gap-3", isMine ? "justify-end" : "justify-start")}>
      {!isMine && (
        <div className="relative">
          <Avatar
            size="sm"
            src={message.senderAvatar || otherMember?.avatarUrl}
            alt={message.senderName}
            fallback={message.senderName}
          />
          {isUserOnline?.(message.senderId) && (
            <div className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full border-2 border-white bg-emerald-400"></div>
          )}
        </div>
      )}

      <div className={cn("flex max-w-xl flex-col gap-1", isMine ? "items-end" : "items-start")}>
        <p className="text-[11px] uppercase tracking-wide text-slate-400">
          {isMine ? currentUser?.name : message.senderName}
        </p>
        <div className={cn(
          "rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-lg transition-all duration-300",
          isMine
            ? isFailed
              ? "bg-red-500/20 border border-red-500/30 text-red-200" // Failed state
              : isSending
              ? "bg-indigo-400/70 text-white animate-pulse" // Sending state with animation
              : "bg-gradient-to-r from-indigo-600/90 to-violet-600/90 text-white shadow-indigo-900/40" // Normal sent state
            : "border border-white/10 bg-white text-slate-900" // Other user's message
        )}>
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          {isFailed && message.error && (
            <p className="text-[10px] text-red-200 mt-1">
              Failed: {message.error}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400/90">
          {timestamp && <span>{timeFormatter.format(timestamp)}</span>}
          {isMine && (
            <span className={cn(
              "flex items-center gap-1 font-semibold transition-colors duration-300",
              status === "seen" ? "text-emerald-300" : 
              status === "failed" ? "text-red-300" :
              status === "sending" ? "text-amber-300 animate-pulse" :
              "text-indigo-200"
            )}>
              <span className="text-xs">{statusIcon}</span>
              {status}
            </span>
          )}
        </div>
        
        {isSeenByOther && otherMember && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[9px] text-emerald-400 uppercase">
              Seen by {otherMember.displayName}
            </span>
          </div>
        )}
      </div>

      {isMine && (
        <Avatar
          size="sm"
          src={currentUser?.avatar}
          alt={currentUser?.name}
          fallback={currentUser?.name}
        />
      )}
    </div>
  );
}