
"use server";

import type { QueryFormData, Review, Booking, BookingDocumentData, Service, UserProfileFirestoreData } from '@/lib/types'; 
import { addReviewToStoreInDB, getStoreByIdFromDB } from '@/lib/storeService'; 
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { collection, doc, addDoc, Timestamp, query, where, getDocs, writeBatch, limit, updateDoc, increment, serverTimestamp } from 'firebase/firestore'; 
import { db, auth } from '@/lib/firebase'; 
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
    console.error("[addReviewAction] Zod Validation Failed. Errors:", JSON.stringify(validatedFields.error.flatten().fieldErrors, null, 2));
    return {
      success: false,
      message: "Σφάλμα επικύρωσης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  console.log("[addReviewAction] Zod Validation Successful. Data:", validatedFields.data);

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
  storeName: z.string().min(1, "Store name is required."),
  userId: z.string().min(1),
  userName: z.string().min(1, "User name is required for booking."),
  userEmail: z.string().email("Valid user email is required for booking."),
  serviceId: z.string().min(1),
  serviceName: z.string().min(1, "Service name is required."),
  serviceDurationMinutes: z.coerce.number().int().positive("Service duration must be a positive number."),
  servicePrice: z.coerce.number().positive("Service price must be a positive number."),
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
  console.log("Server Action: createBookingAction invoked. FormData entries:");
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  const validatedFields = bookingSchema.safeParse({
    storeId: formData.get('storeId'),
    storeName: formData.get('storeName'),
    userId: formData.get('userId'),
    userName: formData.get('userName'),
    userEmail: formData.get('userEmail'),
    serviceId: formData.get('serviceId'),
    serviceName: formData.get('serviceName'),
    serviceDurationMinutes: formData.get('serviceDurationMinutes'),
    servicePrice: formData.get('servicePrice'),
    bookingDate: formData.get('bookingDate'),
    bookingTime: formData.get('bookingTime'),
    notes: formData.get('notes') || undefined,
  });

  if (!validatedFields.success) {
    console.error("[createBookingAction] Zod Validation Failed. Errors:", JSON.stringify(validatedFields.error.flatten().fieldErrors, null, 2));
    return {
      success: false,
      message: "Σφάλμα επικύρωσης δεδομένων κράτησης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  console.log("[createBookingAction] Zod Validation successful. Validated data:", validatedFields.data);
  const { 
    storeId, storeName, userId, userName, userEmail, 
    serviceId, serviceName, serviceDurationMinutes, servicePrice, 
    bookingDate, bookingTime, notes 
  } = validatedFields.data;

  try {
    console.log(`[createBookingAction] Processing booking for storeId: ${storeId}, serviceId: ${serviceId}`);
    
    // Log client SDK auth state (often null or unreliable in server actions for writes)
    console.log(`[createBookingAction] auth.currentUser?.uid from client SDK in server action: ${auth.currentUser?.uid || 'null'}`);
    
    const parsedBookingDate = new Date(bookingDate + "T00:00:00Z"); 
    console.log(`[createBookingAction] Raw bookingDate string: "${bookingDate}", Parsed as Date object (UTC):`, parsedBookingDate.toISOString());
    if (isNaN(parsedBookingDate.getTime())) {
        console.error(`[createBookingAction] Invalid date created from bookingDate string: "${bookingDate}"`);
        return { success: false, message: "Η παρεχόμενη ημερομηνία κράτησης είναι μη έγκυρη." };
    }
    const bookingDateTimestamp = Timestamp.fromDate(parsedBookingDate);
    console.log("[createBookingAction] Converted to Firestore Timestamp:", bookingDateTimestamp);


    const bookingId = doc(collection(db, '_')).id;

    const newBookingData: BookingDocumentData = {
      id: bookingId, 
      storeId,
      storeName, 
      userId,
      userName,
      userEmail,
      serviceId,
      serviceName, 
      serviceDurationMinutes, 
      servicePrice, 
      bookingDate: bookingDateTimestamp, 
      bookingTime,
      status: 'pending', 
      createdAt: serverTimestamp() as Timestamp, 
      notes: notes || "",
    };
    console.log("[createBookingAction] Preparing to add booking to DB with data:", JSON.stringify(newBookingData, null, 2));
    
    try {
        await addDoc(collection(db, "bookings"), { ...newBookingData, id: bookingId }); 
        console.log("[createBookingAction] Booking successfully added to 'bookings' collection with ID:", bookingId);
    } catch (bookingAddError: any) {
        console.error("[createBookingAction] Firestore error while adding to 'bookings' collection. Raw error object:", bookingAddError);
        if (bookingAddError.code) console.error("Firestore Error Code:", bookingAddError.code);
        if (bookingAddError.message) console.error("Error Message:", bookingAddError.message);
        if (bookingAddError.details) console.error("Firestore Error Details:", bookingAddError.details);
        
        let clientErrorMessage = "Παρουσιάστηκε σφάλμα κατά την προσθήκη της κράτησής σας στη βάση δεδομένων.";
        if (String(bookingAddError.code).toLowerCase().includes('permission-denied') || String(bookingAddError.message).toLowerCase().includes('permission-denied')) {
          clientErrorMessage = "Άρνηση Πρόσβασης: Δεν επιτρέπεται η δημιουργία κράτησης. Ελέγξτε τους κανόνες ασφαλείας του Firestore.";
        }
        throw new Error(clientErrorMessage); // Re-throw to be caught by the outer try-catch
    }
    
    const store = await getStoreByIdFromDB(storeId);
    if (!store) {
        console.warn(`[createBookingAction] Store ${storeId} not found after booking creation. Cannot update owner's unread count.`);
    } else if (store.ownerId) {
      console.log(`[createBookingAction] Store has ownerId: ${store.ownerId}. Attempting to update owner's profile.`);
      const ownerProfileRef = doc(db, USER_PROFILES_COLLECTION, store.ownerId);
      try {
        await updateDoc(ownerProfileRef, {
          totalUnreadBookings: increment(1),
          lastSeen: serverTimestamp() 
        });
        console.log(`[createBookingAction] Incremented totalUnreadBookings for owner ${store.ownerId}`);
      } catch (profileUpdateError: any) {
        console.warn(`[createBookingAction] Could not update totalUnreadBookings for owner ${store.ownerId}. This is non-critical for the booking itself. Error: Code: ${profileUpdateError.code}, Message: ${profileUpdateError.message}`);
      }
    } else {
      console.warn(`[createBookingAction] Store ${storeId} does not have an ownerId. Cannot increment unread bookings.`);
    }
    
    revalidatePath(`/stores/${storeId}`);
    revalidatePath(`/dashboard`);

    return {
      success: true,
      message: `Η κράτησή σας για την υπηρεσία "${serviceName}" στις ${parsedBookingDate.toLocaleDateString('el-GR')} ${bookingTime} υποβλήθηκε επιτυχώς.`,
      booking: { 
        ...newBookingData,
        id: bookingId,
        createdAt: new Date().toISOString(), 
        bookingDate: newBookingData.bookingDate.toDate().toISOString().split("T")[0], 
      },
    };

  } catch (error: any) {
    let detailedMessage = "Παρουσιάστηκε σφάλμα κατά τη δημιουργία της κράτησής σας. Παρακαλώ δοκιμάστε ξανά.";
    if (error.message && error.message.includes("Άρνηση Πρόσβασης")) { // Check for the custom error message
        detailedMessage = error.message;
    } else if (error.code) {
        detailedMessage += ` (Κωδικός Σφάλματος: ${String(error.code).toLowerCase()})`;
    } else if (error.message && typeof error.message === 'string' && !error.message.includes(detailedMessage.substring(0, 50))) { 
        detailedMessage += ` Λεπτομέρειες: ${error.message}`;
    }
    console.error("[createBookingAction] Outer try-catch error in createBookingAction. Error details logged above. Final error message for client:", detailedMessage);
    return { success: false, message: detailedMessage };
  }
}


export async function getBookingsForStoreAndDate(storeId: string, dateString: string): Promise<Booking[]> {
  console.log(`[getBookingsForStoreAndDate] Called for storeId: ${storeId}, dateString: ${dateString}`);
  try {
    const parts = dateString.split('-').map(Number); 
    if (parts.length !== 3 || parts.some(isNaN)) {
        console.error(`[getBookingsForStoreAndDate] Invalid dateString format: ${dateString}. Expected YYYY-MM-DD.`);
        return [];
    }
    const targetDateUTC = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])); 
    
    const startOfDay = Timestamp.fromDate(new Date(Date.UTC(targetDateUTC.getUTCFullYear(), targetDateUTC.getUTCMonth(), targetDateUTC.getUTCDate(), 0, 0, 0, 0)));
    const endOfDay = Timestamp.fromDate(new Date(Date.UTC(targetDateUTC.getUTCFullYear(), targetDateUTC.getUTCMonth(), targetDateUTC.getUTCDate(), 23, 59, 59, 999)));
    
    console.log(`[getBookingsForStoreAndDate] Querying bookings between Firestore Timestamp ${startOfDay.toDate().toISOString()} and ${endOfDay.toDate().toISOString()}`);

    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where("storeId", "==", storeId),
      where("bookingDate", ">=", startOfDay),
      where("bookingDate", "<=", endOfDay)
    );

    const querySnapshot = await getDocs(q);
    const bookings = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data() as BookingDocumentData;
      return {
        ...data,
        id: docSnap.id,
        bookingDate: data.bookingDate.toDate().toISOString().split('T')[0], 
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(), 
      } as Booking;
    });
    console.log(`[getBookingsForStoreAndDate] Found ${bookings.length} bookings for store ${storeId} on ${dateString}.`);
    return bookings;
  } catch (error: any) {
    console.error(`[getBookingsForStoreAndDate] Error fetching bookings for store ${storeId} on date ${dateString}. Raw error:`, error);
    if (error.code) console.error("Firestore Error Code:", error.code);
    if (error.message) console.error("Error Message:", error.message);
    return []; 
  }
}

