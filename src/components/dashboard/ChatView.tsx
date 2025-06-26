// src/components/dashboard/ChatView.tsx
"use client";

import type { ChatMessage, Chat, FormRequestMessageContent, FormResponseMessageContent } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Send, Image as ImageIcon, XCircle, MessageSquareOff, Loader2, FileText } from 'lucide-react'; // Import FileText
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid'; // Import uuid generator
import { CAR_DETAILS_FORM_DEFINITION } from '@/lib/types'; // Import the form definition

// NEW IMPORT: The component that renders the interactive form for the user
import { DynamicFormRequestMessage } from './DynamicFormRequestMessage';


// --- MODIFIED: ChatViewProps to accept new message options and form response handler ---
interface ChatViewProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (formData: {
    text?: string;
    imageFile?: File | null;
    formRequest?: FormRequestMessageContent;
    formResponse?: FormResponseMessageContent;
  }) => Promise<void>;
  onSendFormResponse: ( // NEW: A separate handler for when the form inside a message is submitted
    chatId: string,
    senderId: string,
    senderName: string,
    formResponseContent: FormResponseMessageContent
  ) => Promise<void>;
  isLoading: boolean;
  selectedChatDetails: Chat | null;
}

const messageFormSchema = z.object({
  text: z.string().max(1000, { message: "Το μήνυμα υπερβαίνει το όριο των 1000 χαρακτήρων." }),
});

type ClientMessageFormValues = z.infer<typeof messageFormSchema>;


export function ChatView({ messages, currentUserId, onSendMessage, onSendFormResponse, isLoading, selectedChatDetails }: ChatViewProps) {
  console.log("ChatView render — selectedChatId:", selectedChatDetails?.id, "messages:", messages.length);
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
  const { formState: { isSubmitting } } = form;

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
    if (!user || !selectedChatDetails) {
      toast({
        title: "Σφάλμα Αποστολής",
        description: "Δεν είναι δυνατή η αποστολή μηνύματος. Λεπτομέρειες συνομιλίας δεν είναι διαθέσιμες.",
        variant: "destructive",
      });
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

  const handleSendCarDetailsForm = useCallback(async () => {
    if (!selectedChatDetails || !user) {
      toast({
        title: "Σφάλμα",
        description: "Δεν είναι δυνατή η αποστολή φόρμας. Λεπτομέρειες συνομιλίας ή χρήστης λείπουν.",
        variant: "destructive",
      });
      return;
    }

    const instanceId = uuidv4();

    const formRequestContent: FormRequestMessageContent = {
      formId: CAR_DETAILS_FORM_DEFINITION.id,
      formName: CAR_DETAILS_FORM_DEFINITION.name,
      formDescription: CAR_DETAILS_FORM_DEFINITION.description,
      formFields: CAR_DETAILS_FORM_DEFINITION.fields,
      instanceId: instanceId,
      status: 'sent',
    };

    try {
      await onSendMessage({ formRequest: formRequestContent });
      toast({
        title: "Φόρμα Απεστάλη",
        description: "Η φόρμα στοιχείων οχήματος στάλθηκε επιτυχώς.",
      });
    } catch (error) {
      console.error("Failed to send car details form:", error);
      toast({
        title: "Σφάλμα Αποστολής Φόρμας",
        description: "Δεν ήταν δυνατή η αποστολή της φόρμας. Παρακαλώ δοκιμάστε ξανά.",
        variant: "destructive",
      });
    }
  }, [selectedChatDetails, user, onSendMessage, toast]);


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
            <p>Στείλτε το πρώτο σας μήνυμα!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUserSender = msg.senderId === currentUserId;
            const messageSenderAvatar = isCurrentUserSender
              ? user?.avatarUrl
              : (selectedChatDetails
                ? (msg.senderId === selectedChatDetails.userId ? selectedChatDetails.userAvatarUrl : selectedChatDetails.storeLogoUrl)
                : null);

            const messageSenderName = isCurrentUserSender
              ? user?.name
              : (selectedChatDetails
                ? (msg.senderId === selectedChatDetails.userId ? selectedChatDetails.userName : selectedChatDetails.storeName)
                : msg.senderName);

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
                  {/* --- CONDITIONAL RENDERING BASED ON MESSAGE TYPE --- */}
                  {/* Render Image Message */}
                  {msg.type === 'image' && msg.imageUrl && (
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
                  {/* Render Text Message */}
                  {msg.type === 'text' && msg.text && <p className="text-sm whitespace-pre-line px-2 py-1">{msg.text}</p>}

                  {/* Render Dynamic Form Request Message component */}
                  {msg.type === 'form_request' && msg.formRequestContent && selectedChatDetails && (
                    <DynamicFormRequestMessage
                      formRequestContent={msg.formRequestContent}
                      chatId={selectedChatDetails.id}
                      senderId={msg.senderId}
                      onSendFormResponse={onSendFormResponse}
                      currentUserId={currentUserId}
                      currentUserDisplayName={user?.name || "Άγνωστος Χρήστης"}
                      isFormAlreadyFilled={messages.some(
                          (m) =>
                              m.type === 'form_response' &&
                              m.formResponseContent?.instanceId === msg.formRequestContent?.instanceId &&
                              m.senderId === currentUserId
                      )}
                    />
                  )}

                  {/* Render Form Response Message (you might create a separate component for this too) */}
                  {msg.type === 'form_response' && msg.formResponseContent && (
                    <div className="p-3 bg-white rounded-md border text-left">
                      {/* --- FIX: Changed text color to #004fe3 --- */}
                      <h4 className="font-semibold text-base mb-1" style={{ color: '#004fe3' }}>
                        Απάντηση Φόρμας: {msg.formResponseContent.formName}
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {Object.entries(msg.formResponseContent.filledData).map(([key, value]) => {
                          const fieldDef = CAR_DETAILS_FORM_DEFINITION.fields.find(f => f.id === key);
                          return (
                            <p key={key}>
                              <strong>{fieldDef?.label || key}:</strong> {value?.toString()}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <p className={`text-xs mt-1 px-2 pb-1 ${isCurrentUserSender ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/80 text-left'}`}>
                    {format(new Date(msg.createdAt as string), 'p, MMM d', { locale: el })}
                  </p>
                </div>
                {isCurrentUserSender && user?.avatarUrl && (
                  <Avatar className="h-8 w-8 border self-start">
                    <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="avatar person" />
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
          <Image src={previewUrl} alt="Προεπισκόπηση εικόνας" width={80} height={80} className="rounded-md object-cover" data-ai-hint="image preview" />
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

              {/* NEW BUTTON TO SEND FORM - Only show if current user is the owner */}
              {selectedChatDetails && user?.id === selectedChatDetails.ownerId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleSendCarDetailsForm}
                  className="shrink-0 text-blue-500 hover:text-blue-600"
                  title="Αποστολή Φόρμας Στοιχείων Οχήματος"
                  disabled={isSubmitting}
                >
                  <FileText className="h-5 w-5" />
                  <span className="sr-only">Αποστολή Φόρμας</span>
                </Button>
              )}

              {/* 📤 Send Button */}
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 disabled:opacity-50"
                disabled={isSubmitting || (!form.getValues("text") && !selectedImage && !form.formState.isDirty)}
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