
export interface Review {
  id: string;
  userId: string; 
  userName: string;
  userAvatarUrl?: string;
  rating: number; // 1-5
  comment: string;
  date: string; // ISO date string
}

export interface Product { 
  id: string;
  name: string;
  imageUrl: string;
  price: string; 
  description: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string; 
  features: string[];
  isFeatured?: boolean;
}

export interface Feature {
  id: string;
  name: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }> | string;
}

export interface AppCategoryInfo {
  slug: string; 
  translatedName: string; 
  description: string; 
  icon?: string; 
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
    icon: "Car" 
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
    icon: "Disc" 
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
    icon: "Gauge" 
  }
];

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
  rating: number; 
  category: StoreCategory;
  tags?: string[];
  pricingPlans: PricingPlan[];
  features: Feature[];
  reviews: Review[];
  products: Product[];
  contactEmail?: string;
  websiteUrl?: string;
  address?: string;
  ownerId?: string; 
}

export interface SerializedFeature extends Omit<Feature, 'icon'> {
  icon?: string; 
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
  // role: 'user' | 'admin' | 'store_owner'; // Future enhancement
  // ownedStoreId?: string; // Future enhancement for direct linking
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
  userId?: string; 
  userName?: string; // Added userName for chat
  userAvatarUrl?: string; // Added userAvatarUrl for chat
}

export interface StoreFormData {
  name: string;
  logoUrl: string;
  bannerUrl?: string;
  description: string;
  longDescription?: string;
  tagsInput?: string; 
  contactEmail?: string;
  websiteUrl?: string;
  address?: string;
  ownerId?: string; 
}

export interface ReviewFormData {
  rating: number;
  comment: string;
}

// Chat related types
export interface Chat {
  id: string;
  storeId: string;
  storeName: string;
  storeLogoUrl?: string;
  userId: string;          // Customer's Firebase UID
  userName: string;        // Customer's name
  userAvatarUrl?: string;
  ownerId: string;         // Store Owner's Firebase UID
  lastMessageAt: string;   // ISO string for client, Timestamp for Firestore
  lastMessageText: string;
  userUnreadCount: number;
  ownerUnreadCount: number;
  // Participant UIDs for easier querying if needed, e.g., [userId, ownerId] sorted
  participantIds: string[]; 
}

export interface ChatMessage {
  id: string;
  // chatId: string; // Not needed if messages are a subcollection of a chat
  senderId: string;    // userId or ownerId
  senderName: string;
  text: string;
  createdAt: string;   // ISO string for client, Timestamp for Firestore
}
