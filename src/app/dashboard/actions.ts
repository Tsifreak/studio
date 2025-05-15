
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
    return { bookings: [], storesOwned: [] };
  }

  try {
    // 1. Fetch stores owned by the user
    const storesQuery = query(collection(db, STORE_COLLECTION), where("ownerId", "==", ownerId));
    const storesSnapshot = await getDocs(storesQuery);
    const storesOwned = storesSnapshot.docs.map(mapDocToStore);

    if (storesOwned.length === 0) {
      return { bookings: [], storesOwned: [] };
    }

    const storeIds = storesOwned.map(store => store.id);

    // 2. Fetch bookings for those stores
    // Firestore 'in' query is limited to 30 elements in the array.
    // If an owner can own more than 30 stores, this needs pagination or multiple queries.
    // For now, assuming fewer than 30 stores per owner.
    if (storeIds.length > 30) {
        console.warn("Owner has more than 30 stores, booking fetch might be incomplete due to 'in' query limit.");
        // Potentially fetch in chunks if this becomes an issue
    }
    
    let bookings: Booking[] = [];
    if (storeIds.length > 0) {
        const bookingsQuery = query(
            collection(db, BOOKINGS_COLLECTION),
            where("storeId", "in", storeIds),
            orderBy("bookingDate", "desc"), // Most recent bookings first
            orderBy("bookingTime", "asc")
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        bookings = bookingsSnapshot.docs.map(mapDocToBooking);
    }
    
    return { bookings, storesOwned };
  } catch (error) {
    console.error("Error fetching owner dashboard data:", error);
    return { bookings: [], storesOwned: [] }; // Return empty on error
  }
}

const bookingStatusUpdateSchema = z.object({
    bookingId: z.string().min(1, "Booking ID is required."),
    newStatus: z.enum(['pending', 'confirmed', 'completed', 'cancelled_by_user', 'cancelled_by_store', 'no_show']),
    // bookingStoreId: z.string().min(1, "Store ID for the booking is required."), // For future authorization
});

export async function updateBookingStatusAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string; errors?: any }> {
  const validatedFields = bookingStatusUpdateSchema.safeParse({
    bookingId: formData.get('bookingId'),
    newStatus: formData.get('newStatus'),
    // bookingStoreId: formData.get('bookingStoreId'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Μη έγκυρα δεδομένα για την ενημέρωση κατάστασης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { bookingId, newStatus } = validatedFields.data;

  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    
    // TODO: Add server-side authorization check here:
    // Ensure the authenticated user (if available via auth context or similar mechanism for server actions)
    // is the owner of the store associated with this bookingId.
    // This is crucial for security. For now, we proceed without it.

    await updateDoc(bookingRef, {
      status: newStatus,
    });

    revalidatePath('/dashboard');
    return { success: true, message: `Η κατάσταση της κράτησης ενημερώθηκε σε "${newStatus}".` };

  } catch (error) {
    console.error("Error updating booking status:", error);
    return { success: false, message: "Σφάλμα κατά την ενημέρωση της κατάστασης της κράτησης." };
  }
}
