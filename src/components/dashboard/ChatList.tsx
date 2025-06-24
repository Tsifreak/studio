
// components/dashboard/ChatList.tsx
"use client";

import type { Chat } from '@/lib/types';
import { ChatItem } from './ChatItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquareOff } from 'lucide-react';

interface ChatListProps {
  chats: Chat[];
  currentUserId: string;
  onSelectChat: (chatId: string) => void; // New prop for selecting a chat
  selectedChatId: string | null; // New prop to indicate the currently selected chat
}

export function ChatList({ chats, currentUserId, onSelectChat, selectedChatId }: ChatListProps) {
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
    <div className="space-y-1 p-2"> {/* Adjusted padding and spacing */}
      {chats.map((chat) => (
        <ChatItem 
          key={chat.id} 
          chat={chat} 
          currentUserId={currentUserId} 
          onSelect={() => onSelectChat(chat.id)} // Pass the handler
          isSelected={chat.id === selectedChatId} // Pass selection state
        />
      ))}
    </div>
  );
}