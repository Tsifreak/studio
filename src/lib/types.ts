
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
  storeName: string; // Denormalized for easier display
  userId: string;
  userName: string; // Denormalized
  userEmail: string; // Denormalized
  serviceId: string;
  serviceName: string; // Denormalized
  serviceDurationMinutes: number; // Denormalized
  servicePrice: number; // Denormalized
  bookingDate: string; // YYYY-MM-DD format
  bookingTime: string; // HH:mm format
  status: 'pending' | 'confirmed' | 'cancelled_by_user' | 'cancelled_by_store' | 'completed' | 'no_show';
  createdAt: string; // ISO string
  notes?: string; // Optional notes from user or store
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
  products: Product[]; // This could be renamed/repurposed to `services` or kept separate
  contactEmail?: string;
  websiteUrl?: string;
  address?: string;
  ownerId?: string; 
  // New fields for booking system
  services: Service[]; // List of services offered by the store
  availability: AvailabilitySlot[]; // Weekly availability of the store
}

export interface SerializedFeature extends Omit<Feature, 'icon'> {
  icon?: string; 
}

// SerializedStore to ensure dates and other complex objects are handled for client components
export interface SerializedStore extends Omit<Store, 'features' | 'reviews' | 'services' | 'availability'> {
  features: SerializedFeature[];
  reviews: Review[]; // Assuming Review dates are already ISO strings
  services: Service[]; // Services are generally simple data
  availability: AvailabilitySlot[]; // Availability slots are simple data
}


export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  totalUnreadMessages: number; 
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
  userName?: string; 
  userAvatarUrl?: string; 
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
  // For managing services and availability via JSON in StoreForm
  servicesJson?: string; 
  availabilityJson?: string;
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
