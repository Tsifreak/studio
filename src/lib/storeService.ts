
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp, // Client SDK Timestamp
  arrayUnion,
} from 'firebase/firestore';
import type { Store, Feature, StoreCategory, StoreFormData, SerializedFeature, Review, Product, PricingPlan, Service, AvailabilitySlot } from '@/lib/types';
import { AppCategories } from './types'; 

const STORE_COLLECTION = 'StoreInfo'; 

const convertTimestampsInReviews = (reviews: any[]): Review[] => {
  if (!Array.isArray(reviews)) {
    return [];
  }
  return reviews.map(review => {
    let dateString = review.date; // Default to original if no conversion happens

    if (review.date && typeof review.date.toDate === 'function') {
      // Handles client and admin SDK Timestamp instances
      dateString = review.date.toDate().toISOString();
    } else if (review.date && (typeof review.date.seconds === 'number' || typeof review.date._seconds === 'number')) {
      // Handles plain objects that look like Timestamps (e.g., from JSON stringification/parsing or Admin SDK direct data)
      const seconds = review.date.seconds ?? review.date._seconds;
      const nanoseconds = review.date.nanoseconds ?? review.date._nanoseconds ?? 0;
      
      if (typeof seconds === 'number') { // Ensure seconds is a number before constructing Timestamp
        // Use the client SDK Timestamp constructor as this service is primarily for client-side fetching
        dateString = new Timestamp(seconds, nanoseconds).toDate().toISOString();
      } else {
        // If seconds isn't a number after trying both, it's an unexpected format
        console.warn(`[convertTimestampsInReviews] Review date has seconds/nanoseconds but 'seconds' is not a number:`, review.date);
        dateString = new Date().toISOString(); // Fallback to current date
      }
    } else if (typeof review.date === 'string') {
      // It's already a string, assume it's correct (e.g., an ISO string)
      // Optionally, add validation or re-parsing here if strings can be in various formats
      dateString = review.date;
    } else if (review.date) { // review.date exists but is not a Timestamp, plain object, or string
      console.warn("[convertTimestampsInReviews] Review date is of unexpected type, attempting direct conversion:", review.date, "Type:", typeof review.date);
      try {
        dateString = new Date(review.date).toISOString(); // Try to parse it directly
      } catch (e) {
        console.error("[convertTimestampsInReviews] Failed to convert date, using current date as fallback:", review.date, e);
        dateString = new Date().toISOString(); // Last resort fallback
      }
    } else { // review.date is null or undefined
      console.warn("[convertTimestampsInReviews] Review date is null or undefined, using current date as fallback.");
      dateString = new Date().toISOString(); // Default if date is missing
    }

    return {
      ...review,
      date: dateString,
    };
  });
};

const mapDocToStore = (docSnapshot: any): Store => {
  const data = docSnapshot.data();
  const store: Store = {
    id: docSnapshot.id,
    name: data.name || '',
    logoUrl: data.logoUrl || '',
    bannerUrl: data.bannerUrl,
    description: data.description || '',
    longDescription: data.longDescription,
    rating: data.rating || 0,
    categories: data.categories && Array.isArray(data.categories) && data.categories.length > 0 ? data.categories : [],
    tags: data.tags || [],
    features: data.features || [], 
    reviews: data.reviews ? convertTimestampsInReviews(data.reviews) : [],
    products: data.products || [],
    pricingPlans: data.pricingPlans || [],
    contactEmail: data.contactEmail,
    websiteUrl: data.websiteUrl,
    address: data.address,
    ownerId: data.ownerId,
    services: data.services || [],
    availability: data.availability || [],
  };
  return store;
};

export const getAllStoresFromDB = async (): Promise<Store[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, STORE_COLLECTION));
    return querySnapshot.docs.map(mapDocToStore);
  } catch (error) {
    console.error("Error fetching stores from DB:", error);
    return []; 
  }
};

export const getStoreByIdFromDB = async (id: string): Promise<Store | undefined> => {
  try {
    const docRef = doc(db, STORE_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapDocToStore(docSnap);
    }
    console.warn(`[getStoreByIdFromDB] No store found for ID: ${id}`);
    return undefined;
  } catch (error) {
    console.error(`Error fetching store ${id} from DB:`, error);
    return undefined;
  }
};

// Note: addStoreToDB and updateStoreInDB are simplified here as the primary logic
// for data preparation (parsing JSON, handling categories) is in the server actions
// which then call these with a more structured payload.
export async function addStoreToDB(data: Omit<Store, 'id'>): Promise<Store> {
  try {
    const docRef = await addDoc(collection(db, STORE_COLLECTION), data);
    return { ...data, id: docRef.id };
  } catch (error) {
    console.error("Error adding store to DB:", error);
    throw error; 
  }
}

