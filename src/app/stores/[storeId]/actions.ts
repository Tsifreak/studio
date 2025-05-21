
"use server";

import type { QueryFormData, Review, Booking, BookingDocumentData, Service, UserProfileFirestoreData } from '@/lib/types'; 
import { getStoreByIdFromDB } from '@/lib/storeService'; // Keep for reads or switch to admin for consistency
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminDb, admin } from '@/lib/firebase-admin'; // Firebase Admin SDK
// import { auth as clientAuth } from '@/lib/firebase'; // Client SDK for auth checks if needed, less relevant with Admin SDK for writes

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
    const storeData = storeDoc.data();
    if (!storeData) {
      return { success: false, message: "Δεν βρέθηκαν δεδομένα για το κέντρο εξυπηρέτησης." };
    }
    const store = { id: storeDoc.id, ...storeData } as Store;


    if (store.ownerId && formData.userId && formData.userName) {
      // This function is in lib/chatService.ts and likely uses client SDK.
      // For consistency, if chatService operations also need admin privileges, they'd need refactoring too.
      // For now, assuming chatService handles its auth context appropriately.
      const { submitMessageToChat } = await import('@/lib/chatService'); // Dynamically import to avoid issues if chatService itself has top-level client SDK use not suitable for server actions
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
  
  console.log("[addReviewAction] FormData entries (Admin SDK will be used):");
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
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

  const newReviewForFirestore = { 
    id: adminDb.collection('_').doc().id, // Generate a unique ID for the review
    userId,
    userName,
    userAvatarUrl: userAvatarUrl || undefined, // Ensure empty string becomes undefined
    rating,
    comment,
    date: admin.firestore.Timestamp.now(), // Admin SDK Timestamp
  };

  try {
    const storeRef = adminDb.collection(STORE_COLLECTION).doc(storeId);
    
    await adminDb.runTransaction(async (transaction) => {
      const storeDoc = await transaction.get(storeRef);
      if (!storeDoc.exists) {
        throw new Error("Store not found for adding review.");
      }
      const storeData = storeDoc.data() as Store; 
      
      // Convert existing Firestore Timestamps in reviews to ISO strings for calculation if necessary,
      // but when writing back, we use the Firestore newReviewForFirestore which has a Timestamp.
      const existingReviews = (storeData.reviews || []).map(r => ({
          ...r,
          // date will be a Timestamp if fetched from Firestore, or string if already processed
          date: r.date instanceof admin.firestore.Timestamp ? r.date.toDate().toISOString() : r.date 
      }));

      // Add the new review (which has a Timestamp for its date)
      const updatedReviewsForCalc = [...existingReviews, {
        ...newReviewForFirestore,
        date: newReviewForFirestore.date.toDate().toISOString() // For calculation, use ISO string
      }];
      
      const totalRating = updatedReviewsForCalc.reduce((acc, review) => acc + review.rating, 0);
      const newAverageRating = updatedReviewsForCalc.length > 0 ? parseFloat((totalRating / updatedReviewsForCalc.length).toFixed(2)) : 0;

      transaction.update(storeRef, {
        reviews: admin.firestore.FieldValue.arrayUnion(newReviewForFirestore), 
        rating: newAverageRating,
      });
    });

    revalidatePath(`/stores/${storeId}`);
    return { success: true, message: "Η κριτική σας υποβλήθηκε με επιτυχία!" };
  } catch (error: any) {
    console.error("[addReviewAction] Error adding review with Admin SDK:", error);
    return { success: false, message: `Παρουσιάστηκε σφάλμα κατά την υποβολή της κριτικής σας. Error: ${error.message}` };
  }
}

const bookingSchema = z.object({
  storeId: z.string().min(1),
  storeName: z.string().min(1, "Το όνομα του καταστήματος είναι υποχρεωτικό."),
  userId: z.string().min(1),
  userName: z.string().min(1, "Το όνομα χρήστη είναι υποχρεωτικό για την κράτηση."),
  userEmail: z.string().email("Απαιτείται έγκυρο email χρήστη για την κράτηση."),
  serviceId: z.string().min(1),
  serviceName: z.string().min(1, "Το όνομα της υπηρεσίας είναι υποχρεωτικό."),
  serviceDurationMinutes: z.coerce.number().int().positive("Η διάρκεια της υπηρεσίας πρέπει να είναι θετικός αριθμός."),
  servicePrice: z.coerce.number().positive("Η τιμή της υπηρεσίας πρέπει να είναι θετικός αριθμός."),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Μη έγκυρη μορφή ημερομηνίας, αναμένεται YYYY-MM-DD"),
  bookingTime: z.string()
  .min(1, "Η ώρα είναι υποχρεωτική.")
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Μη έγκυρη μορφή ώρας (π.χ. 14:30)"),
  notes: z.string().max(500).optional(),
});

