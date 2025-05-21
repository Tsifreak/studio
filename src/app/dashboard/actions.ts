
"use server";

import { db } from '@/lib/firebase';
import type { Store, Booking, BookingDocumentData, BookingStatus } from '@/lib/types';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const STORE_COLLECTION = 'StoreInfo';
const BOOKINGS_COLLECTION = 'bookings';

const mapDocToStore = (docSnapshot: any): Store => {
  const data = docSnapshot.data();
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
    reviews: data.reviews ? data.reviews.map((r: any) => ({ ...r, date: r.date instanceof Timestamp ? r.date.toDate().toISOString() : r.date })) : [],
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

const mapDocToBooking = (docSnapshot: any): Booking => {
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
    bookingDate: data.bookingDate instanceof Timestamp ? data.bookingDate.toDate().toISOString().split('T')[0] : data.bookingDate,
    bookingTime: data.bookingTime,
    status: data.status,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
    notes: data.notes,
  };
};

export async function getOwnerDashboardData(ownerId: string): Promise<{ bookings: Booking[], storesOwned: Store[] }> {
  if (!ownerId) {
    console.warn("[getOwnerDashboardData] ownerId is undefined or null.");
    return { bookings: [], storesOwned: [] };
  }
  console.log(`[getOwnerDashboardData] Fetching data for ownerId: ${ownerId}`);

  try {
    // 1. Fetch stores owned by the user
    const storesQuery = query(collection(db, STORE_COLLECTION), where("ownerId", "==", ownerId));
    const storesSnapshot = await getDocs(storesQuery);
    const storesOwned = storesSnapshot.docs.map(mapDocToStore);
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
        const bookingsQuery = query(
            collection(db, BOOKINGS_COLLECTION),
            where("storeId", "in", storeIds),
            orderBy("bookingDate", "desc"), 
            orderBy("bookingTime", "asc")
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        bookings = bookingsSnapshot.docs.map(mapDocToBooking);
        console.log(`[getOwnerDashboardData] Found ${bookings.length} bookings for stores: ${storeIds.join(', ')}`);
    }
    
    return { bookings, storesOwned };
  } catch (error) {
    console.error(`[getOwnerDashboardData] Error fetching owner dashboard data for ${ownerId}:`, error);
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
  console.log("[updateBookingStatusAction] FormData entries:");
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
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    
    // TODO: Add server-side authorization check here:
    // Ensure the authenticated user (if available via auth context or similar mechanism for server actions)
    // is the owner of the store associated with this bookingId (bookingStoreId).
    // This is crucial for security. For now, we proceed without it.
    console.log(`[updateBookingStatusAction] Attempting to update booking ${bookingId} to status ${newStatus}. Store ID for authorization context (not yet used): ${bookingStoreId}`);

    await updateDoc(bookingRef, {
      status: newStatus,
    });
    console.log(`[updateBookingStatusAction] Booking ${bookingId} status updated to ${newStatus} in Firestore.`);

    revalidatePath('/dashboard');
    return { success: true, message: `Η κατάσταση της κράτησης ενημερώθηκε σε "${newStatus}".` };

  } catch (error: any) {
    console.error(`[updateBookingStatusAction] Error updating booking status for ${bookingId}:`, error);
    let clientMessage = "Σφάλμα κατά την ενημέρωση της κατάστασης της κράτησης.";
    if (error.code) {
        clientMessage += ` (Code: ${error.code})`;
    }
    return { success: false, message: clientMessage };
  }
}

export async function getUserBookings(userId: string): Promise<Booking[]> {
  console.log(`[getUserBookings] Attempting to fetch bookings for userId: ${userId}`);
  if (!userId) {
    console.warn("[getUserBookings] userId is undefined or null. Returning empty array.");
    return [];
  }

  try {
    const bookingsQuery = query(
      collection(db, BOOKINGS_COLLECTION), // Still using client SDK 'db'
      where("userId", "==", userId),
      orderBy("bookingDate", "desc"),
      orderBy("bookingTime", "asc")
    );
    console.log(`[getUserBookings] Constructed query for userId: ${userId}`);
    const bookingsSnapshot = await getDocs(bookingsQuery);
    console.log(`[getUserBookings] Query successful. Found ${bookingsSnapshot.docs.length} booking documents for userId: ${userId}`);

    if (bookingsSnapshot.empty) {
      console.log(`[getUserBookings] No booking documents found for userId: ${userId}.`);
      return [];
    }

    const userBookings = bookingsSnapshot.docs.map(doc => {
      console.log(`[getUserBookings] Mapping document ID: ${doc.id}, Data:`, doc.data());
      return mapDocToBooking(doc);
    });
    
    console.log(`[getUserBookings] Successfully mapped ${userBookings.length} bookings for user ${userId}.`);
    return userBookings;
  } catch (error: any) {
    console.error(`[getUserBookings] Error fetching bookings for user ${userId}. Code: ${error.code}, Message: ${error.message}`, error);
    // Potentially check for specific error codes like 'permission-denied' or 'failed-precondition' (missing index)
    if (error.code === 'failed-precondition') {
        console.error("[getUserBookings] Firestore query failed. This often indicates a missing composite index. Please check the Firebase console for index suggestions for the 'bookings' collection, likely needing (userId [ASC/DESC], bookingDate [DESC], bookingTime [ASC]).");
    } else if (error.code === 'permission-denied') {
        console.error("[getUserBookings] Firestore permission denied. Check your security rules for the 'bookings' collection to ensure the user has read access.");
    }
    return []; // Return empty array on error
  }
}
