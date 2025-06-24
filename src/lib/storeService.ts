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
  Timestamp as ClientTimestamp
} from 'firebase/firestore';

import type {
  Store,
  Feature,
  StoreCategory,
  StoreFormData,
  SerializedFeature,
  Review,
  Product,
  PricingPlan,
  Service,
  AvailabilitySlot,
  UserProfileFirestoreData
} from '@/lib/types';

import { AppCategories } from './types';

const STORE_COLLECTION = 'StoreInfo';
const USER_PROFILES_COLLECTION = 'userProfiles';

const convertTimestampsInReviews = (reviews: any[]): Review[] => {
  if (!Array.isArray(reviews)) {
    return [];
  }
  return reviews.map(review => {
    const dateVal = review.date;
    let isoDateString: string;

    if (dateVal && typeof (dateVal as any).toDate === 'function') {
      isoDateString = (dateVal as any).toDate().toISOString();
    } else if (dateVal && typeof dateVal === 'object' && dateVal !== null &&
      Object.prototype.hasOwnProperty.call(dateVal, '_seconds') &&
      typeof (dateVal as any)._seconds === 'number' &&
      Object.prototype.hasOwnProperty.call(dateVal, '_nanoseconds') &&
      typeof (dateVal as any)._nanoseconds === 'number') {
      isoDateString = new Date(
        (dateVal as any)._seconds * 1000 +
        (dateVal as any)._nanoseconds / 1000000
      ).toISOString();
    } else if (dateVal && typeof dateVal === 'object' && dateVal !== null &&
      Object.prototype.hasOwnProperty.call(dateVal, 'seconds') &&
      typeof (dateVal as any).seconds === 'number' &&
      Object.prototype.hasOwnProperty.call(dateVal, 'nanoseconds') &&
      typeof (dateVal as any).nanoseconds === 'number') {
      isoDateString = new Date(
        (dateVal as any).seconds * 1000 +
        (dateVal as any).nanoseconds / 1000000
      ).toISOString();
    } else if (typeof dateVal === 'string') {
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) {
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
      isoDateString = dateVal.toISOString();
    } else {
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
  console.log(`[mapDocToStore] Raw data from Firestore for ID ${docSnapshot.id}:`, data);
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
    specializedBrands: data.specializedBrands || [],
    tyreBrands: data.tyreBrands || [],
    iconType: data.iconType,
    savedByUsers: data.savedByUsers || [],
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
    features: [],
    pricingPlans: [],
    reviews: [],
    products: [],
    ownerId: data.ownerId || null,
    services: data.servicesJson ? JSON.parse(data.servicesJson) : [],
    availability: data.availabilityJson ? JSON.parse(data.availabilityJson) : [],
    location: { latitude: 0, longitude: 0 },
    specializedBrands: data.specializedBrands || [],
    tyreBrands: data.tyreBrands || [],
    savedByUsers: [],
  };
  try {
    const docRef = await addDoc(collection(db, STORE_COLLECTION), storeData);
    return { ...storeData, id: docRef.id };
  } catch (error) {
    console.error("Error adding store to DB:", error);
    throw error;
  }
}

export const updateStoreInDB = async (
  storeId: string,
  updatedData: Partial<Omit<Store, 'id'>>
): Promise<Store | undefined> => {
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

// ✅ Updated and simplified to avoid 'never' type error
export async function getSavedStoresForUser(userId: string): Promise<Store[]> {
  console.log(`[getSavedStoresForUser - Client Service] Fetching saved stores for user: ${userId}`);
  try {
    const userProfileRef = doc(db, USER_PROFILES_COLLECTION, userId);
    const userProfileDoc = await getDoc(userProfileRef);

    if (!userProfileDoc.exists()) {
      console.log(`[getSavedStoresForUser - Client Service] User profile not found for ${userId}. Returning empty array.`);
      return [];
    }

    const userProfileData = userProfileDoc.data() as UserProfileFirestoreData;
    const savedStoreIds = userProfileData.savedStores || [];

    if (savedStoreIds.length === 0) {
      console.log(`[getSavedStoresForUser - Client Service] No saved stores found for user ${userId}.`);
      return [];
    }

    console.log(`[getSavedStoresForUser - Client Service] Found ${savedStoreIds.length} saved store IDs. Fetching store details...`);

    const storePromises = savedStoreIds.map(id => getDoc(doc(db, STORE_COLLECTION, id)));
    const storeDocs = await Promise.all(storePromises);

    const savedStores: Store[] = [];
    storeDocs.forEach((docSnap, index) => {
      if (docSnap.exists()) {
        savedStores.push(mapDocToStore(docSnap));
      } else {
        const missingId = savedStoreIds[index];
        console.warn(`[getSavedStoresForUser - Client Service] Saved store ID ${missingId} not found in StoreInfo collection (might have been deleted).`);
      }
    });

    console.log(`[getSavedStoresForUser - Client Service] Successfully fetched ${savedStores.length} actual store documents.`);
    return savedStores;

  } catch (error: any) {
    console.error(`[getSavedStoresForUser - Client Service] Error fetching saved stores for user ${userId}. Message: ${error.message || 'Unknown error'}`, error);
    throw new Error("Failed to retrieve saved stores.");
  }
}
