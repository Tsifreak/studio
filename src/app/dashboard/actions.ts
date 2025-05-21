
"use server";

import { db } from '@/lib/firebase'; // Keep for client-side like mapping if needed, but adminDb for actual fetch
import { adminDb, admin } from '@/lib/firebase-admin'; // Import Admin SDK
import type { Store, Booking, BookingDocumentData, BookingStatus } from '@/lib/types';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore'; // Client SDK imports
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const STORE_COLLECTION = 'StoreInfo';
const BOOKINGS_COLLECTION = 'bookings';

// Helper to map Firestore doc data to Store (client-side representation)
const mapAdminDocToStore = (docSnapshot: admin.firestore.DocumentSnapshot): Store => {
  const data = docSnapshot.data()!;
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
  const data = docSnapshot.data() as BookingDocumentData; // Assuming BookingDocumentData has Timestamps
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
    // Convert Firestore Timestamp to ISO string date part
    bookingDate: data.bookingDate instanceof admin.firestore.Timestamp ? data.bookingDate.toDate().toISOString().split('T')[0] : (typeof data.bookingDate === 'string' ? data.bookingDate : new Date().toISOString().split('T')[0]),
    bookingTime: data.bookingTime,
    status: data.status,
    // Convert Firestore Timestamp to ISO string
    createdAt: data.createdAt instanceof admin.firestore.Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
    notes: data.notes,
  };
};

export async function getOwnerDashboardData(ownerId: string): Promise<{ bookings: Booking[], storesOwned: Store[] }> {
  if (!ownerId) {
    console.warn("[getOwnerDashboardData] ownerId is undefined or null.");
    return { bookings: [], storesOwned: [] };
  }
  console.log(`[getOwnerDashboardData] Fetching data for ownerId: ${ownerId} using Admin SDK`);

  try {
    const storesQuery = adminDb.collection(STORE_COLLECTION).where("ownerId", "==", ownerId);
    const storesSnapshot = await storesQuery.get();
    const storesOwned = storesSnapshot.docs.map(mapAdminDocToStore);
    console.log(`[getOwnerDashboardData] Found ${storesOwned.length} stores for owner ${ownerId}`);

    if (storesOwned.length === 0) {
      return { bookings: [], storesOwned: [] };
    }

    const storeIds = storesOwned.map(store => store.id);

    if (storeIds.length > 30) {
        console.warn(`[getOwnerDashboardData] Owner ${ownerId} has more than 30 stores (${storeIds.length}), booking fetch via 'in' query might be split or incomplete if not handled in chunks.`);
    }
    
    let bookings: Booking[] = [];
    if (storeIds.length > 0) {
        const bookingsQuery = adminDb.collection(BOOKINGS_COLLECTION)
            .where("storeId", "in", storeIds)
            .orderBy("bookingDate", "desc") 
            .orderBy("bookingTime", "asc");
        const bookingsSnapshot = await bookingsQuery.get();
        bookings = bookingsSnapshot.docs.map(mapAdminDocToBooking);
        console.log(`[getOwnerDashboardData] Found ${bookings.length} bookings for stores: ${storeIds.join(', ')}`);
    }
    
    return { bookings, storesOwned };
  } catch (error) {
    console.error(`[getOwnerDashboardData] Error fetching owner dashboard data for ${ownerId} with Admin SDK:`, error);
    return { bookings: [], storesOwned: [] }; 
  }
}

const bookingStatusUpdateSchema = z.object({
    bookingId: z.string().min(1, "Booking ID is required."),
    newStatus: z.enum(['pending', 'confirmed', 'completed', 'cancelled_by_user', 'cancelled_by_store', 'no_show']),
    bookingStoreId: z.string().min(1, "Store ID for the booking is required."), 
});

export async function updateBookingStatusAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string; errors?: any }> {
  console.log("[updateBookingStatusAction] FormData entries (Admin SDK will be used):");
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  const validatedFields = bookingStatusUpdateSchema.safeParse({
    bookingId: formData.get('bookingId'),
    newStatus: formData.get('newStatus'),
    bookingStoreId: formData.get('bookingStoreId'),
  });

  if (!validatedFields.success) {
    console.error("[updateBookingStatusAction] Zod validation failed:", JSON.stringify(validatedFields.error.flatten().fieldErrors, null, 2));
    return {
      success: false,
      message: "Μη έγκυρα δεδομένα για την ενημέρωση κατάστασης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  console.log("[updateBookingStatusAction] Zod validation successful. Data:", validatedFields.data);

  const { bookingId, newStatus, bookingStoreId } = validatedFields.data;

  try {
    const bookingRef = adminDb.collection(BOOKINGS_COLLECTION).doc(bookingId);
    // Note: With Admin SDK, Firestore rules are bypassed for this write.
    // Server-side authorization (e.g., checking if the invoking user IS the owner of bookingStoreId)
    // would be custom logic if needed, separate from Firestore rules.
    console.log(`[updateBookingStatusAction] Admin SDK: Attempting to update booking ${bookingId} to status ${newStatus}. Store ID: ${bookingStoreId}`);

    await bookingRef.update({
      status: newStatus,
    });
    console.log(`[updateBookingStatusAction] Admin SDK: Booking ${bookingId} status updated to ${newStatus} in Firestore.`);

    revalidatePath('/dashboard');
    return { success: true, message: `Η κατάσταση της κράτησης ενημερώθηκε σε "${newStatus}".` };

  } catch (error: any) {
    console.error(`[updateBookingStatusAction] Admin SDK: Error updating booking status for ${bookingId}:`, error);
    let clientMessage = "Σφάλμα κατά την ενημέρωση της κατάστασης της κράτησης.";
    if (error.code) {
        clientMessage += ` (Code: ${error.code})`;
    }
    return { success: false, message: clientMessage };
  }
}

export async function getUserBookings(userId: string): Promise<Booking[]> {
  console.log(`[getUserBookings] Attempting to fetch bookings for userId: ${userId} using Admin SDK.`);
  if (!userId) {
    console.warn("[getUserBookings] userId is undefined or null. Returning empty array.");
    return [];
  }

  try {
    const bookingsQuery = adminDb.collection(BOOKINGS_COLLECTION) // Use adminDb
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
      console.log(`[getUserBookings] Admin SDK: Mapping document ID: ${docSnap.id}, Data:`, docSnap.data());
      return mapAdminDocToBooking(docSnap); // Use mapAdminDocToBooking
    });
    
    console.log(`[getUserBookings] Admin SDK: Successfully mapped ${userBookings.length} bookings for user ${userId}.`);
    return userBookings;
  } catch (error: any) {
    console.error(`[getUserBookings] Admin SDK: Error fetching bookings for user ${userId}. Code: ${error.code || 'N/A'}, Message: ${error.message || 'Unknown error'}`, error);
    // The Admin SDK bypasses Firestore rules, so "permission-denied" is less likely here unless there's an issue with Admin SDK setup.
    // "failed-precondition" for missing index is still very relevant.
    if (error.code === 'failed-precondition') {
        console.error("[getUserBookings] Admin SDK: Firestore query failed. This often indicates a missing composite index. Please check the Firebase console for index suggestions for the 'bookings' collection, likely needing (userId [ASC/DESC], bookingDate [DESC], bookingTime [ASC]).");
    }
    return []; // Return empty array on error
  }
}
