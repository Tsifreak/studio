
import { db, storage } from '@/lib/firebase'; // Client SDK
import { adminDb, admin } from '@/lib/firebase-admin'; // Admin SDK
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
  Timestamp as ClientTimestamp, // Alias client Timestamp
  serverTimestamp as clientServerTimestamp, // Alias client serverTimestamp
  limit,
  onSnapshot,
  type Unsubscribe,
  type QuerySnapshot,
  type DocumentData,
  type Firestore as ClientFirestore, // Type for client Firestore
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Chat, ChatMessage, ChatMessageFormData } from '@/lib/types';
import type { Timestamp as AdminTimestamp, Firestore as AdminFirestore } from 'firebase-admin/firestore'; // Admin Timestamp and Firestore type

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

// Helper to convert Firestore Timestamps (client or admin) to ISO strings
const mapTimestampToISO = (timestamp: ClientTimestamp | AdminTimestamp | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp instanceof ClientTimestamp || timestamp.toDate) { // toDate is a good check for AdminTimestamp as well
    return timestamp.toDate().toISOString();
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

// This function is called from client-side components, so it uses the client SDK (db)
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

// This function is called from client-side components, so it uses the client SDK (db)
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

// This function is called from client-side components, so it uses the client SDK (db)
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

// This function is called from client-side components, so it uses the client SDK (db)
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


// This function is primarily called from client-side ChatView, so it defaults to client SDK
// It can be optionally passed an AdminFirestore instance if called from a server action context.
export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  recipientId: string,
  imageFile?: File | null,
  firestoreInstance: ClientFirestore | AdminFirestore = db // Default to client db
): Promise<ChatMessage> => {
  const isClientSide = firestoreInstance === db;
  const batch = isClientSide ? writeBatch(db) : (firestoreInstance as AdminFirestore).batch();
  const currentServerTimestamp = isClientSide ? clientServerTimestamp() : admin.firestore.FieldValue.serverTimestamp();

  const chatRef = doc(firestoreInstance as ClientFirestore, CHATS_COLLECTION, chatId); // doc works with both client/admin
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
    throw new Error("Chat document not found.");
  }
  const chatData = chatDocSnap.data() as Omit<Chat, 'id' | 'lastMessageAt' | 'createdAt'> & { lastMessageAt: ClientTimestamp | AdminTimestamp, createdAt: ClientTimestamp | AdminTimestamp };

  const updateData: Partial<Record<keyof Chat, any>> = {
    lastMessageText: text ? text.substring(0, 100) : (imageUrl ? "Εικόνα" : ""),
    lastMessageAt: currentServerTimestamp,
    lastMessageSenderId: senderId,
    ...(imageUrl && { lastImageUrl: imageUrl }),
  };
  if (!imageUrl && updateData.hasOwnProperty('lastImageUrl')) {
    updateData.lastImageUrl = null;
  }

  if (senderId === chatData.userId) {
    updateData.ownerUnreadCount = (chatData.ownerUnreadCount || 0) + 1;
    updateData.userUnreadCount = 0;
  } else if (senderId === chatData.ownerId) {
    updateData.userUnreadCount = (chatData.userUnreadCount || 0) + 1;
    updateData.ownerUnreadCount = 0;
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
    console.error(`Error sending message in chat ${chatId} (using ${isClientSide ? 'client' : 'admin'} SDK):`, error);
    throw error;
  }
};

// This function is called from client-side components, so it uses the client SDK (db)
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
  }
};

// This function is called by a SERVER ACTION, so it MUST use adminDb
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
  console.log("[submitMessageToChat - Admin SDK] Initiated for store:", storeName, "by user:", userName);
  const chatsRefAdmin = adminDb.collection(CHATS_COLLECTION);
  const fullMessageText = `Θέμα: ${messageSubject}\n\n${messageText}`;
  const batch = adminDb.batch();
  let chatDocRef;

  try {
    const q = chatsRefAdmin
      .where('storeId', '==', storeId)
      .where('userId', '==', userId)
      .where('ownerId', '==', storeOwnerId)
      .limit(1);

    const querySnapshot = await q.get();
    console.log(`[submitMessageToChat - Admin SDK] Existing chat query found ${querySnapshot.docs.length} documents.`);

    if (!querySnapshot.empty) {
      chatDocRef = querySnapshot.docs[0].ref;
      const existingChatData = querySnapshot.docs[0].data() as Chat; // Assuming data matches Chat type
      console.log("[submitMessageToChat - Admin SDK] Existing chat found, ID:", chatDocRef.id);

      const messagesColRefAdmin = chatDocRef.collection(MESSAGES_SUBCOLLECTION);
      const newMessageRefAdmin = messagesColRefAdmin.doc(); // Auto-generate ID

      batch.set(newMessageRefAdmin, {
        senderId: userId,
        senderName: userName,
        text: fullMessageText,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.update(chatDocRef, {
        lastMessageText: fullMessageText.substring(0, 100),
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessageSenderId: userId,
        lastImageUrl: null,
        ownerUnreadCount: admin.firestore.FieldValue.increment(1), // Increment for owner
        userUnreadCount: 0, // User sending message has read it
      });
    } else {
      console.log("[submitMessageToChat - Admin SDK] No existing chat found. Creating new chat.");
      chatDocRef = chatsRefAdmin.doc(); // Auto-generate ID for new chat
      batch.set(chatDocRef, {
        storeId,
        storeName,
        storeLogoUrl: storeLogoUrl || null,
        userId,
        userName,
        userAvatarUrl: userAvatarUrl || null,
        ownerId: storeOwnerId,
        lastMessageText: fullMessageText.substring(0, 100),
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessageSenderId: userId,
        lastImageUrl: null,
        userUnreadCount: 0,
        ownerUnreadCount: 1, // New chat, owner has 1 unread
        participantIds: [userId, storeOwnerId].sort(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const messagesColRefAdmin = chatDocRef.collection(MESSAGES_SUBCOLLECTION);
      const firstMessageRefAdmin = messagesColRefAdmin.doc();
      batch.set(firstMessageRefAdmin, {
        senderId: userId,
        senderName: userName,
        text: fullMessageText,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    console.log("[submitMessageToChat - Admin SDK] Batch commit successful. Chat ID:", chatDocRef.id);
    return { 
      success: true, 
      message: "Το μήνυμά σας εστάλη. Μπορείτε να δείτε αυτήν τη συνομιλία στον πίνακα ελέγχου σας.",
      chatId: chatDocRef.id 
    };
  } catch (error: any) {
    console.error("[submitMessageToChat - Admin SDK] Error processing store query/chat:", error.message, error.stack);
    return { success: false, message: `Παρουσιάστηκε σφάλμα κατά την επεξεργασία του ερωτήματός σας. Error: ${error.message}` };
  }
}

    