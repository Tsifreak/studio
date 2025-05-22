
import { db, storage } from '@/lib/firebase'; // Client SDK
// Removed adminDb import as it's no longer used here
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  // addDoc, // No longer used for submitMessageToChat here
  updateDoc,
  writeBatch,
  Timestamp as ClientTimestamp, 
  serverTimestamp as clientServerTimestamp, 
  limit,
  onSnapshot,
  type Unsubscribe,
  type QuerySnapshot,
  type DocumentData,
  type Firestore as ClientFirestore, 
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Chat, ChatMessage, ChatMessageFormData } from '@/lib/types';
// Removed AdminTimestamp import as it's no longer used here

// Helper to convert Firestore Timestamps (client or admin) to ISO strings
const mapTimestampToISO = (timestamp: ClientTimestamp | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp instanceof ClientTimestamp || (timestamp as any).toDate) { 
    return (timestamp as any).toDate().toISOString();
  }
  return new Date().toISOString(); // Fallback
};


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

const mapDocToChatMessage = (docSnapshot: DocumentData): ChatMessage => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    senderId: data.senderId,
    senderName: data.senderName,
    text: data.text,
    imageUrl: data.imageUrl,
    createdAt: mapTimestampToISO(data.createdAt),
  };
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

export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  recipientId: string, // Keep for potential client-side logic, but not directly used for unread counts here
  imageFile?: File | null,
  firestoreInstance: ClientFirestore = db 
): Promise<ChatMessage> => {
  const batch = writeBatch(firestoreInstance); // firestoreInstance is client 'db' by default
  const currentServerTimestamp = clientServerTimestamp();

  const chatRef = doc(firestoreInstance, CHATS_COLLECTION, chatId);
  const messagesColRef = collection(chatRef, MESSAGES_SUBCOLLECTION);
  const newMessageRef = doc(messagesColRef);

  let imageUrl: string | undefined = undefined;

  if (imageFile) {
    try {
      const imageStoragePath = `chats/${chatId}/images/${Date.now()}-${imageFile.name}`;
      const imageSisyphusRef = storageRef(storage, imageStoragePath);
      await uploadBytes(imageSisyphusRef, imageFile);
      imageUrl = await getDownloadURL(imageSisyphusRef);
    } catch (error) {
      console.error("Error uploading image to Firebase Storage:", error);
      // Potentially re-throw or handle, for now, it just means imageUrl will be undefined
    }
  }

  const newMessageData: Omit<ChatMessage, 'id' | 'createdAt'> & { createdAt: any } = {
    senderId,
    senderName,
    text: text || "",
    ...(imageUrl && { imageUrl }),
    createdAt: currentServerTimestamp,
  };
  batch.set(newMessageRef, newMessageData);

  const chatDocSnap = await getDoc(chatRef);
  if (!chatDocSnap.exists()) {
    // This should ideally not happen if sendMessage is called for an existing chat
    throw new Error("Chat document not found when trying to send message.");
  }
  const chatData = chatDocSnap.data() as Omit<Chat, 'id' | 'lastMessageAt' | 'createdAt'> & { lastMessageAt: ClientTimestamp, createdAt: ClientTimestamp };

  const updateData: Partial<Record<keyof Chat, any>> = {
    lastMessageText: text ? text.substring(0, 100) : (imageUrl ? "Εικόνα" : ""),
    lastMessageAt: currentServerTimestamp,
    lastMessageSenderId: senderId,
  };
  if (imageUrl) {
    updateData.lastImageUrl = imageUrl;
  } else {
    // If there's no new image, and if lastImageUrl was set, we might want to clear it or leave it.
    // For simplicity, if no new image, don't explicitly set lastImageUrl to null unless intended.
    // If imageUrl is undefined, it won't be added to updateData.
    // If you want to explicitly clear it: updateData.lastImageUrl = null;
  }


  if (senderId === chatData.userId) { // User sent the message
    updateData.ownerUnreadCount = (chatData.ownerUnreadCount || 0) + 1;
    updateData.userUnreadCount = 0; // Reset user's unread count as they sent the message
  } else if (senderId === chatData.ownerId) { // Owner sent the message
    updateData.userUnreadCount = (chatData.userUnreadCount || 0) + 1;
    updateData.ownerUnreadCount = 0; // Reset owner's unread count as they sent the message
  }

  batch.update(chatRef, updateData);

  try {
    await batch.commit();
    return {
        id: newMessageRef.id,
        senderId,
        senderName,
        text: text || "",
        ...(imageUrl && { imageUrl }),
        createdAt: new Date().toISOString(), 
    };
  } catch (error) {
    console.error(`Error sending message in chat ${chatId} (client SDK):`, error);
    throw error;
  }
};

export const markChatAsRead = async (chatId: string, currentUserId: string): Promise<void> => {
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  try {
    const chatDoc = await getDoc(chatRef);
    if (chatDoc.exists()) {
      const chatData = chatDoc.data();
      const updateData: Partial<Record<keyof Chat, any>> = {};
      
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
    // Do not throw error, as this is a non-critical background operation
  }
};

// submitMessageToChat function has been removed from here. 
// Its logic will be integrated directly into the submitStoreQuery server action.
    
