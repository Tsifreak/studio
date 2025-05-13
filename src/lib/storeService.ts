
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
} from 'firebase/firestore';
import type { Store, Feature, StoreCategory, StoreFormData, SerializedFeature, Review, Product, PricingPlan } from '@/lib/types';
import { StoreCategories } from './types';

const STORE_COLLECTION = 'storeinfo';

// Helper to convert Firestore Timestamps to ISO strings for dates in nested objects
const convertTimestampsInReviews = (reviews: any[]): Review[] => {
  return reviews.map(review => ({
    ...review,
    date: review.date instanceof Timestamp ? review.date.toDate().toISOString() : review.date,
  }));
};

// Helper to serialize feature icons before saving to Firestore
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

// Helper to deserialize feature icons (if needed, though RenderFeatureIcon handles strings)
// For now, we assume icons are stored as strings and RenderFeatureIcon handles them.

const mapDocToStore = (docSnapshot: any): Store => {
  const data = docSnapshot.data();
  const store: Store = {
    id: docSnapshot.id,
    name: data.name,
    logoUrl: data.logoUrl,
    bannerUrl: data.bannerUrl,
    description: data.description,
    longDescription: data.longDescription,
    rating: data.rating || 0,
    category: data.category,
    tags: data.tags || [],
    // Firestore stores features as an array of objects (SerializedFeature)
    features: data.features || [], 
    reviews: data.reviews ? convertTimestampsInReviews(data.reviews) : [],
    products: data.products || [],
    pricingPlans: data.pricingPlans || [],
    contactEmail: data.contactEmail,
    websiteUrl: data.websiteUrl,
    address: data.address,
  };
  return store;
};

export const getAllStoresFromDB = async (): Promise<Store[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, STORE_COLLECTION));
    return querySnapshot.docs.map(mapDocToStore);
  } catch (error) {
    console.error("Error fetching stores from DB:", error);
    return []; // Return empty array on error
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

// Placeholder for common features to be used if a new store doesn't provide them
const defaultFeatures: Feature[] = [
  { id: 'f1', name: 'Πιστοποιημένοι Τεχνικοί', icon: "Award" },
  { id: 'f2', name: 'Εγγύηση σε Ανταλλακτικά & Εργασία', icon: "ShieldCheck" },
  { id: 'f3', name: 'Χώρος Αναμονής Πελατών & WiFi', icon: "Users" },
];
const defaultSerializedFeatures = serializeFeaturesForDB(defaultFeatures);

const defaultProducts: Product[] = [
    { id: 's1_default', name: 'Αλλαγή Λαδιών & Φίλτρου', imageUrl: 'https://picsum.photos/seed/default_oil/200/150', price: '49.99€', description: 'Premium αλλαγή συνθετικού λαδιού.' },
];


export const addStoreToDB = async (storeData: Omit<StoreFormData, 'category'>): Promise<Store> => {
  const newStorePayload: Omit<Store, 'id' | 'category' | 'rating' | 'reviews' | 'pricingPlans' | 'features' | 'products'> & {
    category: StoreCategory;
    rating: number;
    reviews: Review[];
    pricingPlans: PricingPlan[];
    features: SerializedFeature[];
    products: Product[];
    tags: string[];
  } = {
    name: storeData.name,
    logoUrl: storeData.logoUrl,
    bannerUrl: storeData.bannerUrl,
    description: storeData.description,
    longDescription: storeData.longDescription,
    contactEmail: storeData.contactEmail,
    websiteUrl: storeData.websiteUrl,
    address: storeData.address,
    category: StoreCategories[0], // Default category
    rating: 0,
    reviews: [],
    pricingPlans: [],
    features: defaultSerializedFeatures, // Use serialized default features
    products: defaultProducts, // Use default products
    tags: storeData.tagsInput ? storeData.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
  };

  try {
    const docRef = await addDoc(collection(db, STORE_COLLECTION), newStorePayload);
    return { ...newStorePayload, id: docRef.id };
  } catch (error) {
    console.error("Error adding store to DB:", error);
    throw error;
  }
};

export const updateStoreInDB = async (storeId: string, updatedData: Partial<Omit<StoreFormData, 'category'>>): Promise<Store | undefined> => {
  const storeRef = doc(db, STORE_COLLECTION, storeId);
  
  // Create an update payload, ensuring tagsInput is converted to tags array
  const updatePayload: Partial<Omit<Store, 'id' | 'category'>> = { ...updatedData };
  if (updatedData.tagsInput !== undefined) {
    updatePayload.tags = updatedData.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    delete (updatePayload as any).tagsInput; // Remove tagsInput from payload
  }


  try {
    await updateDoc(storeRef, updatePayload);
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

// Function to seed initial data (optional, call once if needed)
// import { mockStores as initialMockStores } from './placeholder-data'; // Adjust path if needed
// export const seedInitialStores = async () => {
//   const storesInDb = await getAllStoresFromDB();
//   if (storesInDb.length > 0) {
//     console.log("Firestore already has stores. Seeding skipped.");
//     return;
//   }

//   console.log("Seeding initial stores to Firestore...");
//   for (const store of initialMockStores) {
//     const { id, ...storeDataForDb } = store; // exclude mock ID

//     const storePayloadForDb = {
//         ...storeDataForDb,
//         features: serializeFeaturesForDB(storeDataForDb.features), // Serialize icons
//         reviews: storeDataForDb.reviews.map(r => ({...r, date: Timestamp.fromDate(new Date(r.date))})) // Convert date strings to Timestamps
//     };

//     try {
//       await addDoc(collection(db, STORE_COLLECTION), storePayloadForDb);
//     } catch (error) {
//       console.error("Error seeding store:", store.name, error);
//     }
//   }
//   console.log("Initial stores seeded.");
// };
// Call seedInitialStores() from a suitable place, e.g., a temporary admin page or script.
