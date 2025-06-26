// src/app/dashboard/chats/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserChats, markChatAsRead, subscribeToChatMessages, sendMessage } from '@/lib/chatService';
import type { Chat, ChatMessage, FormRequestMessageContent, FormResponseMessageContent } from '@/lib/types';
import { ChatList } from '@/components/dashboard/ChatList';
import { ChatView } from '@/components/dashboard/ChatView';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, MessageSquareOff } from 'lucide-react';
import type { Unsubscribe } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useRouter } from 'next/navigation';

export default function CombinedChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(searchParams.get('chatId'));
  const [selectedChatDetails, setSelectedChatDetails] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user && !authLoading) {
      setIsLoadingChats(false);
      setError("Πρέπει να είστε συνδεδεμένοι για να δείτε τις συνομιλίες σας.");
      return;
    }
    if (!user) return; // Wait for user to be loaded if authLoading is true

    const fetchChats = async () => {
      setIsLoadingChats(true);
      try {
        const userChats = await getUserChats(user.id);
        setChats(userChats);
        console.log("CombinedChatPage (useEffect: fetchChats): Fetched chats:", userChats);

        const currentUrlChatId = searchParams.get('chatId');
        let initialChatToSelectId = currentUrlChatId;

        // If no chat ID in URL, try to select the first chat from the fetched list
        if (!initialChatToSelectId && userChats.length > 0) {
          initialChatToSelectId = userChats[0].id;
          console.log("CombinedChatPage (useEffect: fetchChats): No chatId in URL, setting initial to first chat:", initialChatToSelectId);
        }

        // Only update state and URL if a different chat is selected or needs to be set
        if (!selectedChatId && initialChatToSelectId) {
          console.log("CombinedChatPage (useEffect: fetchChats): No selectedChatId yet, setting to", initialChatToSelectId);
          setSelectedChatId(initialChatToSelectId);
          router.replace(`/dashboard/chats?chatId=${initialChatToSelectId}`);
        } else if (initialChatToSelectId && initialChatToSelectId === selectedChatId) {
            console.log("CombinedChatPage (useEffect: fetchChats): selectedChatId already matches URL/initial:", selectedChatId);
        } else if (!initialChatToSelectId && userChats.length === 0) {
            console.log("CombinedChatPage (useEffect: fetchChats): No chats available, clearing selection.");
            setSelectedChatId(null);
            setSelectedChatDetails(null);
        } else {
            console.log("CombinedChatPage (useEffect: fetchChats): No new initial chat to select or already selected.");
        }
      } catch (err) {
        console.error("CombinedChatPage (useEffect: fetchChats): Failed to fetch chats:", err);
        setError("Δεν ήταν δυνατή η φόρτωση των συνομιλιών σας. Παρακαλώ δοκιμάστε ξανά.");
      } finally {
        setIsLoadingChats(false);
      }
    };
    fetchChats();
  }, [user, authLoading, searchParams, router, selectedChatId]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    
    // Check for user and selectedChatId first
    if (!user || !selectedChatId) {
      console.log("CombinedChatPage (useEffect: subscribe): No user or selectedChatId. Clearing messages and details.");
      setMessages([]);
      setSelectedChatDetails(null);
      setIsLoadingMessages(false);
      return;
    }

    // --- FIX STARTS HERE ---
    // Instead of immediately finding, ensure 'chats' is stable or re-fetch details
    const chatDetailsFromChats = chats.find(c => c.id === selectedChatId);

    // If chat details are not found in the 'chats' array, it means either:
    // 1. 'chats' is still loading/empty.
    // 2. 'chats' hasn't updated yet.
    // In this case, we temporarily clear details and wait for 'chats' to become consistent.
    if (!chatDetailsFromChats) {
      console.log("CombinedChatPage (useEffect: subscribe): selectedChatId", selectedChatId, "not found in current chats list. Waiting for 'chats' to update or be consistent. Current chats:", chats.map(c => c.id));
      setSelectedChatDetails(null); // Clear details to show loading/empty state
      setIsLoadingMessages(true); // Indicate loading
      return; // Exit and wait for next render cycle when 'chats' might be populated
    }
    // --- FIX ENDS HERE ---


    console.log("CombinedChatPage (useEffect: subscribe): Successfully found selectedChatDetails:", chatDetailsFromChats);
    setSelectedChatDetails(chatDetailsFromChats); // Set the chat details
    setIsLoadingMessages(true);
    setError(null);

    markChatAsRead(selectedChatId, user.id).catch(err => console.warn("CombinedChatPage (useEffect: subscribe): Failed to mark chat as read:", err));

    unsubscribe = subscribeToChatMessages(selectedChatId, (newMessages) => {
      console.log("CombinedChatPage (useEffect: subscribe): Messages updated for chat", selectedChatId, ":", newMessages.length, "messages.");
      setMessages(newMessages);
      setIsLoadingMessages(false);
    });

    return () => unsubscribe?.();
  }, [user, selectedChatId, chats]); // Re-run effect when user, selectedChatId, or chats change

  const handleSelectChat = useCallback((chatId: string) => {
      console.log("CombinedChatPage (handleSelectChat): Chat item clicked, trying to select:", chatId);
      if (chatId === selectedChatId) {
          console.log("CombinedChatPage (handleSelectChat): Clicked on already selected chat, no change needed:", chatId);
          return;
      }
      setSelectedChatId(chatId);
      router.replace(`/dashboard/chats?chatId=${chatId}`);
  }, [router, selectedChatId]);

  const handleSendMessage = useCallback(async (messageOptions: {
    text?: string;
    imageFile?: File | null;
    formRequest?: FormRequestMessageContent;
    formResponse?: FormResponseMessageContent;
  }) => {
    if (!user || !selectedChatId || !selectedChatDetails) {
      toast({
        title: "Σφάλμα Αποστολής",
        description: "Δεν είναι δυνατή η αποστολή μηνύματος. Λεπτομέρειες συνομιλίας δεν είναι διαθέσιμες.",
        variant: "destructive",
      });
      console.error("CombinedChatPage (handleSendMessage): Cannot send message. User, selectedChatId or selectedChatDetails missing.");
      return;
    }
    if (!messageOptions.text && !messageOptions.imageFile && !messageOptions.formRequest && !messageOptions.formResponse) {
      toast({
        title: "Κενό Μήνυμα",
        description: "Δεν μπορείτε να στείλετε ένα εντελώς κενό μήνυμα.",
        variant: "destructive",
      });
      console.warn("CombinedChatPage (handleSendMessage): Attempted to send empty message.");
      return;
    }
    try {
      console.log("CombinedChatPage (handleSendMessage): Sending message with options:", messageOptions);
      await sendMessage(selectedChatId, user.id, user.name, messageOptions);
      console.log("CombinedChatPage (handleSendMessage): Message sent successfully.");
    } catch (err) {
      console.error("CombinedChatPage (handleSendMessage): Failed to send message:", err);
      toast({
        title: "Αποτυχία Αποστολής",
        description: "Παρουσιάστηκε σφάλμα κατά την αποστολή του μηνύματος.",
        variant: "destructive",
      });
    }
  }, [user, selectedChatId, selectedChatDetails, toast]);


  const handleSendFormResponse = useCallback(async (
    chatId: string,
    senderId: string,
    senderName: string,
    formResponseContent: FormResponseMessageContent
  ) => {
    try {
      console.log("CombinedChatPage (handleSendFormResponse): Sending form response for chat", chatId, "content:", formResponseContent);
      await sendMessage(chatId, senderId, senderName, { formResponse: formResponseContent });
      console.log("CombinedChatPage (handleSendFormResponse): Form response sent successfully.");
    } catch (error) {
      console.error("CombinedChatPage (handleSendFormResponse): Failed to send form response:", error);
      toast({
        title: "Σφάλμα Αποστολής Απάντησης Φόρμας",
        description: "Παρουσιάστηκε σφάλμα κατά την αποστολή της απάντησής σας.",
        variant: "destructive",
      });
    }
  }, [toast]);


  if (authLoading || isLoadingChats) {
    return (
      <div className="flex h-screen">
        <div className="w-1/3 border-r p-4 space-y-4">
          <Skeleton className="h-10 w-2/3 mb-4" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex items-center gap-4 mb-4 pb-4 border-b">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex-grow space-y-4 overflow-y-auto">
            <div className="flex justify-start"><Skeleton className="h-16 w-3/5 rounded-lg" /></div>
            <div className="flex justify-end"><Skeleton className="h-20 w-3/4 rounded-lg" /></div>
          </div>
          <div className="p-4 border-t"><Skeleton className="h-10 w-full rounded-md" /></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-6" />
        <h1 className="text-2xl font-bold text-destructive mb-4">Σφάλμα Φόρτωσης</h1>
        <p className="text-md text-muted-foreground mb-6">{error}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>Πίσω στον Πίνακα Ελέγχου</span>
          </Link>
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
        <ShieldAlert className="w-16 h-16 text-primary mb-6" />
        <h1 className="text-2xl font-bold text-primary mb-4">Απαιτείται Σύνδεση</h1>
        <p className="text-md text-muted-foreground mb-6">
          Πρέπει να είστε συνδεδεμένοι για να δείτε τις συνομιλίες σας.
        </p>
        <Button asChild>
          <Link href="/login?redirect=/dashboard/chats">
            <span>Σύνδεση</span>
          </Link>
        </Button>
      </div>
    );
  }

  if (!isLoadingChats && chats.length === 0 && !selectedChatId) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
            <MessageSquareOff className="w-16 h-16 text-muted-foreground mb-6" />
            <h1 className="text-2xl font-bold mb-4">Δεν υπάρχουν συνομιλίες</h1>
            <p className="text-md text-muted-foreground mb-6">
                Δεν έχετε ξεκινήσει καμία συνομιλία ακόμη.
            </p>
            <Button asChild>
                <Link href="/">
                    Αναζήτηση Καταστημάτων
                </Link>
            </Button>
        </div>
    );
  }


  const otherParticipantName = selectedChatDetails
    ? (user.id === selectedChatDetails.userId ? selectedChatDetails.storeName : selectedChatDetails.userName)
    : 'Επιλέξτε Συνομιλία';

  const otherParticipantAvatar = selectedChatDetails
    ? (user.id === selectedChatDetails.userId ? selectedChatDetails.storeLogoUrl : selectedChatDetails.userAvatarUrl)
    : '';

  return (
    <div className="p-4 bg-[#f8f8f8] min-h-screen">
      <div className="flex h-[calc(100vh-128px)] bg-white overflow-hidden rounded-2xl border shadow-sm">
        <div className="w-80 border-r flex flex-col flex-shrink-0">
          <div className="p-4 border-b">
            <h1 className="text-2xl font-bold text-primary">Συνομιλίες</h1>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ChatList
              chats={chats}
              currentUserId={user.id}
              onSelectChat={handleSelectChat}
              selectedChatId={selectedChatId}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedChatId && selectedChatDetails ? (
            <>
              <div
                className="flex items-center justify-between p-4 border-b z-10 flex-shrink-0"
                style={{ backgroundColor: 'rgba(0,79,227,255)' }}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={otherParticipantAvatar || ''} alt={otherParticipantName} />
                    <AvatarFallback>{otherParticipantName?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <h1 className="text-xl font-semibold text-white truncate">{otherParticipantName}</h1>
                </div>
              </div>
              <ChatView
  key={selectedChatDetails?.id} // 👈 Force remount when chat changes
  messages={messages}
  currentUserId={user.id}
  onSendMessage={handleSendMessage}
  onSendFormResponse={handleSendFormResponse}
  isLoading={isLoadingMessages}
  selectedChatDetails={selectedChatDetails}
/>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-4">
              <h2 className="text-xl font-semibold mb-2">Επιλέξτε μια συνομιλία</h2>
              <p>Επιλέξτε μια συνομιλία από την αριστερή πλευρά για να ξεκινήσετε.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}