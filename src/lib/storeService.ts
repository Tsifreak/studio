
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
import type { Store, Feature, StoreCategory, StoreFormData, SerializedFeature, Review, Product, PricingPlan } from '@/lib/types';
import { AppCategories } from './types'; 

const STORE_COLLECTION = 'StoreInfo'; 

const convertTimestampsInReviews = (reviews: any[]): Review[] => {
  return reviews.map(review => ({
    ...review,
    date: review.date instanceof Timestamp ? review.date.toDate().toISOString() : review.date,
  }));
};

const serializeFeaturesForDB = (features: Feature[]): SerializedFeature[] => {
  return features.map((feature: Feature): SerializedFeature => {
    const originalIcon = feature.icon;
    let iconName: string | undefined = undefined;

    if (typeof originalIcon === 'string') {
      iconName = originalIcon;
    } else if (originalIcon && typeof originalIcon === 'function') {
      iconName = (originalIcon as any).displayName || (originalIcon as any).name || 'UnknownIcon';
    }
    return {
      id: feature.id,
      name: feature.name,
      description: feature.description,
      icon: iconName, 
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
    category: data.category || AppCategories[0].slug, 
    tags: data.tags || [],
    features: data.features || [], 
    reviews: data.reviews ? convertTimestampsInReviews(data.reviews) : [],
    products: data.products || [],
    pricingPlans: data.pricingPlans || [],
    contactEmail: data.contactEmail,
    websiteUrl: data.websiteUrl,
    address: data.address,
    ownerId: data.ownerId, // Include ownerId
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
    return undefined;
  } catch (error) {
    console.error(`Error fetching store ${id} from DB:`, error);
    return undefined;
  }
};

export async function addStoreToDB(data: StoreFormData): Promise<Store> {
  const defaultCategorySlug = AppCategories.length > 0 ? AppCategories[0].slug : "mechanic"; 

  const storeDataForDB: Omit<Store, 'id'> = { 
    name: data.name,
    logoUrl: data.logoUrl,
    bannerUrl: data.bannerUrl || "https://picsum.photos/seed/default_banner/800/300", 
    description: data.description,
    longDescription: data.longDescription || "",
    rating: 0, 
    category: defaultCategorySlug as StoreCategory, 
    tags: data.tagsInput?.split(',').map(t => t.trim()).filter(Boolean) || [],
    contactEmail: data.contactEmail || "",
    websiteUrl: data.websiteUrl || "",
    address: data.address || "",
    features: [], 
    pricingPlans: [], 
    reviews: [], 
    products: [],
    ownerId: undefined, // Initialize ownerId as undefined
  };

  try {
    const docRef = await addDoc(collection(db, STORE_COLLECTION), storeDataForDB);
    return { ...storeDataForDB, id: docRef.id };
  } catch (error) {
    console.error("Error adding store to DB:", error);
    throw error; 
  }
}

export const updateStoreInDB = async (storeId: string, updatedData: Partial<StoreFormData & { ownerId?: string }>): Promise<Store | undefined> => {
  const storeRef = doc(db, STORE_COLLECTION, storeId);
  
  const firestoreUpdatePayload: { [key: string]: any } = {};

  // Fields from StoreFormData
  if (updatedData.name !== undefined) firestoreUpdatePayload.name = updatedData.name;
  if (updatedData.logoUrl !== undefined) firestoreUpdatePayload.logoUrl = updatedData.logoUrl;
  if (updatedData.bannerUrl !== undefined) firestoreUpdatePayload.bannerUrl = updatedData.bannerUrl;
  if (updatedData.description !== undefined) firestoreUpdatePayload.description = updatedData.description;
  if (updatedData.longDescription !== undefined) firestoreUpdatePayload.longDescription = updatedData.longDescription;
  if (updatedData.contactEmail !== undefined) firestoreUpdatePayload.contactEmail = updatedData.contactEmail;
  if (updatedData.websiteUrl !== undefined) firestoreUpdatePayload.websiteUrl = updatedData.websiteUrl;
  if (updatedData.address !== undefined) firestoreUpdatePayload.address = updatedData.address;
  
  if (updatedData.tagsInput !== undefined) {
    firestoreUpdatePayload.tags = updatedData.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
  }
  
  // Specific field for ownerId (if it's part of the update, not in StoreFormData)
  if (updatedData.ownerId !== undefined) firestoreUpdatePayload.ownerId = updatedData.ownerId;

  if (Object.keys(firestoreUpdatePayload).length === 0) {
    const existingDoc = await getDoc(storeRef);
    return existingDoc.exists() ? mapDocToStore(existingDoc) : undefined;
  }

  try {
    await updateDoc(storeRef, firestoreUpdatePayload);
    const updatedDoc = await getDoc(storeRef);
    if (updatedDoc.exists()) {
      return mapDocToStore(updatedDoc);
    }
    return undefined;
  } catch (error) {
    console.error(`Error updating store ${storeId} in DB:`, error);
    throw error;
  }
};

export const updateStoreCategoryInDB = async (storeId: string, newCategory: StoreCategory): Promise<Store | undefined> => {
  const storeRef = doc(db, STORE_COLLECTION, storeId);
  try {
    await updateDoc(storeRef, { category: newCategory });
    const updatedDoc = await getDoc(storeRef);
    if (updatedDoc.exists()) {
      return mapDocToStore(updatedDoc);
    }
    return undefined;
  } catch (error) {
    console.error(`Error updating category for store ${storeId} in DB:`, error);
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
    await updateDoc(storeRef, {
      reviews: arrayUnion(newReview)
    });
    
    const storeSnap = await getDoc(storeRef);
    if (storeSnap.exists()) {
      const storeData = storeSnap.data();
      if (storeData.reviews && storeData.reviews.length > 0) {
        const totalRating = storeData.reviews.reduce((acc: number, review: Review) => acc + review.rating, 0);
        const newAverageRating = totalRating / storeData.reviews.length;
        await updateDoc(storeRef, { rating: newAverageRating });
      }
    }
    return true;
  } catch (error) {
    console.error(`Error adding review to store ${storeId} in DB:`, error);
    return false;
  }
};
