"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserChats, markChatAsRead, subscribeToChatMessages, sendMessage } from '@/lib/chatService';
import type { Chat, ChatMessage } from '@/lib/types';
import { ChatList } from '@/components/dashboard/ChatList';
import { ChatView } from '@/components/dashboard/ChatView';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import type { Unsubscribe } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';

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
    if (!user) return;

    const fetchChats = async () => {
      setIsLoadingChats(true);
      try {
        const userChats = await getUserChats(user.id);
        setChats(userChats);

        const currentUrlChatId = searchParams.get('chatId');
        let initialChatToSelectId = currentUrlChatId || (userChats[0]?.id ?? null);

        if (initialChatToSelectId && initialChatToSelectId !== selectedChatId) {
          setSelectedChatId(initialChatToSelectId);
          router.replace(`/dashboard/chats?chatId=${initialChatToSelectId}`);
        }
      } catch (err) {
        console.error("Failed to fetch chats:", err);
        setError("Δεν ήταν δυνατή η φόρτωση των συνομιλιών σας. Παρακαλώ δοκιμάστε ξανά.");
      } finally {
        setIsLoadingChats(false);
      }
    };
    fetchChats();
  }, [user, authLoading, searchParams, router]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    if (!user || !selectedChatId) {
      setMessages([]);
      setSelectedChatDetails(null);
      setIsLoadingMessages(false);
      return;
    }

    const currentChat = chats.find(c => c.id === selectedChatId);
    if (!currentChat) {
      setIsLoadingMessages(true);
      setSelectedChatDetails(null);
      return;
    }

    setSelectedChatDetails(currentChat);
    setIsLoadingMessages(true);
    setError(null);

    markChatAsRead(selectedChatId, user.id).catch(err => console.warn("Failed to mark chat as read:", err));

    unsubscribe = subscribeToChatMessages(selectedChatId, (newMessages) => {
      setMessages(newMessages);
      setIsLoadingMessages(false);
    });

    return () => unsubscribe?.();
  }, [user, selectedChatId, chats]);

  const handleSelectChat = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
    router.replace(`/dashboard/chats?chatId=${chatId}`);
  }, [router]);

  const handleSendMessage = useCallback(async (formData: { text: string; imageFile?: File | null }) => {
    if (!user || !selectedChatId || !selectedChatDetails) {
      toast({
        title: "Σφάλμα Αποστολής",
        description: "Δεν είναι δυνατή η αποστολή μηνύματος.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.text && !formData.imageFile) {
      toast({
        title: "Κενό Μήνυμα",
        description: "Δεν μπορείτε να στείλετε ένα εντελώς κενό μήνυμα.",
        variant: "destructive",
      });
      return;
    }
    try {
      const recipientId = user.id === selectedChatDetails.userId
        ? selectedChatDetails.ownerId
        : selectedChatDetails.userId;

      await sendMessage(selectedChatId, user.id, user.name, formData.text, recipientId, formData.imageFile);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast({
        title: "Αποτυχία Αποστολής",
        description: "Παρουσιάστηκε σφάλμα κατά την αποστολή του μηνύματος.",
        variant: "destructive",
      });
    }
  }, [user, selectedChatId, selectedChatDetails, toast]);

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

  const otherParticipantName = selectedChatDetails
    ? (user.id === selectedChatDetails.userId ? selectedChatDetails.storeName : selectedChatDetails.userName)
    : 'Επιλέξτε Συνομιλία';

  const otherParticipantAvatar = selectedChatDetails
    ? (user.id === selectedChatDetails.userId ? selectedChatDetails.storeLogoUrl : selectedChatDetails.userAvatarUrl)
    : '';

  return (
    <div className="p-4 bg-[#f8f8f8] min-h-screen"> {/* light custom blue */}
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
                messages={messages}
                currentUserId={user.id}
                onSendMessage={handleSendMessage}
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
