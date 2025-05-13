
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getChatMessages, markChatAsRead, subscribeToChatMessages, sendMessage, getUserChats } from '@/lib/chatService';
import type { ChatMessage, Chat, ChatMessageFormData } from '@/lib/types';
import { ChatView } from '@/components/dashboard/ChatView';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Send, ShieldAlert } from 'lucide-react';
import type { Unsubscribe } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Added import

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatDetails, setChatDetails] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chat details to determine participants
  useEffect(() => {
    if (user && chatId) {
      const fetchChatDetails = async () => {
        try {
          // Fetch all user chats and find the current one by ID
          // This is less direct than fetching a single chat doc, but works with existing getUserChats
          const allChats = await getUserChats(user.id); 
          const currentChat = allChats.find(c => c.id === chatId);
          if (currentChat) {
            setChatDetails(currentChat);
          } else {
            setError("Η συνομιλία δεν βρέθηκε ή δεν έχετε πρόσβαση.");
          }
        } catch (err) {
          console.error("Failed to fetch chat details:", err);
          setError("Σφάλμα φόρτωσης λεπτομερειών συνομιλίας.");
        }
      };
      fetchChatDetails();
    }
  }, [user, chatId]);


  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user && chatId && chatDetails) { // Ensure chatDetails are loaded
      setIsLoading(true);
      setError(null);

      markChatAsRead(chatId, user.id).catch(err => console.warn("Failed to mark chat as read:", err));
      
      unsubscribe = subscribeToChatMessages(chatId, (newMessages) => {
        setMessages(newMessages);
        setIsLoading(false);
      });

    } else if (!authLoading && !user) {
      setError("Πρέπει να είστε συνδεδεμένοι για να δείτε αυτή τη συνομιλία.");
      setIsLoading(false);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, chatId, authLoading, chatDetails]);

  const handleSendMessage = useCallback(async (formData: ChatMessageFormData) => {
    if (!user || !chatId || !chatDetails) {
      setError("Δεν είναι δυνατή η αποστολή μηνύματος. Ο χρήστης ή η συνομιλία δεν έχουν φορτωθεί.");
      return;
    }
    try {
      // Determine recipientId based on who the current user is
      const recipientId = user.id === chatDetails.userId ? chatDetails.ownerId : chatDetails.userId;
      await sendMessage(chatId, user.id, user.name, formData.text, recipientId);
      // Messages will update via the real-time listener
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Αποτυχία αποστολής μηνύματος. Παρακαλώ δοκιμάστε ξανά.");
       // Optionally, show toast to user
    }
  }, [user, chatId, chatDetails]);


  if (authLoading || (isLoading && !error && !messages.length)) {
     return (
      <div className="space-y-4 p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-16 w-3/4 self-start rounded-lg" />
        <Skeleton className="h-20 w-3/4 self-end rounded-lg bg-primary/20" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-6" />
        <h1 className="text-2xl font-bold text-destructive mb-4">Σφάλμα</h1>
        <p className="text-md text-muted-foreground mb-6">{error}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/chats">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Πίσω στις Συνομιλίες
          </Link>
        </Button>
      </div>
    );
  }

  if (!user || !chatDetails) {
    // This case should ideally be covered by error state or loading state
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
        <p className="text-muted-foreground">Φόρτωση συνομιλίας ή απαιτείται σύνδεση...</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/chats">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Πίσω στις Συνομιλίες
          </Link>
        </Button>
      </div>
    );
  }
  
  const otherParticipantName = user.id === chatDetails.userId ? chatDetails.storeName : chatDetails.userName;
  const otherParticipantAvatar = user.id === chatDetails.userId ? chatDetails.storeLogoUrl : chatDetails.userAvatarUrl;


  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,64px)-var(--page-padding,64px)-2px)] max-w-3xl mx-auto">
       <div className="flex items-center gap-4 mb-4 p-4 border-b sticky top-0 bg-background z-10">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/chats">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Πίσω στις Συνομιλίες</span>
          </Link>
        </Button>
        <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
                <AvatarImage src={otherParticipantAvatar || ''} alt={otherParticipantName} data-ai-hint={user.id === chatDetails.userId ? "logo business" : "avatar person"}/>
                <AvatarFallback>{otherParticipantName?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <h1 className="text-xl font-semibold text-primary truncate">{otherParticipantName}</h1>
        </div>
      </div>
      <ChatView
        messages={messages}
        currentUserId={user.id}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
