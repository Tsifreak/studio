
"use server";

import type { QueryFormData, Review } from '@/lib/types';
import { addReviewToStoreInDB, getStoreByIdFromDB } from '@/lib/storeService'; // Added getStoreByIdFromDB
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { collection, doc, addDoc, Timestamp } from 'firebase/firestore'; // Added addDoc, Timestamp
import { db } from '@/lib/firebase'; // Added db

// Basic rate limiting (example - in-memory, would need a persistent store in production)
const submissionAttempts = new Map<string, { count: number, lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const COOLDOWN_PERIOD = 60 * 1000; // 1 minute

export async function submitStoreQuery(formData: QueryFormData): Promise<{ success: boolean; message: string }> {
  // Rate limiting logic (remains unchanged for now)
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

    if (store.ownerId) {
      // Store has an owner, save the message to Firestore
      const messageData = {
        storeId: formData.storeId,
        storeName: store.name, // For context for the owner
        subject: formData.subject,
        message: formData.message,
        senderName: formData.name,    // Name from the form
        senderEmail: formData.email,  // Email from the form
        ...(formData.userId && { senderUserId: formData.userId }), // Firebase UID if user was logged in
        recipientOwnerId: store.ownerId,
        createdAt: Timestamp.now(),
        isReadByOwner: false,
      };
      await addDoc(collection(db, "storeMessages"), messageData);
      
      // Clear rate limiting attempt on success (optional, or let it expire)
      setTimeout(() => submissionAttempts.delete(userIdentifier), COOLDOWN_PERIOD * 5);
      
      return { success: true, message: "Το ερώτημά σας έχει σταλεί στον ιδιοκτήτη του κέντρου." };
    } else {
      // Store has no owner, fallback to console log or a different notification
      console.log(`Query for store ${formData.storeId} (no owner) by ${formData.email} with subject "${formData.subject}" logged.`);
      
      // Clear rate limiting attempt (optional)
      setTimeout(() => submissionAttempts.delete(userIdentifier), COOLDOWN_PERIOD * 5);
      
      return { success: true, message: "Το ερώτημά σας έχει καταγραφεί. (Το κέντρο δεν έχει διαμορφωμένο ιδιοκτήτη για άμεση ειδοποίηση)." };
    }

  } catch (error) {
    console.error("Error processing store query:", error);
    // Do not clear rate limiting on server error, to prevent abuse
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
