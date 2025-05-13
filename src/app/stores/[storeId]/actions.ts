
"use server";

import type { QueryFormData, Review } from '@/lib/types';
import { addReviewToStoreInDB, getStoreByIdFromDB } from '@/lib/storeService'; 
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { collection, doc, addDoc, Timestamp, query, where, getDocs, writeBatch, serverTimestamp, limit } from 'firebase/firestore'; 
import { db } from '@/lib/firebase'; 

// Basic rate limiting (example - in-memory, would need a persistent store in production)
const submissionAttempts = new Map<string, { count: number, lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const COOLDOWN_PERIOD = 60 * 1000; // 1 minute

export async function submitStoreQuery(formData: QueryFormData): Promise<{ success: boolean; message: string }> {
  const userIdentifier = formData.email; 
  const now = Date.now();
  const attemptRecord = submissionAttempts.get(userIdentifier);

  if (attemptRecord && now - attemptRecord.lastAttempt < COOLDOWN_PERIOD && attemptRecord.count >= MAX_ATTEMPTS) {
    console.warn(`Rate limit exceeded for ${userIdentifier}`);
    return { success: false, message: "Υποβάλατε πάρα πολλά αιτήματα. Παρακαλώ δοκιμάστε ξανά αργότερα." };
  }

  if (attemptRecord && now - attemptRecord.lastAttempt < COOLDOWN_PERIOD) {
    submissionAttempts.set(userIdentifier, { count: attemptRecord.count + 1, lastAttempt: now });
  } else {
    submissionAttempts.set(userIdentifier, { count: 1, lastAttempt: now });
  }
  
  try {
    const store = await getStoreByIdFromDB(formData.storeId);
    if (!store) {
      return { success: false, message: "Το κέντρο εξυπηρέτησης δεν βρέθηκε." };
    }

    // Chat logic: if store has owner and user is logged in
    if (store.ownerId && formData.userId && formData.userName) {
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('storeId', '==', store.id),
        where('userId', '==', formData.userId),
        where('ownerId', '==', store.ownerId),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      const fullMessageText = `Θέμα: ${formData.subject}\n\n${formData.message}`;
      const batch = writeBatch(db);
      let chatDocRef;

      if (!querySnapshot.empty) {
        // Chat exists, add message and update chat
        chatDocRef = querySnapshot.docs[0].ref;
        const messagesColRef = collection(chatDocRef, 'messages');
        const newMessageRef = doc(messagesColRef); // Auto-generate ID for new message

        batch.set(newMessageRef, {
          senderId: formData.userId,
          senderName: formData.userName,
          text: fullMessageText,
          createdAt: Timestamp.now(),
        });
        batch.update(chatDocRef, {
          lastMessageText: fullMessageText.substring(0, 100), // Snippet
          lastMessageAt: Timestamp.now(),
          ownerUnreadCount: querySnapshot.docs[0].data().ownerUnreadCount + 1,
          userUnreadCount: 0, // User sending the message has read it
        });
      } else {
        // Chat doesn't exist, create new chat and add first message
        chatDocRef = doc(chatsRef); // Auto-generate ID for new chat
        batch.set(chatDocRef, {
          storeId: store.id,
          storeName: store.name,
          storeLogoUrl: store.logoUrl,
          userId: formData.userId,
          userName: formData.userName,
          userAvatarUrl: formData.userAvatarUrl || null,
          ownerId: store.ownerId,
          lastMessageText: fullMessageText.substring(0, 100),
          lastMessageAt: Timestamp.now(),
          userUnreadCount: 0,
          ownerUnreadCount: 1,
          participantIds: [formData.userId, store.ownerId].sort(), // For querying
          createdAt: Timestamp.now(), // When chat was created
        });

        const messagesColRef = collection(chatDocRef, 'messages');
        const firstMessageRef = doc(messagesColRef);
        batch.set(firstMessageRef, {
          senderId: formData.userId,
          senderName: formData.userName,
          text: fullMessageText,
          createdAt: Timestamp.now(),
        });
      }

      await batch.commit();
      setTimeout(() => submissionAttempts.delete(userIdentifier), COOLDOWN_PERIOD * 5);
      return { success: true, message: "Το μήνυμά σας εστάλη. Μπορείτε να δείτε αυτήν τη συνομιλία στον πίνακα ελέγχου σας." };

    } else {
      // Fallback: Store has no owner OR user is not logged in, save to 'storeMessages'
      const messageData = {
        storeId: formData.storeId,
        storeName: store.name, 
        subject: formData.subject,
        message: formData.message,
        senderName: formData.name,    
        senderEmail: formData.email,  
        ...(formData.userId && { senderUserId: formData.userId }), 
        recipientOwnerId: store.ownerId || null, // Can be null if no owner
        createdAt: Timestamp.now(),
        isReadByOwner: false,
      };
      await addDoc(collection(db, "storeMessages"), messageData);
      
      setTimeout(() => submissionAttempts.delete(userIdentifier), COOLDOWN_PERIOD * 5);
      
      if (store.ownerId) {
        return { success: true, message: "Το ερώτημά σας έχει σταλεί στον ιδιοκτήτη του κέντρου." };
      } else {
        return { success: true, message: "Το ερώτημά σας έχει καταγραφεί. (Το κέντρο δεν έχει διαμορφωμένο ιδιοκτήτη για άμεση ειδοποίηση)." };
      }
    }

  } catch (error) {
    console.error("Error processing store query/chat:", error);
    return { success: false, message: "Παρουσιάστηκε σφάλμα κατά την επεξεργασία του ερωτήματός σας." };
  }
}

const reviewSchema = z.object({
  storeId: z.string().min(1, "Store ID is required."),
  userId: z.string().min(1, "User ID is required."),
  userName: z.string().min(1, "User name is required."),
  userAvatarUrl: z.string().url("Invalid avatar URL.").optional().or(z.literal('')),
  rating: z.coerce.number().min(1, "Rating must be at least 1.").max(5, "Rating must be at most 5."),
  comment: z.string().min(5, "Comment must be at least 5 characters.").max(1000, "Comment cannot exceed 1000 characters."),
});

export async function addReviewAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string; errors?: any }> {
  
  const validatedFields = reviewSchema.safeParse({
    storeId: formData.get('storeId'),
    userId: formData.get('userId'),
    userName: formData.get('userName'),
    userAvatarUrl: formData.get('userAvatarUrl') || '',
    rating: formData.get('rating'),
    comment: formData.get('comment'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Σφάλμα επικύρωσης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { storeId, userId, userName, userAvatarUrl, rating, comment } = validatedFields.data;

  const reviewId = doc(collection(db, '_')).id; 

  const newReview: Review = {
    id: reviewId,
    userId,
    userName,
    userAvatarUrl: userAvatarUrl || undefined, 
    rating,
    comment,
    date: new Date().toISOString(),
  };

  try {
    const success = await addReviewToStoreInDB(storeId, newReview);
    if (success) {
      revalidatePath(`/stores/${storeId}`);
      return { success: true, message: "Η κριτική σας υποβλήθηκε με επιτυχία!" };
    } else {
      return { success: false, message: "Αποτυχία υποβολής κριτικής. Παρακαλώ δοκιμάστε ξανά." };
    }
  } catch (error) {
    console.error("Error adding review:", error);
    return { success: false, message: "Παρουσιάστηκε σφάλμα κατά την υποβολή της κριτικής σας." };
  }
}
