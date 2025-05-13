
export interface Review {
  id: string;
  userName: string;
  userAvatarUrl?: string;
  rating: number; // 1-5
  comment: string;
  date: string; // ISO date string
}

export interface Product { // Renamed from Service to Product for consistency with existing usage, but represents services
  id: string;
  name: string;
  imageUrl: string;
  price: string; // e.g., "$19.99" or "Contact us"
  description: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string; // e.g., "$29/month"
  features: string[];
  isFeatured?: boolean;
}

export interface Feature {
  id: string;
  name: string;
  description?: string;
  // Icon can be a Lucide icon component or its string name
  icon?: React.ComponentType<{ className?: string }> | string;
}

export const StoreCategories = [
  "Mechanic", "Technician", "Electrician", "Painter", "Inspector",
  "Estimator", "Detailer", "Tuner", "Welder", "Restorer",
  "Installer", "Fabricator", "Aligner", "Diagnostician", "Assembler"
] as const;

export const TranslatedStoreCategories = [
  "Μηχανικός", "Τεχνικός", "Ηλεκτρολόγος", "Βαφέας", "Επιθεωρητής",
  "Εκτιμητής", "Ειδικός Περιποίησης", "Βελτιωτής", "Συγκολλητής", "Αναπαλαιωτής",
  "Εγκαταστάτης", "Κατασκευαστής", "Ευθυγραμμιστής", "Διαγνώστης", "Συναρμολογητής"
] as const;

export type StoreCategory = typeof StoreCategories[number];

export interface Store {
  id: string;
  name:string;
  logoUrl: string;
  bannerUrl?: string;
  description: string;
  longDescription?: string;
  rating: number; // Average rating 0-5
  category: StoreCategory; 
  tags?: string[]; 
  pricingPlans: PricingPlan[];
  features: Feature[];
  reviews: Review[];
  products: Product[]; 
  contactEmail?: string; 
  websiteUrl?: string;
  address?: string; 
}

// For server-to-client prop passing, ensure complex objects like components are serialized
export interface SerializedFeature extends Omit<Feature, 'icon'> {
  icon?: string; // Icon is now always a string name or undefined
}

export interface SerializedStore extends Omit<Store, 'features'> {
  features: SerializedFeature[];
}


export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isAdmin?: boolean; 
  preferences?: {
    darkMode?: boolean;
    notifications?: boolean;
  };
}

export interface QueryFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  storeId: string;
}

// For Admin Store Form (main form, without category)
export type StoreFormData = Omit<Store, 'id' | 'rating' | 'reviews' | 'pricingPlans' | 'features' | 'products' | 'category'> & {
  longDescription?: string;
  bannerUrl?: string;
  contactEmail?: string;
  websiteUrl?: string;
  address?: string;
  tagsInput?: string; 
};