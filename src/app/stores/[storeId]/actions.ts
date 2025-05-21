"use server";

import type { QueryFormData, Review, Booking, BookingDocumentData, Service, UserProfileFirestoreData } from '@/lib/types'; 
import { getStoreByIdFromDB } from '@/lib/storeService'; // Keep for reads or switch to admin for consistency
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminDb, admin } from '@/lib/firebase-admin'; // Firebase Admin SDK
import { auth as clientAuth } from '@/lib/firebase'; // Client SDK for auth checks if needed
import { submitMessageToChat } from '@/lib/chatService'; 

const USER_PROFILES_COLLECTION = 'userProfiles';
const STORE_COLLECTION = 'StoreInfo';
const BOOKINGS_COLLECTION = 'bookings';

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
    // Using Admin SDK to fetch store to ensure we get data even if rules are strict for client
    const storeDoc = await adminDb.collection(STORE_COLLECTION).doc(formData.storeId).get();
    if (!storeDoc.exists) {
      return { success: false, message: "Το κέντρο εξυπηρέτησης δεν βρέθηκε." };
    }
    const store = { id: storeDoc.id, ...storeDoc.data() } as Store;


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
       // Fallback to storeMessages collection if direct chat isn't applicable
      const messageData = {
        storeId: formData.storeId,
        storeName: store.name, 
        subject: formData.subject,
        message: formData.message,
        senderName: formData.name,    
        senderEmail: formData.email,  
        ...(formData.userId && { senderUserId: formData.userId }), 
        recipientOwnerId: store.ownerId || null, 
        createdAt: admin.firestore.Timestamp.now(), // Admin SDK Timestamp
        isReadByOwner: false,
      };
      await adminDb.collection("storeMessages").add(messageData);
      
      setTimeout(() => submissionAttempts.delete(userIdentifier), COOLDOWN_PERIOD * 5);
      
      if (store.ownerId) {
        return { success: true, message: "Το ερώτημά σας έχει σταλεί στον ιδιοκτήτη του κέντρου." };
      } else {
        return { success: true, message: "Το ερώτημά σας έχει καταγραφεί. (Το κέντρο δεν έχει διαμορφωμένο ιδιοκτήτη για άμεση ειδοποίηση)." };
      }
    }

  } catch (error: any) {
    console.error("Error processing store query/chat with Admin SDK:", error);
    return { success: false, message: `Παρουσιάστηκε σφάλμα κατά την επεξεργασία του ερωτήματός σας. Error: ${error.message}` };
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

  const newReviewForFirestore = { // Data for Firestore, date as Admin SDK Timestamp
    id: adminDb.collection('_').doc().id, // Generate a new ID
    userId,
    userName,
    userAvatarUrl: userAvatarUrl || undefined,
    rating,
    comment,
    date: admin.firestore.Timestamp.now(), // Use Admin SDK Timestamp
  };

  try {
    const storeRef = adminDb.collection(STORE_COLLECTION).doc(storeId);
    
    // Atomically add the review and update the average rating
    await adminDb.runTransaction(async (transaction) => {
      const storeDoc = await transaction.get(storeRef);
      if (!storeDoc.exists) {
        throw new Error("Store not found for adding review.");
      }
      const storeData = storeDoc.data() as Store;
      const existingReviews = storeData.reviews || [];
      const updatedReviews = [...existingReviews, newReviewForFirestore];
      
      const totalRating = updatedReviews.reduce((acc, review) => acc + review.rating, 0);
      const newAverageRating = updatedReviews.length > 0 ? totalRating / updatedReviews.length : 0;

      transaction.update(storeRef, {
        reviews: admin.firestore.FieldValue.arrayUnion(newReviewForFirestore), // Use FieldValue for array union
        rating: newAverageRating,
      });
    });

    revalidatePath(`/stores/${storeId}`);
    return { success: true, message: "Η κριτική σας υποβλήθηκε με επιτυχία!" };
  } catch (error: any) {
    console.error("Error adding review with Admin SDK:", error);
    return { success: false, message: `Παρουσιάστηκε σφάλμα κατά την υποβολή της κριτικής σας. Error: ${error.message}` };
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
    // The clientAuth.currentUser check here is mostly for debugging/awareness as Admin SDK will perform the write
    console.log(`[createBookingAction] Client SDK auth.currentUser?.uid in server action: ${clientAuth.currentUser?.uid || 'null'}. Admin SDK will be used for Firestore operations.`);
    
    const parsedBookingDate = new Date(bookingDate + "T00:00:00Z"); 
    console.log(`[createBookingAction] Raw bookingDate string: "${bookingDate}", Parsed as Date object (UTC):`, parsedBookingDate.toISOString());
    if (isNaN(parsedBookingDate.getTime())) {
        console.error(`[createBookingAction] Invalid date created from bookingDate string: "${bookingDate}"`);
        return { success: false, message: "Η παρεχόμενη ημερομηνία κράτησης είναι μη έγκυρη." };
    }
    const bookingDateTimestamp = admin.firestore.Timestamp.fromDate(parsedBookingDate);
    console.log("[createBookingAction] Converted to Admin SDK Firestore Timestamp:", bookingDateTimestamp);

    const bookingId = adminDb.collection(BOOKINGS_COLLECTION).doc().id;

    const newBookingDataForFirestore: BookingDocumentData = {
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
      status: 'pending' as Booking['status'], 
      createdAt: admin.firestore.Timestamp.now(), // Using Timestamp.now() as serverTimestamp() needs to be resolved
      notes: notes || "",
    };
    console.log("[createBookingAction] Preparing to add booking to DB with data:", JSON.stringify(newBookingDataForFirestore, null, 2));
    
    try {
        await adminDb.collection(BOOKINGS_COLLECTION).doc(bookingId).set(newBookingDataForFirestore);
        console.log("[createBookingAction] Booking successfully added to 'bookings' collection with ID:", bookingId);
    } catch (bookingAddError: any) {
        console.error("[createBookingAction] Admin SDK Firestore error while adding to 'bookings' collection. Raw error object:", bookingAddError);
        let clientErrorMessage = "Παρουσιάστηκε σφάλμα κατά την προσθήκη της κράτησής σας στη βάση δεδομένων.";
        if (bookingAddError.code) {
          clientErrorMessage += ` (Κωδικός Σφάλματος: ${bookingAddError.code})`;
           if (bookingAddError.code.toLowerCase().includes("permission-denied") || bookingAddError.code.toLowerCase().includes("permissions")) {
            clientErrorMessage = "Άρνηση Πρόσβασης: Δεν επιτρέπεται η δημιουργία κράτησης. Ελέγξτε τους κανόνες ασφαλείας του Firestore.";
          }
        }
        throw new Error(clientErrorMessage); // Re-throw to be caught by the outer try-catch
    }
    
    // Fetch store details using Admin SDK to get ownerId
    const storeDoc = await adminDb.collection(STORE_COLLECTION).doc(storeId).get();
    if (!storeDoc.exists) {
        console.warn(`[createBookingAction] Store ${storeId} not found after booking creation. Cannot update owner's unread count.`);
    } else {
      const storeDataFromDB = storeDoc.data() as Store; // Type assertion
      if (storeDataFromDB.ownerId) {
        console.log(`[createBookingAction] Store has ownerId: ${storeDataFromDB.ownerId}. Attempting to update owner's profile.`);
        const ownerProfileRef = adminDb.collection(USER_PROFILES_COLLECTION).doc(storeDataFromDB.ownerId);
        try {
          await ownerProfileRef.update({
            totalUnreadBookings: admin.firestore.FieldValue.increment(1),
            lastSeen: admin.firestore.FieldValue.serverTimestamp() // Use serverTimestamp here
          });
          console.log(`[createBookingAction] Incremented totalUnreadBookings for owner ${storeDataFromDB.ownerId}`);
        } catch (profileUpdateError: any) {
          console.warn(`[createBookingAction] Could not update totalUnreadBookings for owner ${storeDataFromDB.ownerId} using Admin SDK. This is non-critical for the booking itself. Error: Code: ${profileUpdateError.code}, Message: ${profileUpdateError.message}`);
        }
      } else {
        console.warn(`[createBookingAction] Store ${storeId} does not have an ownerId. Cannot increment unread bookings.`);
      }
    }
    
    revalidatePath(`/stores/${storeId}`);
    revalidatePath(`/dashboard`);
    revalidatePath('/dashboard/my-bookings'); // Added specific revalidation

    return {
      success: true,
      message: `Η κράτησή σας για την υπηρεσία "${serviceName}" στις ${parsedBookingDate.toLocaleDateString('el-GR')} ${bookingTime} υποβλήθηκε επιτυχώς.`,
      booking: { 
        ...newBookingDataForFirestore,
        id: bookingId,
        // For client-side type consistency, actual is server timestamp
        // We already have bookingDateTimestamp, use its toDate() method
        createdAt: newBookingDataForFirestore.createdAt.toDate().toISOString(), 
        bookingDate: newBookingDataForFirestore.bookingDate.toDate().toISOString().split("T")[0], 
        status: 'pending', 
      } as Booking, 
    };

  } catch (error: any) {
    let detailedMessage = "Παρουσιάστηκε σφάλμα κατά τη δημιουργία της κράτησής σας. Παρακαλώ δοκιμάστε ξανά.";
     if (error.message && typeof error.message === 'string') {
        detailedMessage = error.message; // Use the specific error message if thrown
    } else if (error.code) { // Fallback to error code if message is not specific enough
        detailedMessage += ` (Κωδικός Σφάλματος: ${String(error.code).toLowerCase()})`;
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
    
    const startOfDay = admin.firestore.Timestamp.fromDate(new Date(Date.UTC(targetDateUTC.getUTCFullYear(), targetDateUTC.getUTCMonth(), targetDateUTC.getUTCDate(), 0, 0, 0, 0)));
    const endOfDay = admin.firestore.Timestamp.fromDate(new Date(Date.UTC(targetDateUTC.getUTCFullYear(), targetDateUTC.getUTCMonth(), targetDateUTC.getUTCDate(), 23, 59, 59, 999)));
    
    console.log(`[getBookingsForStoreAndDate] Querying bookings using Admin SDK between Timestamp ${startOfDay.toDate().toISOString()} and ${endOfDay.toDate().toISOString()}`);

    const bookingsRef = adminDb.collection(BOOKINGS_COLLECTION); 
    const q = bookingsRef 
      .where("storeId", "==", storeId)
      .where("bookingDate", "==", startOfDay)
      .where("bookingDate", "<=", endOfDay);

    const querySnapshot = await q.get();
    const bookings = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data() as BookingDocumentData; 
      return {
        ...data,
        id: docSnap.id,
        bookingDate: data.bookingDate.toDate().toISOString().split('T')[0], 
        createdAt: data.createdAt instanceof admin.firestore.Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(), 
      } as Booking;
    });
    console.log(`[getBookingsForStoreAndDate] Found ${bookings.length} bookings for store ${storeId} on ${dateString} using Admin SDK.`);
    return bookings;
  } catch (error: any) {
    console.error(`[getBookingsForStoreAndDate] Error fetching bookings for store ${storeId} on date ${dateString} using Admin SDK. Raw error:`, error);
    if (error.code) console.error("Firestore Error Code:", error.code);
    if (error.message) console.error("Error Message:", error.message);
    return []; 
  }
}
