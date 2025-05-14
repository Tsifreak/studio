
"use server";

import type { QueryFormData, Review, Booking } from '@/lib/types'; // Added Booking type
import { addReviewToStoreInDB, getStoreByIdFromDB } from '@/lib/storeService'; 
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { collection, doc, addDoc, Timestamp, query, where, getDocs, writeBatch, limit } from 'firebase/firestore'; 
import { db } from '@/lib/firebase'; 
import { submitMessageToChat } from '@/lib/chatService'; // Import the new chat service function

// Basic rate limiting (example - in-memory, would need a persistent store in production)
const submissionAttempts = new Map<string, { count: number, lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const COOLDOWN_PERIOD = 60 * 1000; // 1 minute

export async function submitStoreQuery(formData: QueryFormData): Promise<{ success: boolean; message: string; chatId?: string }> {
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

    // Use new chat service if store has owner and user is logged in
    if (store.ownerId && formData.userId && formData.userName) {
      const chatResult = await submitMessageToChat(
        store.id,
        store.name,
        store.logoUrl,
        store.ownerId,
        formData.userId,
        formData.userName,
        formData.userAvatarUrl,
        formData.subject,
        formData.message
      );
      setTimeout(() => submissionAttempts.delete(userIdentifier), COOLDOWN_PERIOD * 5);
      return chatResult;

    } else {
      // Fallback: Store has no owner OR user is not logged in, save to 'storeMessages'
      const messageData = {
        storeId: formData.storeId,
        storeName: store.name, 
        subject: formData.subject,
        message: formData.message,
        senderName: formData.name, // Name from form field    
        senderEmail: formData.email, // Email from form field  
        ...(formData.userId && { senderUserId: formData.userId }), 
        recipientOwnerId: store.ownerId || null, 
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

// Placeholder for booking action
const bookingSchema = z.object({
  storeId: z.string().min(1),
  userId: z.string().min(1),
  serviceId: z.string().min(1),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"), // YYYY-MM-DD
  bookingTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format, expected HH:mm"), // HH:mm
  notes: z.string().max(500).optional(),
});

export async function createBookingAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string; errors?: any; booking?: Booking }> {
  const validatedFields = bookingSchema.safeParse({
    storeId: formData.get('storeId'),
    userId: formData.get('userId'),
    serviceId: formData.get('serviceId'),
    bookingDate: formData.get('bookingDate'),
    bookingTime: formData.get('bookingTime'),
    notes: formData.get('notes') || undefined,
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Σφάλμα επικύρωσης δεδομένων κράτησης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { storeId, userId, serviceId, bookingDate, bookingTime, notes } = validatedFields.data;

  // TODO:
  // 1. Fetch store details (especially service name, duration, price, ownerId)
  // 2. Fetch user details (name, email)
  // 3. Validate slot availability (this is complex, might involve checking existing bookings)
  // 4. Create Booking document in Firestore
  // 5. Potentially send notifications

  console.log("Placeholder createBookingAction called with:", { storeId, userId, serviceId, bookingDate, bookingTime, notes });

  // Simulate successful booking for now
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async operation

  revalidatePath(`/stores/${storeId}`);
  // revalidatePath(`/dashboard/bookings`); // If user has a booking page

  return {
    success: true,
    message: `(Placeholder) Η κράτηση για την υπηρεσία ${serviceId} στις ${bookingDate} ${bookingTime} υποβλήθηκε.`,
    // booking: createdBookingData, // When actual booking is created
  };
}
