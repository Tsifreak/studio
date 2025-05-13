
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
import { Send, UserCircle, Image as ImageIcon, XCircle } from 'lucide-react'; // Added ImageIcon, XCircle
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image'; // For displaying images
import { useToast } from '@/hooks/use-toast';


interface ChatViewProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (formData: { text: string; imageFile?: File | null }) => Promise<void>;
}

// Zod schema now only validates text for max length. Min length handled in onSubmit.
const messageFormSchema = z.object({
  text: z.string().max(1000, { message: "Το μήνυμα υπερβαίνει το όριο των 1000 χαρακτήρων." }),
});

type ClientMessageFormValues = z.infer<typeof messageFormSchema>;


export function ChatView({ messages, currentUserId, onSendMessage }: ChatViewProps) {
  const { user } = useAuth(); 
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ClientMessageFormValues>({ // Changed to ClientMessageFormValues
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
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const onSubmit = async (data: ClientMessageFormValues) => {
    if (!data.text && !selectedImage) {
      form.setError("text", { type: "manual", message: "Πρέπει να εισάγετε ένα μήνυμα ή να επιλέξετε μια εικόνα." });
      return;
    }
    try {
      await onSendMessage({ text: data.text, imageFile: selectedImage });
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
          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isCurrentUserSender ? 'justify-end' : 'justify-start'}`}
            >
              {!isCurrentUserSender && (
                <Avatar className="h-8 w-8 border self-start">
                   <AvatarFallback>
                    {user && user.id !== msg.senderId ? ( 
                         msg.senderName.charAt(0).toUpperCase()
                    ) : (
                        <UserCircle className="h-5 w-5" /> 
                    )}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] p-1 rounded-lg shadow ${
                  isCurrentUserSender
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted text-foreground rounded-bl-none'
                }`}
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
      <div className="p-4 border-t bg-background">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <ImageIcon className="h-5 w-5" />
              <span className="sr-only">Επισύναψη εικόνας</span>
            </Button>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              className="hidden" 
              disabled={isSubmitting}
            />
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
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-xs px-1" />
                </FormItem>
              )}
            />
            <Button type="submit" size="icon" disabled={isSubmitting || (!form.getValues("text") && !selectedImage) }>
              <Send className="h-5 w-5" />
              <span className="sr-only">Αποστολή</span>
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

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
