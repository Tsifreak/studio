// src/app/stores/[storeId]/actions.ts
"use server";
import { auth } from "@/lib/firebase";
import type { QueryFormData, Review, Booking, BookingDocumentData, Service, UserProfileFirestoreData, Store, Chat, ChatMessage } from '@/lib/types'; // Import ChatMessage
import { getStoreByIdFromDB } from '@/lib/storeService';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminDb, admin } from '@/lib/firebase-admin';
import type { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';

const USER_PROFILES_COLLECTION = 'userProfiles';
const STORE_COLLECTION = 'StoreInfo'; // Ensure this matches your Firestore collection name for stores
const BOOKINGS_COLLECTION = 'bookings';
const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

const submissionAttempts = new Map<string, { count: number, lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const COOLDOWN_PERIOD = 60 * 1000; // 1 minute

export async function submitStoreQuery(formData: QueryFormData): Promise<{ success: boolean; message: string; chatId?: string }> {
  console.log("[submitStoreQuery - Server Action] Received form data for store:", formData.storeId);
  console.log("[submitStoreQuery - Server Action] User provided email:", formData.email); // Debug log
  const userIdentifier = formData.email;
  const now = Date.now();
  const attemptRecord = submissionAttempts.get(userIdentifier);

  if (attemptRecord && now - attemptRecord.lastAttempt < COOLDOWN_PERIOD && attemptRecord.count >= MAX_ATTEMPTS) {
    console.warn(`[submitStoreQuery - Server Action] Rate limit exceeded for ${userIdentifier}`);
    return { success: false, message: "Υποβάλατε πάρα πολά αιτήματα. Παρακαλώ δοκιμάστε ξανά αργότερα." };
  }

  if (attemptRecord && now - attemptRecord.lastAttempt < COOLDOWN_PERIOD) {
    submissionAttempts.set(userIdentifier, { count: attemptRecord.count + 1, lastAttempt: now });
  } else {
    submissionAttempts.set(userIdentifier, { count: 1, lastAttempt: now });
  }

  try {
    const storeDocSnap = await adminDb.collection(STORE_COLLECTION).doc(formData.storeId).get();
    if (!storeDocSnap.exists) {
      console.error("[submitStoreQuery - Server Action] Store not found:", formData.storeId);
      return { success: false, message: "Το κέντρο εξυπηρέτησης δεν βρέθηκε." };
    }
    const storeData = storeDocSnap.data() as Omit<Store, 'id'>;
    if (!storeData) {
      console.error("[submitStoreQuery - Server Action] No data for store:", formData.storeId);
      return { success: false, message: "Δεν βρέθηκαν δεδομένα για το κέντρο εξυπηρέτησης." };
    }
    const store = { id: storeDocSnap.id, ...storeData };

    console.log(`[submitStoreQuery - Debug] Fetched Store ID: ${store.id}`); // Debug log
    console.log(`[submitStoreQuery - Debug] Store Name: ${store.name}`); // Debug log
    console.log(`[submitStoreQuery - Debug] Store Owner ID from DB: ${store.ownerId}`); // Debug log
    console.log(`[submitStoreQuery - Debug] Form Data User ID: ${formData.userId}`); // Debug log
    console.log(`[submitStoreQuery - Debug] Form Data User Name: ${formData.userName}`); // Debug log


    if (store.ownerId && formData.userId && formData.userName) {
      console.log(`[submitStoreQuery - Server Action] Conditions met for chat creation/update.`);
      console.log(`[submitStoreQuery - Server Action] Store has owner ${store.ownerId}. Initiating chat for user ${formData.userName} (${formData.userId}).`);

      const chatsRefAdmin = adminDb.collection(CHATS_COLLECTION);
      const fullMessageText = `Θέμα: ${formData.subject}\n\n${formData.message}`;
      const batch = adminDb.batch();
      let chatDocRef;

      // --- FIX STARTS HERE ---
      // 1. Create the sorted participantIds array for the query
      const sortedParticipantIds = [formData.userId, store.ownerId].sort(); // Ensure consistent order
      console.log(`[submitStoreQuery/ChatLogic - Admin SDK] Querying with sortedParticipantIds: ${JSON.stringify(sortedParticipantIds)}`); // Debug log

      // 2. Modify the query to use an equality check on the sorted array
      // This resolves the "max 1 ARRAY_CONTAINS" error.
      const q = chatsRefAdmin
        .where('storeId', '==', store.id)
        .where('participantIds', '==', sortedParticipantIds) // <-- CRITICAL CHANGE HERE
        .limit(1);
      // --- FIX ENDS HERE ---

      const querySnapshot = await q.get();
      console.log(`[submitStoreQuery/ChatLogic - Admin SDK] Existing chat query found ${querySnapshot.docs.length} documents.`);

      if (!querySnapshot.empty) {
        chatDocRef = querySnapshot.docs[0].ref;
        console.log("[submitStoreQuery/ChatLogic - Admin SDK] Existing chat found, ID:", chatDocRef.id);

        const messagesColRefAdmin = chatDocRef.collection(MESSAGES_SUBCOLLECTION);
        const newMessageRefAdmin = messagesColRefAdmin.doc();

        const newTextMessageData: Partial<ChatMessage> = {
          senderId: formData.userId,
          senderName: formData.userName,
          text: fullMessageText,
          type: 'text', // Explicitly set message type
          imageUrl: undefined, // Ensure imageUrl is undefined for no image
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        batch.set(newMessageRefAdmin, newTextMessageData);

        batch.update(chatDocRef, {
          lastMessageText: fullMessageText.substring(0, 100),
          lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
          lastMessageSenderId: formData.userId,
          lastImageUrl: null,
          ownerUnreadCount: admin.firestore.FieldValue.increment(1),
          userUnreadCount: 0,
        });
      } else {
        console.log("[submitStoreQuery/ChatLogic - Admin SDK] No existing chat found. Creating new chat.");
        chatDocRef = chatsRefAdmin.doc();

        batch.set(chatDocRef, {
          storeId: store.id,
          storeName: store.name,
          storeLogoUrl: store.logoUrl || undefined,
          userId: formData.userId,
          userName: formData.userName,
          userAvatarUrl: formData.userAvatarUrl || undefined,
          ownerId: store.ownerId,
          lastMessageText: fullMessageText.substring(0, 100),
          lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
          lastMessageSenderId: formData.userId,
          lastImageUrl: null,
          userUnreadCount: 0,
          ownerUnreadCount: 1,
          participantIds: sortedParticipantIds, // <--- USE THE SORTED ARRAY HERE FOR NEW CHATS TOO
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const messagesColRefAdmin = chatDocRef.collection(MESSAGES_SUBCOLLECTION);
        const firstMessageRefAdmin = messagesColRefAdmin.doc();

        const firstTextMessageData: Partial<ChatMessage> = {
          senderId: formData.userId,
          senderName: formData.userName,
          text: fullMessageText,
          type: 'text',
          imageUrl: undefined,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        batch.set(firstMessageRefAdmin, firstTextMessageData);
      }
      await batch.commit();
      console.log(`[submitStoreQuery - Server Action] Firestore batch committed successfully. Chat ID: ${chatDocRef.id}`);

      setTimeout(() => submissionAttempts.delete(userIdentifier), COOLDOWN_PERIOD * 5);
      return {
        success: true,
        message: "Το μήνυμά σας εστάλη. Μπορείτε να δείτε αυτήν τη συνομιλία στον πίνακα ελέγχου σας.",
        chatId: chatDocRef.id
      };

    } else {
      console.warn("[submitStoreQuery - Server Action] Skipping chat creation. Reason(s):");
      console.warn(` - store.ownerId: ${store.ownerId}`);
      console.warn(` - formData.userId: ${formData.userId}`);
      console.warn(` - formData.userName: ${formData.userName}`);
      console.log("[submitStoreQuery - Server Action] Instead, saving message to 'storeMessages' collection.");

      const messageData = {
        storeId: formData.storeId,
        storeName: store.name,
        subject: formData.subject,
        message: formData.message,
        senderName: formData.name,
        senderEmail: formData.email,
        ...(formData.userId && { senderUserId: formData.userId }),
        recipientOwnerId: store.ownerId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isReadByOwner: false,
      };
      await adminDb.collection("storeMessages").add(messageData);

      console.log("[submitStoreQuery - Server Action] Message saved to 'storeMessages' collection.");
      setTimeout(() => submissionAttempts.delete(userIdentifier), COOLDOWN_PERIOD * 5);

      if (store.ownerId) {
        console.log("[submitStoreQuery - Server Action] Store has ownerId, returning success message for direct query.");
        return { success: true, message: "Το ερώτημά σας έχει σταλεί στον ιδιοκτήτη του κέντρου." };
      } else {
        console.log("[submitStoreQuery - Server Action] Store has NO ownerId, returning success message for unconfigured owner.");
        return { success: true, message: "Το ερώτημά σας έχει καταγραφεί. (Το κέντρο δεν έχει διαμορφωμένο ιδιοκτήτη για άμεση ειδοποίηση)." };
      }
    }

  } catch (error: any) {
    console.error("[submitStoreQuery - Server Action] FINAL CATCH BLOCK: Error processing store query/chat:", error.message, error.stack);
    let clientMessage = "Παρουσιάστηκε σφάλμα κατά την επεξεργασία του ερωτήματός σας.";
    if (error.code || String(error.message).toLowerCase().includes("permission")) {
        clientMessage += ` Error: ${error.message || 'missing or insufficient permissions'}`;
    }
    return { success: false, message: clientMessage };
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
  console.log("[addReviewAction - Server Action] FormData entries (Admin SDK will be used):");
  for (const [key, value] of formData.entries()) {
    console.log(`    ${key}: ${value}`);
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
    console.error("[addReviewAction - Server Action] Zod Validation Failed. Errors:", JSON.stringify(validatedFields.error.flatten().fieldErrors, null, 2));
    return {
      success: false,
      message: "Σφάλμα επικύρωσης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  console.log("[addReviewAction - Server Action] Zod Validation Successful. Data:", validatedFields.data);

  const { storeId, userId, userName, userAvatarUrl, rating, comment } = validatedFields.data;

  const newReviewForFirestore = {
    id: adminDb.collection('_').doc().id,
    userId,
    userName,
    userAvatarUrl: userAvatarUrl || undefined,
    rating,
    comment,
    date: admin.firestore.Timestamp.now(),
  };

  try {
    const storeRef = adminDb.collection(STORE_COLLECTION).doc(storeId);

    await adminDb.runTransaction(async (transaction) => {
      const storeDoc = await transaction.get(storeRef);
      if (!storeDoc.exists) {
        throw new Error("Store not found for adding review.");
      }
      const storeData = storeDoc.data() as Omit<Store, 'id'| 'reviews'> & {reviews?: any[]};

      const existingReviews = (storeData.reviews || []).map(r => ({
          ...r,
          date: r.date instanceof admin.firestore.Timestamp ? r.date.toDate().toISOString() : r.date
      }));

      const updatedReviewsForCalc = [...existingReviews, {
        ...newReviewForFirestore,
        date: newReviewForFirestore.date.toDate().toISOString()
      }];

      const totalRating = updatedReviewsForCalc.reduce((acc, review) => acc + review.rating, 0);
      const newAverageRating = updatedReviewsForCalc.length > 0 ? parseFloat((totalRating / updatedReviewsForCalc.length).toFixed(2)) : 0;

      transaction.update(storeRef, {
        reviews: admin.firestore.FieldValue.arrayUnion(newReviewForFirestore),
        rating: newAverageRating,
      });
    });

    revalidatePath(`/stores/${storeId}`);
    console.log("[addReviewAction - Server Action] Review added and rating updated successfully for store:", storeId);
    return { success: true, message: "Η κριτική σας υποβλήθηκε με επιτυχία!" };
  } catch (error: any) {
    console.error("[addReviewAction - Server Action] Error adding review with Admin SDK:", error.message, error.stack);
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
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Μη έγκυρη μορφή ημερομηνίας, αναμένεταιYYYY-MM-DD"),
  bookingTime: z.string()
  .min(1, "Η ώρα είναι υποχρεωτική.")
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Μη έγκυρη μορφή ώρας (π.χ. 14:30)"),
  notes: z.string().max(500).optional(),
});

export async function createBookingAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string; errors?: any; booking?: Booking }> {
  console.log("[createBookingAction - Server Action] Received FormData entries:");
  for (const [key, value] of formData.entries()) {
    console.log(`    ${key}: ${value}`);
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
    console.error("[createBookingAction - Server Action] Zod Validation Failed. Raw Errors:", validatedFields.error);
    console.error("[createBookingAction - Server Action] Zod Validation Failed. Flattened Field Errors:", JSON.stringify(validatedFields.error.flatten().fieldErrors, null, 2));
    return {
      success: false,
      message: "Σφάλμα επικύρωσης δεδομένων κράτησης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  console.log("[createBookingAction - Server Action] Zod Validation successful. Validated data:", validatedFields.data);
  const {
    storeId, storeName, userId, userName, userEmail,
    serviceId, serviceName, serviceDurationMinutes, servicePrice,
    bookingDate, bookingTime, notes
  } = validatedFields.data;

  try {
    console.log(`[createBookingAction - Server Action] Attempting to parse bookingDate string: "${bookingDate}"`);
    const dateParts = bookingDate.split('-').map(Number);
    if (dateParts.length !== 3 || dateParts.some(isNaN) || dateParts[1] < 1 || dateParts[1] > 12 || dateParts[2] < 1 || dateParts[2] > 31) {
        const dateParseErrorMsg = `Η παρεχόμενη ημερομηνία κράτησης είναι μη έγκυρη (μορφή ή τιμή): "${bookingDate}"`;
        console.error(`[createBookingAction - Server Action] ${dateParseErrorMsg} -> Parts:`, dateParts);
        return { success: false, message: dateParseErrorMsg };
    }
    const parsedBookingDateUTC = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0));
    console.log(`[createBookingAction - Server Action] Parsed bookingDate as JS Date object (UTC):`, parsedBookingDateUTC.toISOString());

    if (isNaN(parsedBookingDateUTC.getTime())) {
        const invalidDateErrorMsg = `Η παρεχόμενη ημερομηνία κράτησης "${bookingDate}" οδήγησε σε μη έγκυρη ημερομηνία.`;
        console.error(`[createBookingAction - Server Action] ${invalidDateErrorMsg}`);
        return { success: false, message: invalidDateErrorMsg };
    }
    const bookingDateTimestamp = admin.firestore.Timestamp.fromDate(parsedBookingDateUTC);
    console.log("[createBookingAction - Server Action] Converted bookingDate to Admin SDK Firestore Timestamp:", bookingDateTimestamp.toDate().toISOString());

    const bookingId = adminDb.collection(BOOKINGS_COLLECTION).doc().id;

    console.log("[createBookingAction - Server Action] Fetching store details for ownerId using Admin SDK...");
    const storeDocSnap = await adminDb.collection(STORE_COLLECTION).doc(storeId).get();
    if (!storeDocSnap.exists) {
        const storeNotFoundErrorMsg = `Το κατάστημα για την κράτηση (ID: ${storeId}) δεν βρέθηκε.`;
        console.error(`[createBookingAction - Server Action] Admin SDK: ${storeNotFoundErrorMsg}`);
        return { success: false, message: storeNotFoundErrorMsg };
    }
    const storeDataFromDB = storeDocSnap.data() as Omit<Store, 'id'>;
    const storeOwnerId = storeDataFromDB.ownerId;
    console.log(`[createBookingAction - Server Action] Store ${storeId} found. OwnerId: ${storeOwnerId || 'Not set'}`);

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
      createdAt: admin.firestore.FieldValue.serverTimestamp() as AdminTimestamp,
      notes: notes || "",
      ownerId: storeOwnerId || undefined,
    };

    console.log("[createBookingAction - Server Action] Preparing to add booking to DB with Admin SDK. Data (Timestamps will be objects):", JSON.stringify({
        ...newBookingDataForFirestore,
        bookingDate: `Timestamp(${newBookingDataForFirestore.bookingDate.seconds}, ${newBookingDataForFirestore.bookingDate.nanoseconds})`,
        createdAt: `Timestamp(NOW)`
    }, null, 2));

    let bookingAddErrorMessage = "Παρουσιάστηκε σφάλμα κατά την προσθήκη της κράτησής σας στη βάση δεδομένων.";
    try {
        await adminDb.collection(BOOKINGS_COLLECTION).doc(bookingId).set(newBookingDataForFirestore);
        console.log("[createBookingAction - Server Action] Admin SDK: Booking successfully added to 'bookings' collection with ID:", bookingId);
    } catch (bookingAddError: any) {
        console.error("[createBookingAction - Server Action] Admin SDK Firestore error while adding to 'bookings' collection. Raw error object:", bookingAddError);
        const errorCodeString = String(bookingAddError.code || '');
        if (errorCodeString) {
          bookingAddErrorMessage += ` (Κωδικός Σφάλματος: ${errorCodeString})`;
            if (errorCodeString.toLowerCase().includes("permission-denied")) {
            bookingAddErrorMessage = "Άρνηση Πρόσβασης: Δεν επιτρέπεται η δημιουργία κράτησης. Ελέγξτε τους κανόνες ασφαλείας του Firestore.";
          }
        }
        throw new Error(bookingAddErrorMessage);
    }

    if (storeOwnerId) {
      console.log(`[createBookingAction - Server Action] Admin SDK: Store has ownerId: ${storeOwnerId}. Attempting to update owner's profile.`);
      const ownerProfileRef = adminDb.collection(USER_PROFILES_COLLECTION).doc(storeOwnerId);
      try {
        await ownerProfileRef.update({
          pendingBookingsCount: admin.firestore.FieldValue.increment(1),
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[createBookingAction - Server Action] Admin SDK: Incremented pendingBookingsCount for owner ${storeOwnerId}`);
      } catch (profileUpdateError: any) {
        console.warn(`[createBookingAction - Server Action] Admin SDK: Could not update pendingBookingsCount for owner ${storeOwnerId}. This is non-critical for the booking itself. Error: Code: ${profileUpdateError.code}, Message: ${profileUpdateError.message}`);
      }
    } else {
      console.warn(`[createBookingAction - Server Action] Admin SDK: Store ${storeId} does not have an ownerId. Cannot increment pending bookings count.`);
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
        createdAt: new Date().toISOString(),
        bookingDate: newBookingDataForFirestore.bookingDate.toDate().toISOString().split("T")[0],
        status: 'pending',
      } as Booking,
    };

  } catch (error: any) {
    let detailedMessage = "Παρουσιάστηκε σφάλμα κατά τη δημιουργία της κράτησής σας. Παρακαλώ δοκιμάστε ξανά.";
      if (error.message && typeof error.message === 'string') {
        if (error.message.toLowerCase().includes("permission-denied") || error.message.includes("Άρνηση Πρόσβασης")) {
           detailedMessage = "Άρνηση Πρόσβασης: Δεν επιτρέπεται η δημιουργία κράτησης. Ελέγξτε τους κανόνες ασφαλείας του Firestore.";
        } else if (error.message.includes("Κωδικός Σφάλματος") || (typeof error.code === 'string' && error.code) || (typeof error.code === 'number' && error.code) ) {
           detailedMessage = error.message;
           if(!detailedMessage.includes("Κωδικός Σφάλματος") && error.code) {
            detailedMessage += ` (Κωδικός Σφάλματος: ${error.code})`;
           }
        } else {
           detailedMessage = error.message;
        }
    } else if (error.code) {
        detailedMessage += ` (Κωδικός Σφάλματος: ${String(error.code)})`;
    }
    console.error("[createBookingAction - Server Action] Outer try-catch error in createBookingAction. Final error message for client:", detailedMessage, error.stack);
    return { success: false, message: detailedMessage };
  }
}


export async function getBookingsForStoreAndDate(storeId: string, dateString: string): Promise<Booking[]> {
  console.log(`[getBookingsForStoreAndDate - Server Action] Admin SDK: Called for storeId: ${storeId}, dateString: ${dateString}`);
  try {
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN) || parts[1] < 1 || parts[1] > 12 || parts[2] < 1 || parts[2] > 31) {
        const dateParseErrorMsg = `[getBookingsForStoreAndDate - Server Action] Admin SDK: Invalid dateString format or value: ${dateString}. ExpectedYYYY-MM-DD.`;
        console.error(dateParseErrorMsg, "Parts:", parts);
        return [];
    }
    const targetDateUTC = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0));

    const startOfDayTimestamp = admin.firestore.Timestamp.fromDate(targetDateUTC);
    const endOfDayTargetUTC = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999));
    const endOfDayTimestamp = admin.firestore.Timestamp.fromDate(endOfDayTargetUTC);

    console.log(`[getBookingsForStoreAndDate - Server Action] Admin SDK: Querying bookings for date ${targetDateUTC.toISOString().split('T')[0]} (UTC)`);
    console.log(`[getBookingsForStoreAndDate - Server Action] Admin SDK: Querying between Timestamp ${startOfDayTimestamp.toDate().toISOString()} and ${endOfDayTimestamp.toDate().toISOString()}`);

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
    console.log(`[getBookingsForStoreAndDate - Server Action] Admin SDK: Found ${bookings.length} bookings for store ${storeId} on ${dateString}.`);
    return bookings;
  } catch (error: any) {
    console.error(`[getBookingsForStoreAndDate - Server Action] Admin SDK: Error fetching bookings for store ${storeId} on date ${dateString}. Code: ${String(error.code || 'N/A')}, Message: ${error.message || 'Unknown error'}`, error.stack);
    if (String(error.code).includes('failed-precondition') || String(error.message).toLowerCase().includes('index')) {
        console.error("[getBookingsForStoreAndDate - Server Action] Admin SDK: Firestore query failed, likely due to a MISSING COMPOSITE INDEX. Please check the Firebase console for index suggestions for the 'bookings' collection. The required index is likely: (storeId [ASC], bookingDate [ASC/DESC]).");
    }
    return [];
  }
}

// NEW SERVER ACTION FOR SAVING/UNSAVING STORES
export async function toggleSavedStore(storeId: string, userId: string, isCurrentlySaved: boolean): Promise<{ success: boolean; message: string }> {
  console.log(`[toggleSavedStore - Server Action] Called for storeId: ${storeId}, userId: ${userId}, isCurrentlySaved: ${isCurrentlySaved}`);

  if (!userId) {
    return { success: false, message: "Πρέπει να συνδεθείτε για να αποθηκεύσετε/καταργήσετε την αποθήκευση κέντρων." };
  }

  const userProfileRef = adminDb.collection(USER_PROFILES_COLLECTION).doc(userId);
  const storeRef = adminDb.collection(STORE_COLLECTION).doc(storeId); // Reference to the store document

  try {
    const [userProfileDoc, storeDoc] = await Promise.all([
        userProfileRef.get(),
        storeRef.get()
    ]);

    if (!storeDoc.exists) {
        console.error(`[toggleSavedStore - Server Action] Store with ID ${storeId} not found.`);
        return { success: false, message: "Το κατάστημα δεν βρέθηκε." };
    }

    if (!userProfileDoc.exists) {
      // If user profile doesn't exist, create it with the storeId in savedStores
      await userProfileRef.set({
        uid: userId,
        savedStores: [storeId],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }); // merge:true is important to not overwrite existing profile data if any

      // Also update the store's savedByUsers array
      await storeRef.update({
        savedByUsers: admin.firestore.FieldValue.arrayUnion(userId)
      });
      revalidatePath(`/stores/${storeId}`);
      revalidatePath(`/dashboard/saved-stores`);
      console.log(`[toggleSavedStore - Server Action] Created user profile and saved store ${storeId} for user ${userId}`);
      return { success: true, message: "Το κέντρο αποθηκεύτηκε επιτυχώς!" };
    }

    const userProfileData = userProfileDoc.data() as UserProfileFirestoreData;
    const savedStores = userProfileData.savedStores || [];

    if (savedStores.includes(storeId)) {
      // Store is already saved, so unsave it
      await userProfileRef.update({
        savedStores: admin.firestore.FieldValue.arrayRemove(storeId)
      });
      await storeRef.update({
        savedByUsers: admin.firestore.FieldValue.arrayRemove(userId)
      });
      revalidatePath(`/stores/${storeId}`);
      revalidatePath(`/dashboard/saved-stores`);
      console.log(`[toggleSavedStore - Server Action] Unsaved store ${storeId} for user ${userId}`);
      return { success: true, message: "Το κέντρο αφαιρέθηκε από τις αποθηκευμένες." };
    } else {
      // Store is not saved, so save it
      await userProfileRef.update({
        savedStores: admin.firestore.FieldValue.arrayUnion(storeId)
      });
      await storeRef.update({
        savedByUsers: admin.firestore.FieldValue.arrayUnion(userId)
      });
      revalidatePath(`/stores/${storeId}`);
      revalidatePath(`/dashboard/saved-stores`);
      console.log(`[toggleSavedStore - Server Action] Saved store ${storeId} for user ${userId}`);
      return { success: true, message: "Το κέντρο αποθηκεύτηκε επιτυχώς!" };
    }
  } catch (error: any) {
    console.error(`[toggleSavedStore - Server Action] Error toggling saved store for user ${userId}, store ${storeId}. Code: ${String(error.code || 'N/A')}, Message: ${error.message || 'Unknown error'}`, error.stack);
    let message = "Παρουσιάστηκε σφάλμα κατά την αποθήκευση του κέντρου. Παρακαλώ δοκιμάστε ξανά.";
    if (String(error.code).includes('permission-denied') || String(error.message).toLowerCase().includes('permission')) {
      message = "Άρνηση Πρόσβασης: Δεν έχετε δικαίωμα να αποθηκεύσετε κέντρα. Ελέγξτε τα δικαιώματά σας ή τους κανόνες ασφαλείας.";
    }
    return { success: false, message };
  }
}