
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
import type { Timestamp as AdminTimestamp } from 'firebase-admin/firestore'; // Admin SDK Timestamp for type checking

const STORE_COLLECTION = 'StoreInfo'; 

const convertTimestampsInReviews = (reviews: any[]): Review[] => {
  if (!Array.isArray(reviews)) {
    return [];
  }
  return reviews.map(review => {
    const dateVal = review.date;
    let isoDateString: string;

    if (dateVal && typeof dateVal.toDate === 'function') {
      // Handles client and admin SDK Timestamp instances if they retain their class methods
      isoDateString = dateVal.toDate().toISOString();
    } else if (dateVal && typeof dateVal === 'object' && dateVal !== null &&
               Object.prototype.hasOwnProperty.call(dateVal, '_seconds') && typeof dateVal._seconds === 'number' &&
               Object.prototype.hasOwnProperty.call(dateVal, '_nanoseconds') && typeof dateVal._nanoseconds === 'number') {
      // Specifically handle plain objects like { _seconds: ..., _nanoseconds: ... } from Admin SDK or serialization
      isoDateString = new Date(dateVal._seconds * 1000 + dateVal._nanoseconds / 1000000).toISOString();
    } else if (dateVal && typeof dateVal === 'object' && dateVal !== null &&
               Object.prototype.hasOwnProperty.call(dateVal, 'seconds') && typeof dateVal.seconds === 'number' &&
               Object.prototype.hasOwnProperty.call(dateVal, 'nanoseconds') && typeof dateVal.nanoseconds === 'number') {
      // Specifically handle plain objects like { seconds: ..., nanoseconds: ... } from client SDK after JSON.stringify/parse
      isoDateString = new Date(dateVal.seconds * 1000 + dateVal.nanoseconds / 1000000).toISOString();
    } else if (typeof dateVal === 'string') {
      // Assume it's already an ISO string or parseable by Date constructor
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) {
          console.warn(`[convertTimestampsInReviews] Date string "${dateVal}" is invalid, using current date as fallback.`);
          isoDateString = new Date().toISOString();
        } else {
          isoDateString = d.toISOString();
        }
      } catch (e) {
        console.warn(`[convertTimestampsInReviews] Error parsing date string "${dateVal}", using current date as fallback:`, e);
        isoDateString = new Date().toISOString();
      }
    } else if (dateVal instanceof Date) {
      // Is a JS Date object
      isoDateString = dateVal.toISOString();
    } else {
      console.warn("[convertTimestampsInReviews] Review date is of an unexpected type or null/undefined, using current date as fallback. Date value:", dateVal);
      isoDateString = new Date().toISOString(); // Fallback
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
    // Ensure categories default to an empty array if not present or not an array
    categories: data.categories && Array.isArray(data.categories) ? data.categories : [],
    tags: data.tags || [],
    features: data.features || [], 
    reviews: data.reviews ? convertTimestampsInReviews(data.reviews) : [],
    products: data.products || [],
    pricingPlans: data.pricingPlans || [],
    contactEmail: data.contactEmail,
    websiteUrl: data.websiteUrl,
    address: data.address,
    location: data.location || { latitude: 0, longitude: 0 }, // Ensure location exists
    ownerId: data.ownerId || null, // Default to null if not present
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
    const firestoreUpdatePayload = { ...updatedData };
    if (firestoreUpdatePayload.reviews) {
      firestoreUpdatePayload.reviews = firestoreUpdatePayload.reviews.map(r => ({
        ...r,
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
