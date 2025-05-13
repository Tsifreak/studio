
"use client";

import type { Chat } from '@/lib/types';
import { ChatItem } from './ChatItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquareOff } from 'lucide-react';

interface ChatListProps {
  chats: Chat[];
  currentUserId: string;
}

export function ChatList({ chats, currentUserId }: ChatListProps) {
  if (chats.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Καμία Συνομιλία</CardTitle>
          <CardDescription>Δεν έχετε ενεργές συνομιλίες αυτή τη στιγμή.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <MessageSquareOff className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Όταν ξεκινήσετε μια συνομιλία με ένα κέντρο, θα εμφανιστεί εδώ.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {chats.map((chat) => (
        <ChatItem key={chat.id} chat={chat} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
