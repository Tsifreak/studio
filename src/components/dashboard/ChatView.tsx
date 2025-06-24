// src/components/dashboard/ChatView.tsx
"use client";

import type { ChatMessage, ChatMessageFormData, Chat } from '@/lib/types'; // Import Chat type
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Send, UserCircle, Image as ImageIcon, XCircle, MessageSquareOff, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatViewProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (formData: { text: string; imageFile?: File | null }) => Promise<void>;
  isLoading: boolean;
  selectedChatDetails: Chat | null; // ADDED THIS PROP
}

const messageFormSchema = z.object({
  text: z.string().max(1000, { message: "Το μήνυμα υπερβαίνει το όριο των 1000 χαρακτήρων." }),
});

type ClientMessageFormValues = z.infer<typeof messageFormSchema>;


export function ChatView({ messages, currentUserId, onSendMessage, isLoading, selectedChatDetails }: ChatViewProps) { // DESTRUCTURED HERE
  const { user } = useAuth(); 
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ClientMessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      text: '',
    },
  });
  const {formState: {isSubmitting}} = form;

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Σφάλμα Φόρτωσης Εικόνας",
          description: "Το μέγεθος του αρχείου δεν πρέπει να υπερβαίνει τα 5MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: ClientMessageFormValues) => {
    if (!data.text && !selectedImage) {
      form.setError("text", { type: "manual", message: "Πρέπει να εισαγάγετε ένα μήνυμα ή να επιλέξετε μια εικόνα." });
      return;
    }
    // Added check for selectedChatDetails
    if (!user || !selectedChatDetails) {
        toast({
            title: "Σφάλμα Αποστολής",
            description: "Δεν είναι δυνατή η αποστολή μηνύματος. Οι λεπτομέρειες συνομιλίας δεν είναι διαθέσιμες.",
            variant: "destructive",
        });
        return;
    }
    try {
      const recipientId = user.id === selectedChatDetails.userId ? selectedChatDetails.ownerId : selectedChatDetails.userId;
      // You also need chatId here to send the message, as per your sendMessage function signature
      // Assuming you already have selectedChatId available through context or another prop
      // Or you can derive it from selectedChatDetails.id
      const chatIdFromDetails = selectedChatDetails.id;
      
      await onSendMessage({ text: data.text, imageFile: selectedImage }); // onSendMessage already has what it needs from CombinedChatPage
      form.reset();
      removeSelectedImage();
    } catch (error) {
      console.error("ChatView: Failed to send message", error);
       toast({
        title: "Αποτυχία Αποστολής",
        description: "Δεν ήταν δυνατή η αποστολή του μηνύματος. Προσπαθήστε ξανά.",
        variant: "destructive",
      });
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
    <div className="flex flex-col flex-grow bg-card overflow-hidden">
      <ScrollArea className="flex-grow p-4 space-y-4 custom-scrollbar" ref={scrollAreaRef}>
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Φόρτωση μηνυμάτων...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquareOff className="w-12 h-12 mb-2" />
            <p>Δεν υπάρχουν μηνύματα σε αυτή τη συνομιλία ακόμη.</p>
            <p>Στείλτε το πρώτο σας μήνager!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUserSender = msg.senderId === currentUserId;
            // The logic to get the other participant's avatar for the message bubble
            // should depend on who the sender of *this message* is, not the overall chatDetails.
            // However, if the avatar needs to be consistent for the 'other' side,
            // selectedChatDetails is used to determine which one is 'other'.

            // For the sender's avatar within the message stream:
            // If the message is from the current user, use current user's avatar.
            // If the message is from the other participant, use their avatar from selectedChatDetails.
            const messageSenderAvatar = isCurrentUserSender
                ? user?.avatarUrl // Current user's avatar
                : (selectedChatDetails // Other participant's avatar
                    ? (msg.senderId === selectedChatDetails.userId ? selectedChatDetails.userAvatarUrl : selectedChatDetails.storeLogoUrl)
                    : null); // Fallback if selectedChatDetails is null/undefined

            const messageSenderName = isCurrentUserSender
                ? user?.name
                : (selectedChatDetails
                    ? (msg.senderId === selectedChatDetails.userId ? selectedChatDetails.userName : selectedChatDetails.storeName)
                    : msg.senderName); // Fallback to msg.senderName if selectedChatDetails is null/undefined

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-end gap-2 mb-2",
                  isCurrentUserSender ? 'justify-end' : 'justify-start'
                )}
              >
                {!isCurrentUserSender && (
                  <Avatar className="h-8 w-8 border self-start">
                    <AvatarImage src={messageSenderAvatar || ''} alt={messageSenderName || 'Sender Avatar'} />
                    <AvatarFallback>
                      {messageSenderName?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[85%] p-1 rounded-lg shadow",
                    isCurrentUserSender
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted text-foreground rounded-bl-none'
                  )}
                >
                  {msg.imageUrl && (
                    <div className="m-2 rounded-md overflow-hidden">
                      <Image 
                          src={msg.imageUrl} 
                          alt="Συνημμένη εικόνα" 
                          width={200} 
                          height={200} 
                          className="object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(msg.imageUrl, '_blank')}
                          data-ai-hint="chat image"
                      />
                    </div>
                  )}
                  {msg.text && <p className="text-sm whitespace-pre-line px-2 py-1">{msg.text}</p>}
                  <p className={`text-xs mt-1 px-2 pb-1 ${isCurrentUserSender ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/80 text-left'}`}>
                    {format(new Date(msg.createdAt), 'p, MMM d', { locale: el })}
                  </p>
                </div>
                {isCurrentUserSender && user?.avatarUrl && ( // This condition ensures avatar only shows if current user has an avatar
                  <Avatar className="h-8 w-8 border self-start">
                    <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="avatar person"/>
                    <AvatarFallback>{user.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
      </ScrollArea>
      {previewUrl && (
        <div className="p-2 border-t bg-background relative">
          <Image src={previewUrl} alt="Προεπισκόπηση εικόνας" width={80} height={80} className="rounded-md object-cover" data-ai-hint="image preview"/>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 text-muted-foreground hover:text-destructive"
            onClick={removeSelectedImage}
          >
            <XCircle className="h-5 w-5" />
            <span className="sr-only">Κατάργηση εικόνας</span>
          </Button>
        </div>
      )}
      <div className="p-4 border-t bg-background flex-shrink-0">
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex items-center bg-white border rounded-full px-4 py-2 shadow-sm gap-2">
        
        {/* 📎 Image Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-blue-500 hover:text-blue-600 focus:outline-none disabled:opacity-50"
          disabled={isSubmitting}
        >
          <ImageIcon className="h-5 w-5" />
          <span className="sr-only">Επισύναψη εικόνας</span>
        </button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
          disabled={isSubmitting}
        />

        {/* 💬 Text Input */}
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem className="flex-grow">
              <FormControl>
                <input
                  {...field}
                  placeholder="Γράψτε ένα μήνυμα..."
                  autoComplete="off"
                  disabled={isSubmitting}
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                />
              </FormControl>
              <FormMessage className="text-xs px-1" />
            </FormItem>
          )}
        />

        {/* 📤 Send Button */}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 disabled:opacity-50"
          disabled={isSubmitting || (!form.getValues("text") && !selectedImage)}
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          <span className="sr-only">Αποστολή</span>
        </button>
      </div>
    </form>
  </Form>
</div>
    </div>
  );
}