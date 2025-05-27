
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
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import type { Store, Feature, StoreCategory, StoreFormData, SerializedFeature, Review, Product, PricingPlan, Service, AvailabilitySlot } from '@/lib/types';
import { AppCategories } from './types'; 

const STORE_COLLECTION = 'StoreInfo'; 

const convertTimestampsInReviews = (reviews: any[]): Review[] => {
  return reviews.map(review => ({
    ...review,
    date: review.date instanceof Timestamp ? review.date.toDate().toISOString() : review.date,
  }));
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
    categories: data.categories && Array.isArray(data.categories) ? data.categories : (AppCategories.length > 0 ? [AppCategories[0].slug as StoreCategory] : []),
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
    await updateDoc(storeRef, updatedData);
    const updatedDoc = await getDoc(storeRef);
    return updatedDoc.exists() ? mapDocToStore(updatedDoc) : undefined;
  } catch (error: any) {
    console.error(`Error updating store ${storeId} in DB: Code: ${error.code}, Message: ${error.message}`, error);
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

export const addReviewToStoreInDB = async (storeId: string, newReview: Review): Promise<boolean> => {
  const storeRef = doc(db, STORE_COLLECTION, storeId);
  try {
    const reviewWithTimestamp = {
      ...newReview,
      date: Timestamp.fromDate(new Date(newReview.date)),
    };

    await updateDoc(storeRef, {
      reviews: arrayUnion(reviewWithTimestamp)
    });
    
    const storeSnap = await getDoc(storeRef);
    if (storeSnap.exists()) {
      const storeData = storeSnap.data();
      if (storeData.reviews && storeData.reviews.length > 0) {
        const totalRating = storeData.reviews.reduce((acc: number, review: Review) => acc + review.rating, 0);
        const newAverageRating = totalRating / storeData.reviews.length;
        await updateDoc(storeRef, { rating: newAverageRating });
      } else {
        await updateDoc(storeRef, { rating: 0 }); 
      }
    }
    return true;
  } catch (error) {
    console.error(`Error adding review to store ${storeId} in DB:`, error);
    return false;
  }
};
