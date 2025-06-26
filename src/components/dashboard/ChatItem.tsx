// src/components/dashboard/ChatItem.tsx
"use client";

import type { Chat } from '@/lib/types';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Store } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns'; //
import { el } from 'date-fns/locale'; //
import { cn } from '@/lib/utils'; //

interface ChatItemProps {
  chat: Chat; //
  currentUserId: string; //
  onSelect: () => void; //
  isSelected: boolean; //
}

export function ChatItem({ chat, currentUserId, onSelect, isSelected }: ChatItemProps) {
  const isCurrentUserSender = chat.lastMessageSenderId === currentUserId; //
  const otherParticipantName = currentUserId === chat.userId ? chat.storeName : chat.userName; //
  const otherParticipantAvatar = currentUserId === chat.userId ? chat.storeLogoUrl : chat.userAvatarUrl; //
  const otherParticipantType = currentUserId === chat.userId ? 'store' : 'user'; //

  const unreadCount = currentUserId === chat.userId ? chat.userUnreadCount : chat.ownerUnreadCount; //

  // --- FIX START ---
  // Helper function to safely convert a Firestore Timestamp or other types to a JavaScript Date object.
  // This addresses the 'No overload matches this call' error.
  const getSafeDate = (timestampValue: typeof chat.lastMessageAt): Date => {
    // Check if it's a Firestore Timestamp object (has a .toDate() method)
    if (typeof timestampValue === 'object' && timestampValue !== null && 'toDate' in timestampValue && typeof timestampValue.toDate === 'function') {
      return timestampValue.toDate();
    }
    // If it's already a string or number, pass it directly to the Date constructor.
    // FieldValue (like admin.firestore.FieldValue.serverTimestamp()) should ideally not be
    // read directly from a document after it's been committed, but this handles it gracefully.
    return new Date(timestampValue as string | number | Date);
  };

  const lastMessageDate = getSafeDate(chat.lastMessageAt); // Use the helper to get a safe Date object
  // --- FIX END ---

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer",
        "relative overflow-hidden transition-colors duration-200",
        "rounded-xl",
        isSelected
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted-foreground/10"
      )}
    >
      {isSelected && (
        <div className="absolute inset-y-2 left-0 w-1 bg-primary rounded-r-md" />
      )}

      <Avatar className="h-10 w-10 border flex-shrink-0">
        <AvatarImage src={otherParticipantAvatar || ''} alt={otherParticipantName} data-ai-hint={otherParticipantType === 'store' ? 'logo business' : 'avatar person'} />
        <AvatarFallback>
          {otherParticipantType === 'store'
            ? <Store className="h-5 w-5 text-muted-foreground" />
            : <User className="h-5 w-5 text-muted-foreground" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h3 className="text-base font-semibold truncate flex-grow pr-2">
            {otherParticipantName}
          </h3>
          <p className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(lastMessageDate, { addSuffix: true, locale: el })} {/* Used lastMessageDate */}
          </p>
        </div>
        <div className="flex justify-between items-center">
            <p className={cn(
                "text-sm truncate pr-2",
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