export async function createBookingAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string; errors?: any; booking?: Booking }> {
  console.log("[createBookingAction] Received FormData entries (Admin SDK will be used):");
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
    console.error("[createBookingAction] Zod Validation Failed. Raw Errors:", validatedFields.error);
    console.error("[createBookingAction] Zod Validation Failed. Flattened Field Errors:", JSON.stringify(validatedFields.error.flatten().fieldErrors, null, 2));
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
    const dateParts = bookingDate.split('-').map(Number);
    if (dateParts.length !== 3 || dateParts.some(isNaN) || dateParts[1] < 1 || dateParts[1] > 12 || dateParts[2] < 1 || dateParts[2] > 31) {
        console.error(`[createBookingAction] Invalid date components from bookingDate string: "${bookingDate}" -> Parts:`, dateParts);
        return { success: false, message: "Η παρεχόμενη ημερομηνία κράτησης είναι μη έγκυρη (μορφή ή τιμή)." };
    }
    // Construct date as UTC to avoid timezone issues
    const parsedBookingDateUTC = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0));
    console.log(`[createBookingAction] Raw bookingDate string: "${bookingDate}", Parsed as JS Date object (UTC):`, parsedBookingDateUTC.toISOString());

    if (isNaN(parsedBookingDateUTC.getTime())) {
        console.error(`[createBookingAction] Invalid JS Date created from bookingDate string: "${bookingDate}"`);
        return { success: false, message: "Η παρεχόμενη ημερομηνία κράτησης οδήγησε σε μη έγκυρη ημερομηνία." };
    }
    const bookingDateTimestamp = admin.firestore.Timestamp.fromDate(parsedBookingDateUTC);
    console.log("[createBookingAction] Converted to Admin SDK Firestore Timestamp:", bookingDateTimestamp.toDate().toISOString());

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
      createdAt: admin.firestore.Timestamp.now(),
      notes: notes || "",
    };
    console.log("[createBookingAction] Preparing to add booking to DB with Admin SDK. Data (Timestamps will be objects):", JSON.stringify({
        ...newBookingDataForFirestore,
        bookingDate: `Timestamp(${bookingDateTimestamp.seconds}, ${bookingDateTimestamp.nanoseconds})`,
        createdAt: `Timestamp(NOW)`
    }, null, 2));
    
    try {
        await adminDb.collection(BOOKINGS_COLLECTION).doc(bookingId).set(newBookingDataForFirestore);
        console.log("[createBookingAction] Admin SDK: Booking successfully added to 'bookings' collection with ID:", bookingId);
    } catch (bookingAddError: any) {
        console.error("[createBookingAction] Admin SDK Firestore error while adding to 'bookings' collection. Raw error object:", bookingAddError);
        let clientErrorMessage = "Παρουσιάστηκε σφάλμα κατά την προσθήκη της κράτησής σας στη βάση δεδομένων.";
        
        const errorCodeString = String(bookingAddError.code || ''); // Ensure code is a string
        if (errorCodeString) {
          clientErrorMessage += ` (Κωδικός Σφάλματος: ${errorCodeString})`;
           if (errorCodeString.toLowerCase().includes("permission-denied") || errorCodeString.toLowerCase().includes("permissions")) {
            clientErrorMessage = "Άρνηση Πρόσβασης: Δεν επιτρέπεται η δημιουργία κράτησης. Ελέγξτε τους κανόνες ασφαλείας του Firestore.";
          }
        }
        throw new Error(clientErrorMessage); 
    }
    
    const storeDocSnap = await adminDb.collection(STORE_COLLECTION).doc(storeId).get();
    if (!storeDocSnap.exists) {
        console.warn(`[createBookingAction] Admin SDK: Store ${storeId} not found after booking creation. Cannot update owner's unread count.`);
    } else {
      const storeDataFromDB = storeDocSnap.data() as Store;
      if (storeDataFromDB.ownerId) {
        console.log(`[createBookingAction] Admin SDK: Store has ownerId: ${storeDataFromDB.ownerId}. Attempting to update owner's profile.`);
        const ownerProfileRef = adminDb.collection(USER_PROFILES_COLLECTION).doc(storeDataFromDB.ownerId);
        try {
          await ownerProfileRef.update({
            totalUnreadBookings: admin.firestore.FieldValue.increment(1),
            lastSeen: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`[createBookingAction] Admin SDK: Incremented totalUnreadBookings for owner ${storeDataFromDB.ownerId}`);
        } catch (profileUpdateError: any) {
          console.warn(`[createBookingAction] Admin SDK: Could not update totalUnreadBookings for owner ${storeDataFromDB.ownerId}. This is non-critical for the booking itself. Error: Code: ${profileUpdateError.code}, Message: ${profileUpdateError.message}`);
        }
      } else {
        console.warn(`[createBookingAction] Admin SDK: Store ${storeId} does not have an ownerId. Cannot increment unread bookings.`);
      }
    }
    
    revalidatePath(`/stores/${storeId}`);
    revalidatePath(`/dashboard`);
    revalidatePath('/dashboard/my-bookings'); 

    return {
      success: true,
      message: `Η κράτησή σας για την υπηρεσία "${serviceName}" στις ${parsedBookingDateUTC.toLocaleDateString('el-GR', { year: 'numeric', month: 'long', day: 'numeric' })} ${bookingTime} υποβλήθηκε επιτυχώς.`,
      booking: { 
        ...newBookingDataForFirestore,
        id: bookingId,
        createdAt: newBookingDataForFirestore.createdAt.toDate().toISOString(), 
        bookingDate: newBookingDataForFirestore.bookingDate.toDate().toISOString().split("T")[0], 
        status: 'pending', 
      } as Booking, 
    };

  } catch (error: any) {
    let detailedMessage = "Παρουσιάστηκε σφάλμα κατά τη δημιουργία της κράτησής σας. Παρακαλώ δοκιμάστε ξανά.";
     if (error.message && typeof error.message === 'string') {
        if (error.message.toLowerCase().includes("permission-denied")) {
           detailedMessage = "Άρνηση Πρόσβασης: Δεν επιτρέπεται η δημιουργία κράτησης. Ελέγξτε τους κανόνες ασφαλείας του Firestore.";
        } else {
           detailedMessage = error.message; 
        }
    } else if (error.code) { 
        detailedMessage += ` (Κωδικός Σφάλματος: ${String(error.code)})`; // Ensure error.code is stringified
    }
    console.error("[createBookingAction] Outer try-catch error in createBookingAction. Error details logged above. Final error message for client:", detailedMessage);
    return { success: false, message: detailedMessage };
  }
}


