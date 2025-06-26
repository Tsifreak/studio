import { db, storage } from '@/lib/firebase'; // Client SDK
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  writeBatch,
  Timestamp as ClientTimestamp,
  serverTimestamp as clientServerTimestamp,
  onSnapshot,
  type Unsubscribe,
  type QuerySnapshot,
  type DocumentData,
  type Firestore as ClientFirestore,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Chat, ChatMessage, FormRequestMessageContent, FormResponseMessageContent } from '@/lib/types'; // Import new types

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

// Helper to convert Firestore Timestamps to ISO strings
const mapTimestampToISO = (timestamp: any): string => { // Use 'any' for incoming to handle mixed types gracefully
  if (timestamp === undefined || timestamp === null) return new Date().toISOString();

  // Check if it's a Firestore Timestamp object with a toDate method
  if (typeof timestamp === 'object' && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  // If it's already a string, assume it's an ISO string and return it
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  // Handle FieldValue (like serverTimestamp()) - it's still pending, so use current time
  // This case should ideally not be hit for concrete timestamps read from DB, but good fallback.
  return new Date().toISOString();
};

// Adjusted mapDocToChat to ensure Timestamp conversion for lastMessageAt and createdAt
const mapDocToChat = (docSnapshot: DocumentData): Chat => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    storeId: data.storeId,
    storeName: data.storeName,
    storeLogoUrl: data.storeLogoUrl,
    userId: data.userId,
    userName: data.userName,
    userAvatarUrl: data.userAvatarUrl,
    ownerId: data.ownerId,
    // Ensure these are mapped correctly from Timestamp to string
    lastMessageAt: mapTimestampToISO(data.lastMessageAt),
    lastMessageText: data.lastMessageText,
    lastMessageSenderId: data.lastMessageSenderId,
    lastImageUrl: data.lastImageUrl,
    userUnreadCount: data.userUnreadCount || 0,
    ownerUnreadCount: data.ownerUnreadCount || 0,
    participantIds: data.participantIds || [],
    createdAt: mapTimestampToISO(data.createdAt),
  };
};

// MODIFIED: mapDocToChatMessage to handle new message types and content
const mapDocToChatMessage = (docSnapshot: DocumentData): ChatMessage => {
  const data = docSnapshot.data();
  const baseMessage: ChatMessage = {
    id: docSnapshot.id,
    senderId: data.senderId,
    senderName: data.senderName,
    createdAt: mapTimestampToISO(data.createdAt), // Convert timestamp to ISO string for client
    type: data.type || 'text', // Default to 'text' if type is not specified
  };

  if (baseMessage.type === 'text' || baseMessage.type === 'image') {
    baseMessage.text = data.text;
    baseMessage.imageUrl = data.imageUrl;
  } else if (baseMessage.type === 'form_request') {
    baseMessage.formRequestContent = data.formRequestContent;
  } else if (baseMessage.type === 'form_response') {
    baseMessage.formResponseContent = data.formResponseContent;
  }

  return baseMessage;
};

