import { Avatar } from "./ui/avatar";
import { cn } from "../lib/utils";

export default function TypingIndicator({ typingUsers, members, currentUserId }) {
  const typingUserIds = Array.from(typingUsers).filter(id => id !== currentUserId);
  
  if (typingUserIds.length === 0) return null;

  const typingMembers = members.filter(member => 
    typingUserIds.includes(member.clerkUserId)
  );

  const displayName = typingMembers[0]?.displayName || 'Someone';
  
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="flex -space-x-2">
        {typingMembers.slice(0, 1).map((member) => (
          <Avatar
            key={member.clerkUserId}
            src={member.avatarUrl}
            alt={member.displayName}
            fallback={member.displayName}
            size="sm"
            className="border-2 border-slate-800"
          />
        ))}
      </div>
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-2xl px-4 py-3 border border-white/10">
        <div className="flex space-x-1">
          <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="text-xs text-slate-400">
          {displayName} is typing...
        </span>
      </div>
    </div>
  );
}