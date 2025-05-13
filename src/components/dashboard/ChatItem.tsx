
"use client";

import type { Chat } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowRight, User, Storefront } from 'lucide-react'; // Storefront as a generic store icon
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';

interface ChatItemProps {
  chat: Chat;
  currentUserId: string;
}

export function ChatItem({ chat, currentUserId }: ChatItemProps) {
  const isCurrentUserSender = chat.lastMessageSenderId === currentUserId;
  const otherParticipantName = currentUserId === chat.userId ? chat.storeName : chat.userName;
  const otherParticipantAvatar = currentUserId === chat.userId ? chat.storeLogoUrl : chat.userAvatarUrl;
  const otherParticipantType = currentUserId === chat.userId ? 'store' : 'user';

  const unreadCount = currentUserId === chat.userId ? chat.userUnreadCount : chat.ownerUnreadCount;

  return (
    <Link href={`/dashboard/chats/${chat.id}`} legacyBehavior>
      <a className="block hover:no-underline">
        <Card className="overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-200 cursor-pointer">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-12 w-12 border">
              <AvatarImage src={otherParticipantAvatar || ''} alt={otherParticipantName} data-ai-hint={otherParticipantType === 'store' ? 'logo business' : 'avatar person'} />
              <AvatarFallback>
                {otherParticipantType === 'store' 
                  ? <Storefront className="h-6 w-6 text-muted-foreground" /> 
                  : <User className="h-6 w-6 text-muted-foreground" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold text-primary mb-1">
                  {otherParticipantName}
                </CardTitle>
                {unreadCount > 0 && (
                  <span className="bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-full">
                    {unreadCount} {unreadCount === 1 ? 'Νέο' : 'Νέα'}
                  </span>
                )}
              </div>
              <p className={`text-sm truncate ${unreadCount > 0 && !isCurrentUserSender ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                {isCurrentUserSender && "Εσείς: "}
                {chat.lastMessageText || "Δεν υπάρχουν μηνύματα ακόμη."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true, locale: el })}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}
