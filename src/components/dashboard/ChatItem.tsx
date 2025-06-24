// src/components/dashboard/ChatItem.tsx
"use client";

import type { Chat } from '@/lib/types';
import Image from 'next/image';
// Removed Card, CardContent, CardFooter, CardHeader, CardTitle imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Removed Button import as it's not used directly within the item
import { User, Store } from 'lucide-react'; // Removed ArrowRight
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChatItemProps {
  chat: Chat;
  currentUserId: string;
  onSelect: () => void;
  isSelected: boolean;
}

export function ChatItem({ chat, currentUserId, onSelect, isSelected }: ChatItemProps) {
  const isCurrentUserSender = chat.lastMessageSenderId === currentUserId;
  const otherParticipantName = currentUserId === chat.userId ? chat.storeName : chat.userName;
  const otherParticipantAvatar = currentUserId === chat.userId ? chat.storeLogoUrl : chat.userAvatarUrl;
  const otherParticipantType = currentUserId === chat.userId ? 'store' : 'user';

  const unreadCount = currentUserId === chat.userId ? chat.userUnreadCount : chat.ownerUnreadCount;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer", // Unified padding and gap here
        "relative overflow-hidden transition-colors duration-200",
        "rounded-xl", // Keep this for rounded corners
        isSelected
          ? "bg-primary/10 text-primary" // Softer background for selected
          : "hover:bg-muted-foreground/10" // Lighter hover background
      )}
    >
      {/* Absolute position for the selected border effect */}
      {isSelected && (
        <div className="absolute inset-y-2 left-0 w-1 bg-primary rounded-r-md" />
      )}

      <Avatar className="h-10 w-10 border flex-shrink-0"> {/* Adjusted size slightly */}
        <AvatarImage src={otherParticipantAvatar || ''} alt={otherParticipantName} data-ai-hint={otherParticipantType === 'store' ? 'logo business' : 'avatar person'} />
        <AvatarFallback>
          {otherParticipantType === 'store'
            ? <Store className="h-5 w-5 text-muted-foreground" />
            : <User className="h-5 w-5 text-muted-foreground" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-center mb-0.5"> {/* Changed to items-center for better vertical alignment of title/time */}
          <h3 className="text-base font-semibold truncate flex-grow pr-2"> {/* Changed to h3, adjusted text-size if needed */}
            {otherParticipantName}
          </h3>
          <p className="text-xs text-muted-foreground flex-shrink-0"> {/* Moved timestamp up */}
            {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true, locale: el })}
          </p>
        </div>
        <div className="flex justify-between items-center">
            <p className={cn(
                "text-sm truncate pr-2", // Truncate longer messages, added pr-2
                unreadCount > 0 && !isCurrentUserSender ? 'font-bold text-foreground' : 'text-muted-foreground'
            )}>
              {isCurrentUserSender && "Εσείς: "}
              {chat.lastMessageText || "Δεν υπάρχουν μηνύματα ακόμη."}
            </p>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                {unreadCount}
              </span>
            )}
        </div>
      </div>
    </div>
  );
}