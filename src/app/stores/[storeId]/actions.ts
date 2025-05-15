
"use server";

import type { QueryFormData, Review, Booking, BookingDocumentData, Service, UserProfileFirestoreData } from '@/lib/types'; 
import { addReviewToStoreInDB, getStoreByIdFromDB } from '@/lib/storeService'; 
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { collection, doc, addDoc, Timestamp, query, where, getDocs, writeBatch, limit, updateDoc, increment, serverTimestamp } from 'firebase/firestore'; 
import { db } from '@/lib/firebase'; 
import { submitMessageToChat } from '@/lib/chatService'; 

const USER_PROFILES_COLLECTION = 'userProfiles';

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
      const messageData = {
        storeId: formData.storeId,
        storeName: store.name, 
        subject: formData.subject,
        message: formData.message,
        senderName: formData.name,    
        senderEmail: formData.email,  
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

const bookingSchema = z.object({
  storeId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1, "User name is required for booking."),
  userEmail: z.string().email("Valid user email is required for booking."),
  serviceId: z.string().min(1),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
  bookingTime: z.string()
  .min(1, "Η ώρα είναι υποχρεωτική.")
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Μη έγκυρη μορφή ώρας (π.χ. 14:30)"),
  notes: z.string().max(500).optional(),
});

export async function createBookingAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string; errors?: any; booking?: Booking }> {
  const validatedFields = bookingSchema.safeParse({
    storeId: formData.get('storeId'),
    userId: formData.get('userId'),
    userName: formData.get('userName'),
    userEmail: formData.get('userEmail'),
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

  const { storeId, userId, userName, userEmail, serviceId, bookingDate, bookingTime, notes } = validatedFields.data;

  try {
    const store = await getStoreByIdFromDB(storeId);
    if (!store) {
      return { success: false, message: "Το κέντρο εξυπηρέτησης δεν βρέθηκε." };
    }

    const service = store.services.find(s => s.id === serviceId);
    if (!service) {
      return { success: false, message: "Η επιλεγμένη υπηρεσία δεν βρέθηκε." };
    }

    const bookingId = doc(collection(db, '_')).id;

    const newBookingData: Omit<Booking, 'id' | 'createdAt'> & { createdAt: any, bookingDate: Timestamp } = {
      storeId,
      storeName: store.name,
      userId,
      userName,
      userEmail,
      serviceId,
      serviceName: service.name,
      serviceDurationMinutes: service.durationMinutes,
      servicePrice: service.price,
      bookingDate: Timestamp.fromDate(new Date(bookingDate)), 
      bookingTime, 
      status: 'pending',
      createdAt: serverTimestamp(),
      notes: notes || "",
    };

    await addDoc(collection(db, "bookings"), { ...newBookingData, id: bookingId });
    
    // Increment store owner's unread bookings count
    if (store.ownerId) {
      const ownerProfileRef = doc(db, USER_PROFILES_COLLECTION, store.ownerId);
      try {
        await updateDoc(ownerProfileRef, {
          totalUnreadBookings: increment(1),
          lastSeen: serverTimestamp() // Also update lastSeen or similar activity timestamp
        });
      } catch (profileError) {
        console.warn(`Could not update unread bookings for owner ${store.ownerId}:`, profileError);
        // Continue even if profile update fails, booking is still made
      }
    }
    
    revalidatePath(`/stores/${storeId}`);

    return {
      success: true,
      message: `Η κράτησή σας για την υπηρεσία "${service.name}" στις ${new Date(bookingDate).toLocaleDateString('el-GR')} ${bookingTime} υποβλήθηκε επιτυχώς.`,
      booking: {
        ...newBookingData,
        id: bookingId,
        createdAt: new Date().toISOString(),
        bookingDate: newBookingData.bookingDate.toDate().toISOString().split("T")[0],
      },
    };

  } catch (error) {
    console.error("Error creating booking:", error);
    return { success: false, message: "Παρουσιάστηκε σφάλμα κατά τη δημιουργία της κράτησής σας. Παρακαλώ δοκιμάστε ξανά." };
  }
}


export async function getBookingsForStoreAndDate(storeId: string, dateString: string): Promise<Booking[]> {
  try {
    const targetDate = new Date(dateString);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where("storeId", "==", storeId),
      where("bookingDate", ">=", Timestamp.fromDate(startOfDay)),
      where("bookingDate", "<=", Timestamp.fromDate(endOfDay))
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data() as BookingDocumentData;
      return {
        ...data,
        id: docSnap.id,
        bookingDate: data.bookingDate.toDate().toISOString().split('T')[0],
        createdAt: data.createdAt.toDate().toISOString(),
      } as Booking;
    });
  } catch (error) {
    console.error(`Error fetching bookings for store ${storeId} on date ${dateString}:`, error);
    return []; 
  }
}
