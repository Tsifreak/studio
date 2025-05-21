
"use server";

import { adminDb, admin } from '@/lib/firebase-admin'; // Import Admin SDK
import type { Store, Booking, BookingDocumentData, BookingStatus, UserProfileFirestoreData } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const STORE_COLLECTION = 'StoreInfo';
const BOOKINGS_COLLECTION = 'bookings';
const USER_PROFILES_COLLECTION = 'userProfiles';

// Helper to map Firestore doc data to Store (client-side representation)
const mapAdminDocToStore = (docSnapshot: admin.firestore.DocumentSnapshot): Store => {
  const data = docSnapshot.data()!;
  // console.log(`[getOwnerDashboardData] Mapping store doc ID: ${docSnapshot.id}, Raw Data for mapAdminDocToStore:`, JSON.stringify(data, null, 2));
  return {
    id: docSnapshot.id,
    name: data.name || '',
    logoUrl: data.logoUrl || '',
    bannerUrl: data.bannerUrl,
    description: data.description || '',
    longDescription: data.longDescription,
    rating: data.rating || 0,
    category: data.category || 'mechanic',
    tags: data.tags || [],
    features: data.features || [],
    reviews: data.reviews ? data.reviews.map((r: any) => ({ ...r, date: r.date instanceof admin.firestore.Timestamp ? r.date.toDate().toISOString() : r.date })) : [],
    products: data.products || [],
    pricingPlans: data.pricingPlans || [],
    contactEmail: data.contactEmail,
    websiteUrl: data.websiteUrl,
    address: data.address,
    ownerId: data.ownerId,
    services: data.services || [],
    availability: data.availability || [],
  };
};

// Helper to map Firestore doc data to Booking (client-side representation)
const mapAdminDocToBooking = (docSnapshot: admin.firestore.DocumentSnapshot): Booking => {
  const data = docSnapshot.data() as BookingDocumentData; 
  return {
    id: docSnapshot.id,
    storeId: data.storeId,
    storeName: data.storeName,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    serviceId: data.serviceId,
    serviceName: data.serviceName,
    serviceDurationMinutes: data.serviceDurationMinutes,
    servicePrice: data.servicePrice,
    bookingDate: data.bookingDate instanceof admin.firestore.Timestamp ? data.bookingDate.toDate().toISOString().split('T')[0] : (typeof data.bookingDate === 'string' ? data.bookingDate : new Date().toISOString().split('T')[0]),
    bookingTime: data.bookingTime,
    status: data.status,
    createdAt: data.createdAt instanceof admin.firestore.Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
    notes: data.notes,
    ownerId: data.ownerId,
  };
};

export async function getOwnerDashboardData(ownerId: string): Promise<{ bookings: Booking[], storesOwned: Store[] }> {
  if (!ownerId) {
    console.warn("[getOwnerDashboardData] ownerId is undefined or null. Returning empty data.");
    return { bookings: [], storesOwned: [] };
  }
  console.log(`[getOwnerDashboardData] Attempting to fetch dashboard data for ownerId: '${ownerId}' using Admin SDK.`);

  let storesOwned: Store[] = [];
  try {
    const storesQuery = adminDb.collection(STORE_COLLECTION).where("ownerId", "==", ownerId);
    console.log(`[getOwnerDashboardData] Querying '${STORE_COLLECTION}' for stores where 'ownerId' == '${ownerId}'`);
    
    const storesSnapshot = await storesQuery.get();
    
    if (storesSnapshot.empty) {
        console.log(`[getOwnerDashboardData] No stores found for ownerId '${ownerId}'.`);
    } else {
        storesOwned = storesSnapshot.docs.map(doc => {
            console.log(`[getOwnerDashboardData] DIAGNOSTIC: Raw store doc ID: ${doc.id}, Data:`, JSON.stringify(doc.data(), null, 2));
            return mapAdminDocToStore(doc);
        });
        console.log(`[getOwnerDashboardData] Found ${storesOwned.length} store(s) for ownerId '${ownerId}'. Stores:`, storesOwned.map(s => ({id: s.id, name: s.name, ownerId: s.ownerId })));
    }

    if (storesOwned.length === 0) {
      console.log(`[getOwnerDashboardData] No stores owned by ${ownerId}. Returning empty bookings.`);
      return { bookings: [], storesOwned: [] };
    }

    const storeIds = storesOwned.map(store => store.id);
    console.log(`[getOwnerDashboardData] Store IDs for owner ${ownerId}: ${storeIds.join(', ')}`);

    if (storeIds.length > 30) {
        console.warn(`[getOwnerDashboardData] Owner ${ownerId} has more than 30 stores (${storeIds.length}), booking fetch via 'in' query might be split or incomplete if not handled in chunks.`);
    }
    
    let bookings: Booking[] = [];
    if (storeIds.length > 0) {
        console.log(`[getOwnerDashboardData] Querying '${BOOKINGS_COLLECTION}' for bookings related to store IDs: ${storeIds.join(', ')}`);
        const bookingsQuery = adminDb.collection(BOOKINGS_COLLECTION)
            .where("storeId", "in", storeIds)
            .orderBy("bookingDate", "desc") 
            .orderBy("bookingTime", "asc");
        const bookingsSnapshot = await bookingsQuery.get();
        bookings = bookingsSnapshot.docs.map(mapAdminDocToBooking);
        console.log(`[getOwnerDashboardData] Found ${bookings.length} bookings for stores: ${storeIds.join(', ')}`);
    }
    
    return { bookings, storesOwned };
  } catch (error: any) {
    console.error(`[getOwnerDashboardData] Error fetching owner dashboard data for ${ownerId} with Admin SDK. Error Code: ${error.code}, Message: ${error.message}`, error);
    return { bookings: [], storesOwned: [] }; 
  }
}

