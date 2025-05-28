
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

    if (dateVal && typeof (dateVal as any).toDate === 'function') { // Handles Firestore Timestamp instances (client or admin)
      isoDateString = (dateVal as any).toDate().toISOString();
    } else if (dateVal && typeof dateVal === 'object' && dateVal !== null &&
               Object.prototype.hasOwnProperty.call(dateVal, '_seconds') && typeof (dateVal as any)._seconds === 'number' &&
               Object.prototype.hasOwnProperty.call(dateVal, '_nanoseconds') && typeof (dateVal as any)._nanoseconds === 'number') {
      // Handles objects like { _seconds: ..., _nanoseconds: ... } (often from Admin SDK or direct Firestore data)
      isoDateString = new Date((dateVal as any)._seconds * 1000 + (dateVal as any)._nanoseconds / 1000000).toISOString();
    } else if (dateVal && typeof dateVal === 'object' && dateVal !== null &&
               Object.prototype.hasOwnProperty.call(dateVal, 'seconds') && typeof (dateVal as any).seconds === 'number' &&
               Object.prototype.hasOwnProperty.call(dateVal, 'nanoseconds') && typeof (dateVal as any).nanoseconds === 'number') {
      // Handles objects like { seconds: ..., nanoseconds: ... } (often from client SDK after JSON.stringify/parse)
      isoDateString = new Date((dateVal as any).seconds * 1000 + (dateVal as any).nanoseconds / 1000000).toISOString();
    } else if (typeof dateVal === 'string') {
      // Handles if it's already a string (could be ISO or other parsable date string)
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) { // Check if the parsed date is valid
          console.warn(`[convertTimestampsInReviews] Date string "${dateVal}" is invalid, using current date as fallback. Review ID: ${review.id}`);
          isoDateString = new Date().toISOString();
        } else {
          isoDateString = d.toISOString();
        }
      } catch (e) {
        console.warn(`[convertTimestampsInReviews] Error parsing date string "${dateVal}", using current date as fallback. Review ID: ${review.id}:`, e);
        isoDateString = new Date().toISOString();
      }
    } else if (dateVal instanceof Date) {
      // Handles if it's a JavaScript Date object
      isoDateString = dateVal.toISOString();
    } else {
      // Fallback for any other unexpected type or null/undefined
      console.warn(`[convertTimestampsInReviews] Review date is of an unexpected type or null/undefined, using current date as fallback. Review ID: ${review.id}, Date value:`, dateVal);
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
export async function addStoreToDB(data: StoreFormData): Promise<Store> {
  const storeData: Omit<Store, 'id'> = {
    name: data.name,
    logoUrl: data.logoUrl || '',
    bannerUrl: data.bannerUrl || '',
    description: data.description,
    longDescription: data.longDescription || '',
    rating: 0,
    categories: data.categoriesInput?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) as StoreCategory[] || [],
    tags: data.tagsInput?.split(',').map(t => t.trim()).filter(Boolean) || [],
    contactEmail: data.contactEmail || '',
    websiteUrl: data.websiteUrl || '',
    address: data.address || '',
    features: [], // Default to empty, features are usually managed separately or via admin
    pricingPlans: [], // Default
    reviews: [], // Default
    products: [], // Default
    ownerId: data.ownerId || null,
    services: data.servicesJson ? JSON.parse(data.servicesJson) : [],
    availability: data.availabilityJson ? JSON.parse(data.availabilityJson) : [],
    location: { latitude: 0, longitude: 0 } // Needs to be set, perhaps from form
  };
  try {
    const docRef = await addDoc(collection(db, STORE_COLLECTION), storeData);
    return { ...storeData, id: docRef.id };
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
      firestoreUpdatePayload.reviews = firestoreUpdatePayload.reviews.map((r: Review) => ({
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

