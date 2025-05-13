
"use client";

import type { ChatMessage, ChatMessageFormData } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Send, UserCircle, Store } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import React, { useEffect, useRef } from 'react';

interface ChatViewProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (formData: ChatMessageFormData) => Promise<void>;
}

const messageFormSchema = z.object({
  text: z.string().min(1, { message: "Το μήνυμα δεν μπορεί να είναι κενό." }).max(1000, { message: "Το μήνυμα υπερβαίνει το όριο των 1000 χαρακτήρων." }),
});

export function ChatView({ messages, currentUserId, onSendMessage }: ChatViewProps) {
  const { user } = useAuth(); // To get current user's avatar if needed, or senderName consistency
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const form = useForm<ChatMessageFormData>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      text: '',
    },
  });
  const {formState: {isSubmitting}} = form;

  const onSubmit = async (data: ChatMessageFormData) => {
    try {
      await onSendMessage(data);
      form.reset();
    } catch (error) {
      // Error handling is typically done in the parent component that calls onSendMessage
      console.error("ChatView: Failed to send message", error);
      // form.setError("text", { type: "server", message: "Failed to send."}) // Optionally set error on form
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);


  return (
    <div className="flex flex-col flex-grow bg-card border rounded-lg shadow-inner overflow-hidden">
      <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquareOff className="w-12 h-12 mb-2" />
            <p>Δεν υπάρχουν μηνύματα σε αυτή τη συνομιλία ακόμη.</p>
            <p>Στείλτε το πρώτο σας μήνυμα!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isCurrentUserSender = msg.senderId === currentUserId;
          // This part needs context of who the "other" user is. For now, assume senderName is sufficient.
          // We might need to pass otherParticipant's avatar/name if we want to show it per message.
          // However, typically avatars are only shown for the *other* person's messages.

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isCurrentUserSender ? 'justify-end' : 'justify-start'}`}
            >
              {!isCurrentUserSender && (
                <Avatar className="h-8 w-8 border self-start">
                  {/* Simplified: Assume if not current user, it's the "other" person. Avatar logic might need more context if group chat. */}
                  {/* For now, let's assume senderName is enough to find avatar if we enhance this. */}
                   <AvatarFallback>
                    {/* Heuristic: if sender is not current user, and current user is a customer, sender must be store. And vice-versa. */}
                    {/* This is a bit simplistic and might need refinement if chatDetails were passed down. */}
                    {user && user.id !== msg.senderId ? ( // Message from the other person
                         msg.senderName.charAt(0).toUpperCase()
                    ) : (
                        <UserCircle className="h-5 w-5" /> // Fallback if senderName is not clear for avatar
                    )}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] p-3 rounded-lg shadow ${
                  isCurrentUserSender
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted text-foreground rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{msg.text}</p>
                <p className={`text-xs mt-1 ${isCurrentUserSender ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/80 text-left'}`}>
                  {format(new Date(msg.createdAt), 'p, MMM d', { locale: el })}
                </p>
              </div>
               {isCurrentUserSender && user?.avatarUrl && (
                <Avatar className="h-8 w-8 border self-start">
                  <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="avatar person"/>
                  <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input
                      placeholder="Γράψτε ένα μήνυμα..."
                      autoComplete="off"
                      {...field}
                      className="h-10"
                    />
                  </FormControl>
                  <FormMessage className="text-xs px-1" />
                </FormItem>
              )}
            />
            <Button type="submit" size="icon" disabled={isSubmitting || !form.formState.isValid}>
              <Send className="h-5 w-5" />
              <span className="sr-only">Αποστολή</span>
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

// Helper icon if needed, not used by default now in ChatView to avoid clutter.
const MessageSquareOff = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM2 2l20 20" />
  </svg>
);