const bookingStatusUpdateSchema = z.object({
    bookingId: z.string().min(1, "Booking ID is required."),
    newStatus: z.enum(['pending', 'confirmed', 'completed', 'cancelled_by_user', 'cancelled_by_store', 'no_show']),
    bookingStoreId: z.string().min(1, "Store ID for the booking is required."),
    clientUserId: z.string().min(1, "Client User ID is required for notifications."),
    originalStatus: z.enum(['pending', 'confirmed', 'completed', 'cancelled_by_user', 'cancelled_by_store', 'no_show']),
});

export async function updateBookingStatusAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string; errors?: any }> {
  console.log("[updateBookingStatusAction] FormData entries:");
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  const validatedFields = bookingStatusUpdateSchema.safeParse({
    bookingId: formData.get('bookingId'),
    newStatus: formData.get('newStatus'),
    bookingStoreId: formData.get('bookingStoreId'),
    clientUserId: formData.get('clientUserId'),
    originalStatus: formData.get('originalStatus'),
  });

  if (!validatedFields.success) {
    console.error("[updateBookingStatusAction] Zod validation failed. Errors:", JSON.stringify(validatedFields.error.flatten().fieldErrors, null, 2));
    return {
      success: false,
      message: "Μη έγκυρα δεδομένα για την ενημέρωση κατάστασης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  console.log("[updateBookingStatusAction] Zod validation successful. Data:", validatedFields.data);

  const { bookingId, newStatus, bookingStoreId, clientUserId, originalStatus } = validatedFields.data;

  const batch = adminDb.batch();
  const bookingRef = adminDb.collection(BOOKINGS_COLLECTION).doc(bookingId);
  
  try {
    console.log(`[updateBookingStatusAction] Admin SDK: Attempting to update booking ${bookingId} to status ${newStatus}. Store ID: ${bookingStoreId}`);
    batch.update(bookingRef, { status: newStatus });
    console.log(`[updateBookingStatusAction] Admin SDK: Booking ${bookingId} status update added to batch.`);

    if (originalStatus === 'pending' && (newStatus === 'confirmed' || newStatus === 'cancelled_by_store')) {
        const bookingDoc = await bookingRef.get(); // Fetch booking doc to get ownerId if not already available
        const bookingData = bookingDoc.data();
        if (bookingData && bookingData.ownerId) {
            const ownerProfileRef = adminDb.collection(USER_PROFILES_COLLECTION).doc(bookingData.ownerId);
            batch.update(ownerProfileRef, { pendingBookingsCount: admin.firestore.FieldValue.increment(-1) });
            console.log(`[updateBookingStatusAction] Decremented pendingBookingsCount for owner ${bookingData.ownerId}`);
        } else {
            console.warn(`[updateBookingStatusAction] Could not find ownerId for booking ${bookingId} to decrement pending count.`);
        }
    }

    const clientProfileRef = adminDb.collection(USER_PROFILES_COLLECTION).doc(clientUserId);
    batch.update(clientProfileRef, { bookingStatusUpdatesCount: admin.firestore.FieldValue.increment(1) });
    console.log(`[updateBookingStatusAction] Incremented bookingStatusUpdatesCount for client ${clientUserId}`);
    
    await batch.commit();
    console.log(`[updateBookingStatusAction] Batch commit successful. Booking ${bookingId} status updated.`);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/my-bookings');
    return { success: true, message: `Η κατάσταση της κράτησης ενημερώθηκε σε "${getStatusText(newStatus)}".` };

  } catch (error: any) {
    console.error(`[updateBookingStatusAction] Admin SDK: Error updating booking status for ${bookingId}: Code: ${error.code}, Message: ${error.message}`, error);
    let clientMessage = "Σφάλμα κατά την ενημέρωση της κατάστασης της κράτησης.";
    if (error.code) {
        clientMessage += ` (Code: ${error.code})`;
    }
    return { success: false, message: clientMessage };
  }
}

const getStatusText = (status: BookingStatus): string => {
    switch (status) {
        case 'pending': return 'Εκκρεμεί';
        case 'confirmed': return 'Αποδεκτό';
        case 'completed': return 'Ολοκληρωμένο';
        case 'cancelled_by_user': return 'Ακυρώθηκε (Χρήστης)';
        case 'cancelled_by_store': return 'Απορρίφθηκε (Κατάστημα)';
        case 'no_show': return 'Δεν Εμφανίστηκε';
        default: return status;
    }
};


export async function getUserBookings(userId: string): Promise<Booking[]> {
  console.log(`[getUserBookings] Attempting to fetch bookings for userId: ${userId} using Admin SDK.`);
  if (!userId) {
    console.warn("[getUserBookings] userId is undefined or null. Returning empty array.");
    return [];
  }

  try {
    const bookingsQuery = adminDb.collection(BOOKINGS_COLLECTION) 
      .where("userId", "==", userId)
      .orderBy("bookingDate", "desc")
      .orderBy("bookingTime", "asc");
      
    console.log(`[getUserBookings] Admin SDK: Constructed query for userId: ${userId}`);
    const bookingsSnapshot = await bookingsQuery.get();
    console.log(`[getUserBookings] Admin SDK: Query successful. Found ${bookingsSnapshot.docs.length} booking documents for userId: ${userId}`);

    if (bookingsSnapshot.empty) {
      console.log(`[getUserBookings] Admin SDK: No booking documents found for userId: ${userId}.`);
      return [];
    }

    const userBookings = bookingsSnapshot.docs.map(docSnap => {
      return mapAdminDocToBooking(docSnap);
    });
    
    console.log(`[getUserBookings] Admin SDK: Successfully mapped ${userBookings.length} bookings for user ${userId}.`);
    return userBookings;
  } catch (error: any) {
    console.error(`[getUserBookings] Admin SDK: Error fetching bookings for user ${userId}. Code: ${error.code || 'N/A'}, Message: ${error.message || 'Unknown error'}`, error);
    if (String(error.code).includes('failed-precondition') || String(error.message).toLowerCase().includes('index')) {
        console.error("[getUserBookings] Admin SDK: Firestore query failed, likely due to a MISSING COMPOSITE INDEX. Please check the Firebase console for index suggestions for the 'bookings' collection. The required index is likely: (userId [ASC/DESC], bookingDate [DESC], bookingTime [ASC]).");
    }
    return []; 
  }
}

export async function clearBookingStatusUpdatesAction(userId: string): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    console.warn("[clearBookingStatusUpdatesAction] userId is undefined. Cannot clear notifications.");
    return { success: false, message: "User ID is missing." };
  }

  try {
    const userProfileRef = adminDb.collection(USER_PROFILES_COLLECTION).doc(userId);
    await userProfileRef.update({
      bookingStatusUpdatesCount: 0,
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[clearBookingStatusUpdatesAction] Successfully cleared bookingStatusUpdatesCount for user ${userId}.`);
    revalidatePath('/dashboard/my-bookings'); 
    revalidatePath('/dashboard'); 
    return { success: true, message: "Οι ειδοποιήσεις κατάστασης κράτησης εκκαθαρίστηκαν." };
  } catch (error: any) {
    console.error(`[clearBookingStatusUpdatesAction] Error clearing bookingStatusUpdatesCount for user ${userId}:`, error);
    return { success: false, message: "Σφάλμα κατά την εκκαθάριση των ειδοποιήσεων." };
  }
}
