
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
  Timestamp as ClientTimestamp, // Client SDK Timestamp
} from 'firebase/firestore';
import type { Store, Feature, StoreCategory, StoreFormData, SerializedFeature, Review, Product, PricingPlan, Service, AvailabilitySlot } from '@/lib/types';
import { AppCategories } from './types'; 
// AdminTimestamp is only used for type checking/comparison if necessary, not for client-side operations directly here.
// import type { Timestamp as AdminTimestamp } from 'firebase-admin/firestore'; 

const STORE_COLLECTION = 'StoreInfo'; 

const convertTimestampsInReviews = (reviews: any[]): Review[] => {
  if (!Array.isArray(reviews)) {
    return [];
  }
  return reviews.map(review => {
    const dateVal = review.date;
    let isoDateString: string;

    // Check for Firebase Timestamp objects (both client and admin SDK have toDate)
    if (dateVal && typeof dateVal.toDate === 'function') {
      isoDateString = dateVal.toDate().toISOString();
    } 
    // Check for plain objects with _seconds and _nanoseconds (often from Admin SDK or serialization)
    else if (dateVal && typeof dateVal === 'object' && dateVal !== null &&
               Object.prototype.hasOwnProperty.call(dateVal, '_seconds') && typeof dateVal._seconds === 'number' &&
               Object.prototype.hasOwnProperty.call(dateVal, '_nanoseconds') && typeof dateVal._nanoseconds === 'number') {
      isoDateString = new Date(dateVal._seconds * 1000 + dateVal._nanoseconds / 1000000).toISOString();
    } 
    // Check for plain objects with seconds and nanoseconds (often from client SDK after JSON.stringify/parse)
    else if (dateVal && typeof dateVal === 'object' && dateVal !== null &&
               Object.prototype.hasOwnProperty.call(dateVal, 'seconds') && typeof dateVal.seconds === 'number' &&
               Object.prototype.hasOwnProperty.call(dateVal, 'nanoseconds') && typeof dateVal.nanoseconds === 'number') {
      isoDateString = new Date(dateVal.seconds * 1000 + dateVal.nanoseconds / 1000000).toISOString();
    } 
    // Check if it's already a string (could be an ISO string or other parsable date string)
    else if (typeof dateVal === 'string') {
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) {
          // If string is invalid, fallback
          console.warn(`[convertTimestampsInReviews] Date string "${dateVal}" is invalid, using current date as fallback.`);
          isoDateString = new Date().toISOString();
        } else {
          isoDateString = d.toISOString();
        }
      } catch (e) {
        // Catch any errors from new Date(dateVal)
        console.warn(`[convertTimestampsInReviews] Error parsing date string "${dateVal}", using current date as fallback:`, e);
        isoDateString = new Date().toISOString();
      }
    } 
    // Check if it's a JavaScript Date object
    else if (dateVal instanceof Date) {
      isoDateString = dateVal.toISOString();
    } 
    // Fallback for any other unexpected type or null/undefined
    else {
      console.warn("[convertTimestampsInReviews] Review date is of an unexpected type or null/undefined, using current date as fallback. Date value:", dateVal);
      isoDateString = new Date().toISOString(); 
    }

    return {
      ...review,
      date: isoDateString,
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
    categories: data.categories && Array.isArray(data.categories) ? data.categories : [],
    tags: data.tags || [],
    features: data.features || [], 
    reviews: data.reviews ? convertTimestampsInReviews(data.reviews) : [],
    products: data.products || [],
    pricingPlans: data.pricingPlans || [],
    contactEmail: data.contactEmail,
    websiteUrl: data.websiteUrl,
    address: data.address,
    location: data.location || { latitude: 0, longitude: 0 }, 
    ownerId: data.ownerId || null, 
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

// These functions are primarily for client-side operations if needed,
// but admin writes should use the Admin SDK via server actions.
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
    const firestoreUpdatePayload: { [key: string]: any } = { ...updatedData };
    if (firestoreUpdatePayload.reviews) {
      firestoreUpdatePayload.reviews = firestoreUpdatePayload.reviews.map(r => ({
        ...r,
        // Ensure date is a Firestore Timestamp if it's a string before client-side update
        date: typeof r.date === 'string' ? ClientTimestamp.fromDate(new Date(r.date)) : r.date 
      }));
    }
    console.log(`[storeService] Attempting to update store ${storeId} in DB with payload:`, firestoreUpdatePayload);
    await updateDoc(storeRef, firestoreUpdatePayload);
    console.log(`[storeService] Store ${storeId} updated successfully in DB.`);
    const updatedDoc = await getDoc(storeRef);
    return updatedDoc.exists() ? mapDocToStore(updatedDoc) : undefined;
  } catch (error: any) {
    console.error(`[storeService] Error updating store ${storeId} in DB: Code: ${error.code || 'N/A'}, Message: ${error.message || 'Unknown error'}`, error);
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