export async function getBookingsForStoreAndDate(storeId: string, dateString: string): Promise<Booking[]> {
  console.log(`[getBookingsForStoreAndDate] Admin SDK: Called for storeId: ${storeId}, dateString: ${dateString}`);
  try {
    const parts = dateString.split('-').map(Number); 
    if (parts.length !== 3 || parts.some(isNaN) || parts[1] < 1 || parts[1] > 12 || parts[2] < 1 || parts[2] > 31) {
        console.error(`[getBookingsForStoreAndDate] Admin SDK: Invalid dateString format or value: ${dateString}. Expected YYYY-MM-DD.`);
        return [];
    }
    // Use Date.UTC for consistent UTC date interpretation and creation
    const targetDateUTC = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0)); 
    
    // Create Firestore Timestamps for the start and end of the target day in UTC
    const startOfDayTimestamp = admin.firestore.Timestamp.fromDate(targetDateUTC);
    const endOfDayTargetUTC = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999));
    const endOfDayTimestamp = admin.firestore.Timestamp.fromDate(endOfDayTargetUTC);
    
    console.log(`[getBookingsForStoreAndDate] Admin SDK: Querying bookings for date ${targetDateUTC.toISOString().split('T')[0]} (UTC)`);
    console.log(`[getBookingsForStoreAndDate] Admin SDK: Querying between Timestamp ${startOfDayTimestamp.toDate().toISOString()} and ${endOfDayTimestamp.toDate().toISOString()}`);

    const bookingsRef = adminDb.collection(BOOKINGS_COLLECTION); 
    const q = bookingsRef 
      .where("storeId", "==", storeId)
      .where("bookingDate", ">=", startOfDayTimestamp) 
      .where("bookingDate", "<=", endOfDayTimestamp); 

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
    console.log(`[getBookingsForStoreAndDate] Admin SDK: Found ${bookings.length} bookings for store ${storeId} on ${dateString}.`);
    return bookings;
  } catch (error: any) {
    console.error(`[getBookingsForStoreAndDate] Admin SDK: Error fetching bookings. Raw error:`, error);
    if (error.code) console.error("Firestore Error Code:", error.code);
    if (error.message) console.error("Error Message:", error.message);
    return []; 
  }
}
    

    