export const getUserChats = async (userId: string): Promise<Chat[]> => {
  try {
    const chatsRef = collection(db, CHATS_COLLECTION);
    const q = query(
      chatsRef,
      where('participantIds', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocToChat);
  } catch (error) {
    console.error(`Error fetching chats for user ${userId} (client SDK):`, error);
    throw error;
  }
};

export const subscribeToUserChats = (
  userId: string,
  onUpdate: (chats: Chat[]) => void
): Unsubscribe => {
  const chatsRef = collection(db, CHATS_COLLECTION);
  const q = query(
    chatsRef,
    where('participantIds', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const chats = querySnapshot.docs.map(mapDocToChat);
    onUpdate(chats);
  }, (error) => {
    console.error(`Error subscribing to chats for user ${userId} (client SDK):`, error);
    onUpdate([]);
  });

  return unsubscribe;
};

export const getChatMessages = async (chatId: string): Promise<ChatMessage[]> => {
  try {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocToChatMessage);
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId} (client SDK):`, error);
    throw error;
  }
};

export const subscribeToChatMessages = (
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void
): Unsubscribe => {
  const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION);
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const messages = querySnapshot.docs.map(mapDocToChatMessage);
    onUpdate(messages);
  }, (error) => {
    console.error(`Error subscribing to messages for chat ${chatId} (client SDK):`, error);
  });

  return unsubscribe;
};


// MODIFIED: sendMessage to handle new message types (text, image, form_request, form_response)
export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  messageOptions: {
    text?: string;
    imageFile?: File | null;
    formRequest?: FormRequestMessageContent;
    formResponse?: FormResponseMessageContent;
  },
  firestoreInstance: ClientFirestore = db
): Promise<ChatMessage> {
  const batch = writeBatch(firestoreInstance);
  const currentServerTimestamp = clientServerTimestamp();

  const chatRef = doc(firestoreInstance, CHATS_COLLECTION, chatId);
  const messagesColRef = collection(chatRef, MESSAGES_SUBCOLLECTION);
  const newMessageRef = doc(messagesColRef); // Creates a new document reference with an auto-generated ID

  let imageUrl: string | undefined = undefined;
  let messageType: ChatMessage['type'];
  let lastMessageTextForChatUpdate: string;
  let messageContent: Omit<ChatMessage, 'id' | 'senderId' | 'senderName' | 'createdAt' | 'type'> = {};


  if (messageOptions.formRequest) {
    messageType = 'form_request';
    messageContent.formRequestContent = messageOptions.formRequest;
    lastMessageTextForChatUpdate = `Φόρμα: ${messageOptions.formRequest.formName}`;
  } else if (messageOptions.formResponse) {
    messageType = 'form_response';
    messageContent.formResponseContent = messageOptions.formResponse;
    lastMessageTextForChatUpdate = `Απάντηση Φόρμας: ${messageOptions.formResponse.formName}`;
  } else if (messageOptions.imageFile) {
    messageType = 'image';
    try {
      const imageStoragePath = `chats/${chatId}/images/${Date.now()}-${messageOptions.imageFile.name}`;
      const imageSisyphusRef = storageRef(storage, imageStoragePath);
      await uploadBytes(imageSisyphusRef, messageOptions.imageFile);
      imageUrl = await getDownloadURL(imageSisyphusRef);
      messageContent.imageUrl = imageUrl;
      lastMessageTextForChatUpdate = messageOptions.text || "Εικόνα"; // Use text if provided, else "Εικόνα"
    } catch (error) {
      console.error("Error uploading image to Firebase Storage:", error);
      // Fallback if image upload fails, send as text if any text was provided
      messageType = 'text';
      messageContent.text = messageOptions.text || "Αποτυχία φόρτωσης εικόνας.";
      lastMessageTextForChatUpdate = messageContent.text;
    }
  } else if (messageOptions.text) {
    messageType = 'text';
    messageContent.text = messageOptions.text;
    lastMessageTextForChatUpdate = messageOptions.text;
  } else {
    throw new Error("Cannot send an empty message with no content.");
  }


  const newMessageData: Omit<ChatMessage, 'id'> = {
    senderId,
    senderName,
    type: messageType,
    createdAt: currentServerTimestamp,
    ...messageContent, // Spread the specific content (text, imageUrl, formRequestContent, formResponseContent)
  };
  batch.set(newMessageRef, newMessageData);

  const chatDocSnap = await getDoc(chatRef);
  if (!chatDocSnap.exists()) {
    throw new Error("Chat document not found when trying to send message.");
  }
  const chatData = chatDocSnap.data() as Chat; // Cast to Chat type

  const updateData: Partial<Chat> = {
    lastMessageText: lastMessageTextForChatUpdate.substring(0, 100), // Truncate last message text
    lastMessageAt: currentServerTimestamp,
    lastMessageSenderId: senderId,
    lastImageUrl: imageUrl || null, // Ensure lastImageUrl is updated
  };

  // Determine which unread count to increment/reset
  if (senderId === chatData.userId) { // If user sent message
    updateData.ownerUnreadCount = (chatData.ownerUnreadCount || 0) + 1;
    updateData.userUnreadCount = 0; // User just sent, so their side is read
  } else if (senderId === chatData.ownerId) { // If owner sent message
    updateData.userUnreadCount = (chatData.userUnreadCount || 0) + 1;
    updateData.ownerUnreadCount = 0; // Owner just sent, so their side is read
  }

  batch.update(chatRef, updateData);

  try {
    await batch.commit();
    // Return a full ChatMessage object (with ID and client-side timestamp)
    return {
      id: newMessageRef.id,
      senderId,
      senderName,
      type: messageType,
      createdAt: new Date().toISOString(), // Use client timestamp for immediate UI update
      ...messageContent,
    } as ChatMessage; // Cast to ChatMessage for confidence
  } catch (error) {
    console.error(`Error sending message in chat ${chatId} (client SDK):`, error);
    throw error;
  }
}

export const markChatAsRead = async (chatId: string, currentUserId: string): Promise<void> => {
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  try {
    const chatDoc = await getDoc(chatRef);
    if (chatDoc.exists()) {
      const chatData = chatDoc.data() as Chat; // Cast to Chat type
      const updateData: Partial<Chat> = {}; // Use Partial<Chat>

      if (chatData.userId === currentUserId) {
        if (chatData.userUnreadCount > 0) updateData.userUnreadCount = 0;
      } else if (chatData.ownerId === currentUserId) {
         if (chatData.ownerUnreadCount > 0) updateData.ownerUnreadCount = 0;
      }

      if (Object.keys(updateData).length > 0) {
        await updateDoc(chatRef, updateData);
      }
    }
  } catch (error) {
    console.error(`Error marking chat ${chatId} as read for user ${currentUserId} (client SDK):`, error);
  }
};