
import { db, storage } from '@/lib/firebase'; // Import storage
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  writeBatch,
  Timestamp,
  serverTimestamp,
  limit,
  onSnapshot,
  type Unsubscribe,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'; // Firebase Storage imports
import type { Chat, ChatMessage, ChatMessageFormData } from '@/lib/types';

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

// Helper to convert Firestore Timestamps to ISO strings for Chat objects
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
    lastMessageAt: (data.lastMessageAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    lastMessageText: data.lastMessageText,
    lastMessageSenderId: data.lastMessageSenderId,
    lastImageUrl: data.lastImageUrl,
    userUnreadCount: data.userUnreadCount || 0,
    ownerUnreadCount: data.ownerUnreadCount || 0,
    participantIds: data.participantIds || [],
    createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
  };
};

// Helper to convert Firestore Timestamps to ISO strings for ChatMessage objects
const mapDocToChatMessage = (docSnapshot: DocumentData): ChatMessage => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    senderId: data.senderId,
    senderName: data.senderName,
    text: data.text,
    imageUrl: data.imageUrl, // Add imageUrl
    createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
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
    console.error(`Error fetching chats for user ${userId}:`, error);
    throw error;
  }
};

export const getChatMessages = async (chatId: string): Promise<ChatMessage[]> => {
  try {
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocToChatMessage);
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId}:`, error);
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
    console.error(`Error subscribing to messages for chat ${chatId}:`, error);
  });

  return unsubscribe;
};


export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  recipientId: string, // The ID of the user who is NOT sending the message
  imageFile?: File | null // Optional image file
): Promise<ChatMessage> => {
  const batch = writeBatch(db);
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  const messagesColRef = collection(chatRef, MESSAGES_SUBCOLLECTION);
  const newMessageRef = doc(messagesColRef); // Auto-generate ID

  let imageUrl: string | undefined = undefined;

  if (imageFile) {
    try {
      const imageStoragePath = `chats/${chatId}/images/${Date.now()}-${imageFile.name}`;
      const imageSisyphusRef = storageRef(storage, imageStoragePath); // Corrected variable name
      await uploadBytes(imageSisyphusRef, imageFile);
      imageUrl = await getDownloadURL(imageSisyphusRef);
    } catch (error) {
      console.error("Error uploading image to Firebase Storage:", error);
      // Decide if you want to throw or send message without image
      // For now, we'll send without image if upload fails
    }
  }

  const newMessageData: Omit<ChatMessage, 'id' | 'createdAt'> & { createdAt: any } = {
    senderId,
    senderName,
    text: text || "", // Ensure text is not undefined
    ...(imageUrl && { imageUrl }),
    createdAt: serverTimestamp(), // Use serverTimestamp for consistency
  };
  batch.set(newMessageRef, newMessageData);

  const chatDoc = await getDoc(chatRef);
  if (!chatDoc.exists()) {
    throw new Error("Chat document not found.");
  }
  const chatData = chatDoc.data() as Omit<Chat, 'id' | 'lastMessageAt' | 'createdAt'> & { lastMessageAt: Timestamp, createdAt: Timestamp};


  const updateData: Partial<Record<keyof Chat, any>> = {
    lastMessageText: text ? text.substring(0, 100) : (imageUrl ? "Εικόνα" : ""),
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: senderId,
    ...(imageUrl && { lastImageUrl: imageUrl }), // Update lastImageUrl if an image was sent
  };
  if (!imageUrl && updateData.hasOwnProperty('lastImageUrl')) { // Clear lastImageUrl if no image sent
    updateData.lastImageUrl = null;
  }


  // Increment unread count for the recipient
  if (senderId === chatData.userId) { // Message from user to owner
    updateData.ownerUnreadCount = (chatData.ownerUnreadCount || 0) + 1;
    updateData.userUnreadCount = 0; // Sender's unread count is reset
  } else if (senderId === chatData.ownerId) { // Message from owner to user
    updateData.userUnreadCount = (chatData.userUnreadCount || 0) + 1;
    updateData.ownerUnreadCount = 0; // Sender's unread count is reset
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
        createdAt: new Date().toISOString(), // Approximate, actual will be server time
    };
  } catch (error) {
    console.error(`Error sending message in chat ${chatId}:`, error);
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
    console.error(`Error marking chat ${chatId} as read for user ${currentUserId}:`, error);
    // Don't throw, as this is a background operation
  }
};

// This function is specifically for the store contact form to initiate or add to a chat
// It's kept separate from the generic sendMessage for clarity of its origin.
export async function submitMessageToChat(
  storeId: string,
  storeName: string,
  storeLogoUrl: string | undefined,
  storeOwnerId: string,
  userId: string,
  userName: string,
  userAvatarUrl: string | undefined,
  messageSubject: string,
  messageText: string
): Promise<{ success: boolean; message: string; chatId?: string }> {
  const chatsRef = collection(db, CHATS_COLLECTION);
  // Query for an existing chat between this user and store (owner)
  const q = query(
    chatsRef,
    where('storeId', '==', storeId),
    where('userId', '==', userId),
    where('ownerId', '==', storeOwnerId),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  const fullMessageText = `Θέμα: ${messageSubject}\n\n${messageText}`;
  const batch = writeBatch(db);
  let chatDocRef;
  let existingChatData: Chat | null = null;

  if (!querySnapshot.empty) {
    // Chat exists
    chatDocRef = querySnapshot.docs[0].ref;
    existingChatData = mapDocToChat(querySnapshot.docs[0]);
    const messagesColRef = collection(chatDocRef, MESSAGES_SUBCOLLECTION);
    const newMessageRef = doc(messagesColRef);

    batch.set(newMessageRef, {
      senderId: userId,
      senderName: userName,
      text: fullMessageText,
      createdAt: serverTimestamp(),
    });
    batch.update(chatDocRef, {
      lastMessageText: fullMessageText.substring(0, 100),
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: userId,
      lastImageUrl: null, // Initial contact form message doesn't include an image
      ownerUnreadCount: (existingChatData.ownerUnreadCount || 0) + 1,
      userUnreadCount: 0, // User sending the message has read it
    });
  } else {
    // Chat doesn't exist, create new chat
    chatDocRef = doc(chatsRef); // Auto-generate ID for new chat
    batch.set(chatDocRef, {
      storeId,
      storeName,
      storeLogoUrl: storeLogoUrl || null,
      userId,
      userName,
      userAvatarUrl: userAvatarUrl || null,
      ownerId: storeOwnerId,
      lastMessageText: fullMessageText.substring(0, 100),
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: userId,
      lastImageUrl: null, // No image for initial contact
      userUnreadCount: 0,
      ownerUnreadCount: 1,
      participantIds: [userId, storeOwnerId].sort(),
      createdAt: serverTimestamp(),
    });

    const messagesColRef = collection(chatDocRef, MESSAGES_SUBCOLLECTION);
    const firstMessageRef = doc(messagesColRef);
    batch.set(firstMessageRef, {
      senderId: userId,
      senderName: userName,
      text: fullMessageText,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return { 
      success: true, 
      message: "Το μήνυμά σας εστάλη. Μπορείτε να δείτε αυτήν τη συνομιλία στον πίνακα ελέγχου σας.",
      chatId: chatDocRef.id 
    };
  } catch (error) {
    console.error("Error processing store query/chat via submitMessageToChat:", error);
    return { success: false, message: "Παρουσιάστηκε σφάλμα κατά την επεξεργασία του ερωτήματός σας." };
  }
}
