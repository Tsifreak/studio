
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

const STORE_COLLECTION = 'StoreInfo'; 

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
      // Attempt to get name from component, fallback if needed
      iconName = (originalIcon as any).displayName || (originalIcon as any).name || 'UnknownIcon';
    }
    return {
      id: feature.id,
      name: feature.name,
      description: feature.description,
      icon: iconName, // This will be string or undefined
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
    category: data.category || StoreCategories[0], // Default category if not set
    tags: data.tags || [],
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

const defaultFeatures: Feature[] = [
  { id: 'f1_default', name: 'Πιστοποιημένοι Τεχνικοί', icon: "Award" },
  { id: 'f2_default', name: 'Εγγύηση σε Ανταλλακτικά & Εργασία', icon: "ShieldCheck" },
  { id: 'f3_default', name: 'Χώρος Αναμονής Πελατών & WiFi', icon: "Users" },
];
const defaultSerializedFeatures = serializeFeaturesForDB(defaultFeatures);

const defaultProducts: Product[] = [
    { id: 'prod1_default', name: 'Αλλαγή Λαδιών & Φίλτρου', imageUrl: 'https://picsum.photos/seed/default_oil_service/200/150', price: '49.99€', description: 'Premium αλλαγή συνθετικού λαδιού και φίλτρου.' },
    { id: 'prod2_default', name: 'Διαγνωστικός Έλεγχος', imageUrl: 'https://picsum.photos/seed/default_diag_service/200/150', price: '29.99€', description: 'Πλήρης διαγνωστικός έλεγχος με σύγχρονο εξοπλισμό.' },
];

const defaultPricingPlans: PricingPlan[] = [
    { id: 'plan1_default', name: 'Βασικό Πακέτο Συντήρησης', price: '79€', features: ['Αλλαγή Λαδιών & Φίλτρου', 'Έλεγχος 20 Σημείων', 'Περιστροφή Ελαστικών'], isFeatured: false },
    { id: 'plan2_default', name: 'Premium Πακέτο Συντήρησης', price: '129€', features: ['Όλα από το Βασικό Πακέτο', 'Καθαρισμός Κινητήρα', 'Έλεγχος Φρένων & Αντικατάσταση (εάν χρειάζεται με επιπλέον χρέωση υλικών)'], isFeatured: true },
];


// addStoreToDB now takes StoreFormData as its main data argument
export const addStoreToDB = async (storeData: StoreFormData): Promise<Store> => {
  // Construct the full Store object for Firestore, including defaults
  const newStoreForFirestore: Omit<Store, 'id'> = {
    name: storeData.name,
    logoUrl: storeData.logoUrl,
    bannerUrl: storeData.bannerUrl || '', // Ensure empty string if undefined
    description: storeData.description,
    longDescription: storeData.longDescription || '',
    contactEmail: storeData.contactEmail || '',
    websiteUrl: storeData.websiteUrl || '',
    address: storeData.address || '',
    category: StoreCategories[0], // Default category for a new store
    rating: 0, 
    reviews: [], 
    pricingPlans: defaultPricingPlans, 
    features: defaultSerializedFeatures, 
    products: defaultProducts, 
    tags: storeData.tagsInput ? storeData.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
  };

  try {
    const docRef = await addDoc(collection(db, STORE_COLLECTION), newStoreForFirestore);
    return { ...newStoreForFirestore, id: docRef.id };
  } catch (error) {
    console.error("Error adding store to DB:", error);
    throw error;
  }
};

// updateStoreInDB now takes Partial<StoreFormData>
export const updateStoreInDB = async (storeId: string, updatedData: Partial<StoreFormData>): Promise<Store | undefined> => {
  const storeRef = doc(db, STORE_COLLECTION, storeId);
  
  // Create an update payload for Firestore
  // This explicitly maps fields from StoreFormData to what Firestore expects in the Store document
  const firestoreUpdatePayload: { [key: string]: any } = {};

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
  
  if (Object.keys(firestoreUpdatePayload).length === 0) {
    // No actual data to update, just fetch and return existing store
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

// Example of how to seed data (call once manually if needed via an admin utility or script)
// async function seedDatabase() {
//   const stores = await getAllStoresFromDB();
//   if (stores.length === 0) { // Only seed if DB is empty
//     const sampleStoreData: StoreFormData = {
//       name: "Παράδειγμα Κέντρου Επισκευής",
//       logoUrl: "https://picsum.photos/seed/sample_logo/100/100",
//       bannerUrl: "https://picsum.photos/seed/sample_banner/800/300",
//       description: "Ένα πλήρως εξοπλισμένο κέντρο επισκευής για όλες τις ανάγκες του αυτοκινήτου σας.",
//       longDescription: "Προσφέρουμε μια ευρεία γκάμα υπηρεσιών, από απλές αλλαγές λαδιών μέχρι σύνθετες επισκευές κινητήρα. Η ομάδα μας αποτελείται από έμπειρους και πιστοποιημένους τεχνικούς.",
//       tagsInput: "επισκευές,συντήρηση,λάδια,φρένα",
//       contactEmail: "contact@samplegarage.com",
//       websiteUrl: "https://www.samplegarage.com",
//       address: "Οδός Παραδείγματος 1, 12345 Αθήνα"
//     };
//     try {
//       await addStoreToDB(sampleStoreData);
//       console.log("Sample store seeded successfully.");
//     } catch (error) {
//       console.error("Error seeding sample store:", error);
//     }
//   } else {
//     console.log("Database already contains stores. Seeding skipped.");
//   }
// }
// seedDatabase(); // Don't call this automatically in production code