export const updateStoreInDB = async (storeId: string, updatedData: Partial<Omit<Store, 'id'>>): Promise<Store | undefined> => {
  const storeRef = doc(db, STORE_COLLECTION, storeId);
  try {
    // Construct the payload for Firestore, ensuring Timestamps for date fields if they are part of updatedData
    // For example, if updatedData.reviews exists, ensure its date fields are Timestamps.
    // However, server actions are now responsible for converting to Admin SDK Timestamps before calling this.
    // This function assumes `updatedData` is already Firestore-compatible.
    const firestoreUpdatePayload = { ...updatedData };
    if (firestoreUpdatePayload.reviews) {
      firestoreUpdatePayload.reviews = firestoreUpdatePayload.reviews.map(r => ({
        ...r,
        // If date is an ISO string, convert to client SDK Timestamp for client-side SDK update
        // If Admin SDK is used to call this, it would handle its own Timestamp type.
        // For now, assuming date might come as ISO string if modified via a form.
        date: typeof r.date === 'string' ? Timestamp.fromDate(new Date(r.date)) : r.date 
      }));
    }

    await updateDoc(storeRef, firestoreUpdatePayload);
    console.log(`[storeService] Store ${storeId} updated in DB with payload:`, firestoreUpdatePayload);
    const updatedDoc = await getDoc(storeRef);
    return updatedDoc.exists() ? mapDocToStore(updatedDoc) : undefined;
  } catch (error: any) {
    console.error(`[storeService] Error updating store ${storeId} in DB: Code: ${error.code}, Message: ${error.message}`, error);
    throw error;
  }
};


export const deleteStoreFromDB = async (storeId: string): Promise<boolean> => {
  const storeRef = doc(db, STORE_COLLECTION, storeId);
  try {
    await deleteDoc(storeRef);
    return true;
  } catch (error) {
    console.error(`Error deleting store ${storeId} from DB:`, error);
    return false;
  }
};

// This function is designed to be called by server actions that use the ADMIN SDK.
// It expects `newReview.date` to be an Admin SDK Timestamp or a JS Date.
export const addReviewToStoreInDBWithAdmin = async (
  adminDbInstance: FirebaseFirestore.Firestore, // Expecting Admin SDK Firestore instance
  storeId: string, 
  newReviewData: Omit<Review, 'id' | 'date'> & { date: Date | FirebaseFirestore.Timestamp } // Date can be JS Date or Admin Timestamp
): Promise<boolean> => {
  const storeRef = adminDbInstance.collection(STORE_COLLECTION).doc(storeId);
  try {
    const reviewForFirestore = {
      ...newReviewData,
      id: adminDbInstance.collection('_').doc().id, // Generate ID using admin instance
      date: newReviewData.date instanceof Date 
            ? FirebaseFirestore.Timestamp.fromDate(newReviewData.date) 
            : newReviewData.date, // Assume it's already an Admin Timestamp
    };

    const storeDoc = await storeRef.get();
    if (!storeDoc.exists) {
      console.error(`[addReviewToStoreInDBWithAdmin] Store ${storeId} not found.`);
      return false;
    }
    const storeData = storeDoc.data() as Store;
    
    const existingReviews = storeData.reviews ? convertTimestampsInReviews(storeData.reviews as any[]) : [];
    
    // Convert the new review's date to ISO string for calculation consistency if it's a Timestamp
    const newReviewForCalc = {
      ...reviewForFirestore,
      date: reviewForFirestore.date instanceof FirebaseFirestore.Timestamp 
            ? reviewForFirestore.date.toDate().toISOString() 
            : new Date(reviewForFirestore.date as any).toISOString(), // Fallback if it was a JS Date initially
    };

    const updatedReviewsForCalc = [...existingReviews, newReviewForCalc];
    
    const totalRating = updatedReviewsForCalc.reduce((acc, review) => acc + review.rating, 0);
    const newAverageRating = updatedReviewsForCalc.length > 0 
      ? parseFloat((totalRating / updatedReviewsForCalc.length).toFixed(2)) 
      : 0;

    await storeRef.update({
      reviews: FirebaseFirestore.FieldValue.arrayUnion(reviewForFirestore),
      rating: newAverageRating,
    });
    return true;
  } catch (error) {
    console.error(`Error adding review to store ${storeId} with Admin SDK:`, error);
    return false;
  }
};
