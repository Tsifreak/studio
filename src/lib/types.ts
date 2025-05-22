
import type { Timestamp } from 'firebase/firestore';

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
    translatedName: "Μηχανικός",
    description: "Επισκευή κινητήρα, ανάρτηση, service.",
    icon: "MechanicIcon" 
  },
  {
    slug: "electrician",
    translatedName: "Ηλεκτρολόγος",
    description: "Μπαταρίες, καλωδιώσεις, φώτα, αισθητήρες.",
    icon: "ElectricianIcon"
  },
  {
    slug: "panel-beater",
    translatedName: "Φανοποιοί",
    description: "Διορθώσεις αμαξώματος, τρακαρίσματα.",
    icon: "PanelBeaterIcon"
  },
  {
    slug: "diagnostics",
    translatedName: "Διαγνωστικό",
    description: "Έλεγχος σφαλμάτων με διαγνωστικό.",
    icon: "MyCustomIcon" 
  },
  {
    slug: "vulcanizer",
    translatedName: "Βουλκανιζατέρ",
    description: "Ελαστικά, ζυγοστάθμιση, ευθυγράμμιση.",
    icon: "TireIcon"
  },
  {
    slug: "detailer",
    translatedName: "Detailer",
    description: "Καθαρισμός, γυάλισμα, προστασία χρώματος.",
    icon: "DetailerIcon"
  },
  {
    slug: "tuning",
    translatedName: "Tuning",
    description: "Βελτιώσεις ECU, εξάτμιση, απόδοση.",
    icon: "TuningIcon"
  }
];

export const StoreCategories = AppCategories.map(cat => cat.slug) as readonly string[];
export const TranslatedStoreCategories = AppCategories.map(cat => cat.translatedName) as readonly string[];


export type StoreCategory = typeof StoreCategories[number];

// New types for Booking System
export interface Service {
  id: string; // Unique ID for the service
  name: string;
  description: string;
  durationMinutes: number;
  price: number; // Store as number, display with currency
  availableDaysOfWeek: number[]; // 0 (Sunday) to 6 (Saturday)
}

export interface AvailabilitySlot {
  dayOfWeek: number; // 0 (Sunday) to 6 (Saturday)
  startTime: string; // HH:mm format, e.g., "09:00"
  endTime: string;   // HH:mm format, e.g., "17:00"
  lunchBreakStartTime?: string; // Optional HH:mm
  lunchBreakEndTime?: string;   // Optional HH:mm
}

export interface Booking {
  id: string;
  storeId: string;
  storeName: string; 
  userId: string;
  userName: string; 
  userEmail: string; 
  serviceId: string;
  serviceName: string; 
  serviceDurationMinutes: number; 
  servicePrice: number; 
  bookingDate: string; // YYYY-MM-DD format
  bookingTime: string; // HH:mm format
  status: 'pending' | 'confirmed' | 'cancelled_by_user' | 'cancelled_by_store' | 'completed' | 'no_show';
  createdAt: string; // ISO string
  notes?: string; 
  ownerId?: string; 
}

// Firestore document data for Booking (includes Firestore Timestamps for date fields)
export interface BookingDocumentData {
  id: string;
  storeId: string;
  storeName: string;
  userId: string;
  userName: string;
  userEmail: string;
  serviceId: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePrice: number;
  bookingDate: Timestamp | admin.firestore.Timestamp; 
  bookingTime: string;
  status: 'pending' | 'confirmed' | 'cancelled_by_user' | 'cancelled_by_store' | 'completed' | 'no_show';
  createdAt: Timestamp | admin.firestore.Timestamp;
  notes?: string;
  ownerId?: string; 
}


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
  ownerId?: string | null; 
  services: Service[]; 
  availability: AvailabilitySlot[]; 
}

export interface SerializedFeature extends Omit<Feature, 'icon'> {
  icon?: string; 
}

export interface SerializedStore extends Omit<Store, 'features' | 'reviews' | 'services' | 'availability'> {
  features: SerializedFeature[];
  reviews: Review[]; 
  services: Service[]; 
  availability: AvailabilitySlot[]; 
}

export interface UserPreferences {
  darkMode?: boolean;
  notifications?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  totalUnreadMessages: number;
  pendingBookingsCount: number; 
  bookingStatusUpdatesCount: number;
  preferences?: UserPreferences;
}

export interface UserProfileFirestoreData {
  name?: string; 
  email?: string; 
  avatarUrl?: string;
  preferences?: UserPreferences;
  totalUnreadMessages?: number;
  pendingBookingsCount?: number; 
  bookingStatusUpdatesCount?: number;
  lastSeen?: Timestamp | admin.firestore.FieldValue; 
  createdAt?: Timestamp | admin.firestore.FieldValue;
}


export interface QueryFormData {
  name: string; 
  email: string; 
  subject: string;
  message: string;
  storeId: string;
  userId?: string; 
  userName?: string; 
  userAvatarUrl?: string; 
}

// This FormData type is for the client-side StoreForm and what it sends.
// The server-side action will then process file uploads from this data.
export interface StoreFormData {
  name: string;
  // logoUrl and bannerUrl are now primarily handled by server after upload
  logoUrl?: string; // Can hold existing URL for display or be undefined if new file
  bannerUrl?: string; // Can hold existing URL for display or be undefined if new file
  description: string;
  longDescription?: string;
  tagsInput?: string; 
  contactEmail?: string;
  websiteUrl?: string;
  address?: string;
  ownerId?: string; 
  servicesJson?: string; 
  availabilityJson?: string;
  // These fields will be present in FormData if files are selected
  logoFile?: File | null;
  bannerFile?: File | null;
  existingLogoUrl?: string | null; // To track current URL during edit
  existingBannerUrl?: string | null; // To track current URL during edit
}

export interface ReviewFormData {
  rating: number;
  comment: string;
}

export interface Chat {
  id: string;
  storeId: string;
  storeName: string;
  storeLogoUrl?: string;
  userId: string;          
  userName: string;        
  userAvatarUrl?: string;
  ownerId: string;         
  lastMessageAt: string;   
  lastMessageText: string;
  lastMessageSenderId?: string; 
  lastImageUrl?: string; 
  userUnreadCount: number;
  ownerUnreadCount: number;
  participantIds: string[]; 
  createdAt: string; 
}

export interface ChatMessage {
  id: string;
  senderId: string;    
  senderName: string;
  text: string;
  imageUrl?: string; 
  createdAt: string;   
}

export interface ChatMessageFormData {
  text: string;
  imageFile?: File | null; 
}

export type BookingStatus = Booking['status'];

// Add admin import for Firestore Timestamp if not already present
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
    }
  }
  // This is to allow File type to be recognized from 'buffer' if needed on server
  // For FormData handling, native File type in newer Node is preferred.
  // interface File extends Blob {} 
}
