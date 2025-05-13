
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

// New structure for category information
export interface AppCategoryInfo {
  slug: string; // English slug for routing and internal use
  translatedName: string; // Greek name for display
  description: string; // Greek short description for homepage
  icon?: string; // Optional: Lucide icon name string
}

export const AppCategories: AppCategoryInfo[] = [
  {
    slug: "mechanic",
    translatedName: "🔧 Μηχανικός",
    description: "Επισκευή κινητήρα, ανάρτηση, service.",
    icon: "Wrench"
  },
  {
    slug: "electrician",
    translatedName: "🔌 Ηλεκτρολόγος",
    description: "Μπαταρίες, καλωδιώσεις, φώτα, αισθητήρες.",
    icon: "Zap"
  },
  {
    slug: "panel-beater",
    translatedName: "🛠️ Φανοποιοί",
    description: "Διορθώσεις αμαξώματος, τρακαρίσματα.",
    icon: "Car" // Using Car icon as a generic one, can be more specific
  },
  {
    slug: "diagnostics",
    translatedName: "🧪 Διαγνωστικό",
    description: "Έλεγχος σφαλμάτων με διαγνωστικό.",
    icon: "Search"
  },
  {
    slug: "vulcanizer",
    translatedName: "🛞 Βουλκανιζατέρ",
    description: "Ελαστικά, ζυγοστάθμιση, ευθυγράμμιση.",
    icon: "Disc" // Placeholder, could be more specific like 'CircleDot' or a custom SVG
  },
  {
    slug: "detailer",
    translatedName: "🧽 Detailer",
    description: "Καθαρισμός, γυάλισμα, προστασία χρώματος.",
    icon: "Sparkles"
  },
  {
    slug: "tuning",
    translatedName: "🚀 Tuning",
    description: "Βελτιώσεις ECU, εξάτμιση, απόδοση.",
    icon: "Gauge" // Placeholder, could be more specific
  }
];

// Derive StoreCategories and TranslatedStoreCategories from AppCategories
export const StoreCategories = AppCategories.map(cat => cat.slug) as readonly string[];
export const TranslatedStoreCategories = AppCategories.map(cat => cat.translatedName) as readonly string[];


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

// Represents the data structure submitted by the store creation/editing form.
// Category is handled separately by updateStoreCategoryAction or defaulted on creation.
export interface StoreFormData {
  name: string;
  logoUrl: string;
  bannerUrl?: string;
  description: string;
  longDescription?: string;
  tagsInput?: string; // Input for tags, converted to string[] in the action/service
  contactEmail?: string;
  websiteUrl?: string;
  address?: string;
}
