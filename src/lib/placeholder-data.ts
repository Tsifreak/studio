
import type { Store, UserProfile, Product, Review, PricingPlan, Feature, StoreCategory, StoreFormData, SerializedFeature } from './types';
import { StoreCategories, TranslatedStoreCategories } from './types';
// Import specific icons needed if commonFeatures still uses component types before serialization
// For now, commonFeatures will store icon names directly if they are meant to be defaults for DB.
// import { Award, ShieldCheck, Users, Search, Wrench, Paintbrush, Sparkles, Settings2, BarChart3, ClipboardCheck, Car, AlignCenter, PackageCheck } from 'lucide-react';
import { getAllStoresFromDB, getStoreByIdFromDB } from './storeService'; // Import DB service functions

export const mockUser: UserProfile = {
  id: 'user1',
  name: 'Alice Wonderland',
  email: 'alice@example.com',
  avatarUrl: 'https://picsum.photos/seed/alice/100/100',
  preferences: {
    darkMode: false,
    notifications: true,
  },
};

// commonFeatures now stores icon names as strings for direct use with DB/RenderFeatureIcon
const commonFeatures: Feature[] = [
  { id: 'f1', name: 'Πιστοποιημένοι Τεχνικοί', icon: 'Award' },
  { id: 'f2', name: 'Εγγύηση σε Ανταλλακτικά & Εργασία', icon: 'ShieldCheck' },
  { id: 'f3', name: 'Χώρος Αναμονής Πελατών & WiFi', icon: 'Users' },
];

// The mockStores array will now primarily serve as initial seed data example.
// The application will fetch live data from Firestore.
export const mockStoresExample: Store[] = [
  {
    id: 'store1_mock', // Mock IDs should be distinct from potential DB IDs
    name: 'ΤαχύFix Αυτοκινήτων (Mock)', 
    logoUrl: 'https://picsum.photos/seed/quickfix_logo/100/100',
    bannerUrl: 'https://picsum.photos/seed/quickfix_banner/800/300',
    description: 'Γενικές επισκευές αυτοκινήτων και υπηρεσίες συντήρησης. (Mock Data)', 
    longDescription: 'Αυτό είναι ένα παράδειγμα καταστήματος από mock δεδομένα...',
    rating: 4.7,
    category: StoreCategories[0], // Mechanic
    tags: ['επισκευή κινητήρα', 'φρένα', 'διαγνωστικά', 'αλλαγή λαδιών', 'Μηχανικός'],
    pricingPlans: [
        { id: 'plan1mock', name: 'Βασική Συντήρηση (Mock)', price: '79€/επίσκεψη', features: ['Αλλαγή Λαδιών', 'Περιστροφή Ελαστικών'], isFeatured: false },
    ],
    features: [
      ...commonFeatures,
      { id: 'f4_mock', name: 'Προηγμένες Διαγνώσεις (Mock)', icon: "Search" }
    ],
    reviews: [
      { id: 'r1mock', userName: 'Mock User 1', rating: 5, comment: 'Εξαιρετική εξυπηρέτηση (mock).', date: new Date(2023, 10, 15).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/mock_user1/40/40' },
    ],
    products: [
        { id: 's1mock', name: 'Αλλαγή Λαδιών & Φίλτρου (Mock)', imageUrl: 'https://picsum.photos/seed/oil_change_mock/200/150', price: '49.99€', description: 'Premium αλλαγή λαδιού (mock).' }
    ],
    contactEmail: 'service@quickfixmock.com',
    websiteUrl: 'https://quickfixmock.example.com',
    address: 'Οδός Mock 123, Mockville'
  },
  // Add more mock examples if needed for UI development without DB connection
];

// Functions to get data will now fetch from Firestore
export const getStoreById = async (id: string): Promise<Store | undefined> => {
  return await getStoreByIdFromDB(id);
};

export const getAllStores = async (): Promise<Store[]> => {
  return await getAllStoresFromDB(); 
};


// --- Mock Data Modification Functions (NO LONGER THE PRIMARY SOURCE OF TRUTH) ---
// These functions are effectively replaced by the Firestore service operations.
// They are kept here for reference or if you need to fall back to mock data temporarily.
// For Firestore, admin actions will call storeService.ts directly.

let internalMockStores: Store[] = [...mockStoresExample]; // Use a mutable copy for mock operations

export const addStoreToMockData = (newStoreData: Omit<StoreFormData, 'category'>): Store => {
  console.warn("Using addStoreToMockData. Data will not persist in Firestore.");
  const newId = `store_mock_${internalMockStores.length + 1}_${Date.now()}`;
  
  // Ensure features are correctly formatted (icons as strings)
  const featuresForMock: Feature[] = commonFeatures.map(f => ({...f, icon: typeof f.icon === 'string' ? f.icon : 'UnknownIcon'}));

  const newStore: Store = {
    ...newStoreData,
    id: newId,
    category: StoreCategories[0], 
    rating: 0,
    reviews: [],
    pricingPlans: [],
    features: featuresForMock, // Use formatted common features
    products: [{ id: 's_mock_default', name: 'Mock Service', imageUrl: 'https://picsum.photos/seed/mockservice/200/150', price: '€0', description: 'Default mock service.' }],
    tags: newStoreData.tagsInput ? newStoreData.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
  };
  internalMockStores.push(newStore);
  return newStore;
};

export const updateStoreInMockData = (storeId: string, updatedData: Partial<Omit<StoreFormData, 'category'>>): Store | undefined => {
  console.warn("Using updateStoreInMockData. Data will not persist in Firestore.");
  const storeIndex = internalMockStores.findIndex(s => s.id === storeId);
  if (storeIndex > -1) {
    const existingStore = internalMockStores[storeIndex];
    const newTags = updatedData.tagsInput ? updatedData.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : existingStore.tags;
    
    internalMockStores[storeIndex] = { 
      ...existingStore, 
      ...updatedData,
      tags: newTags,
    };
    return internalMockStores[storeIndex];
  }
  return undefined;
};

export const deleteStoreFromMockData = (storeId: string): boolean => {
  console.warn("Using deleteStoreFromMockData. Data will not persist in Firestore.");
  const initialLength = internalMockStores.length;
  internalMockStores = internalMockStores.filter(s => s.id !== storeId);
  return internalMockStores.length < initialLength;
};

export const updateStoreCategoryInMockData = (storeId: string, newCategory: StoreCategory): Store | undefined => {
  console.warn("Using updateStoreCategoryInMockData. Data will not persist in Firestore.");
  const storeIndex = internalMockStores.findIndex(s => s.id === storeId);
  if (storeIndex > -1) {
    internalMockStores[storeIndex].category = newCategory;
    return internalMockStores[storeIndex];
  }
  return undefined;
};
