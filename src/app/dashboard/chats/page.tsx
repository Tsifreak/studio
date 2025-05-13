
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserChats } from '@/lib/chatService';
import type { Chat } from '@/lib/types';
import { ChatList } from '@/components/dashboard/ChatList';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function ChatsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fetchChats = async () => {
        setIsLoadingChats(true);
        setError(null);
        try {
          const userChats = await getUserChats(user.id);
          setChats(userChats);
        } catch (err) {
          console.error("Failed to fetch chats:", err);
          setError("Δεν ήταν δυνατή η φόρτωση των συνομιλιών σας. Παρακαλώ δοκιμάστε ξανά.");
        } finally {
          setIsLoadingChats(false);
        }
      };
      fetchChats();
    } else if (!authLoading) {
      // If user is not loaded and auth is not loading, means user is not logged in.
      // Handled by dashboard layout, but as a fallback:
      setIsLoadingChats(false);
      setError("Πρέπει να είστε συνδεδεμένοι για να δείτε τις συνομιλίες σας.");
    }
  }, [user, authLoading]);

  if (authLoading || isLoadingChats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-12 w-full mb-4" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
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
            Πίσω στον Πίνακα Ελέγχου
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
          <Link href="/login?redirect=/dashboard/chats">Σύνδεση</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Πίσω στον Πίνακα Ελέγχου</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-primary">Οι Συνομιλίες μου</h1>
      </div>
      <ChatList chats={chats} currentUserId={user.id} />
    </div>
  );
}
