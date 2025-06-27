import type * as admin from 'firebase-admin';
import type { Timestamp } from 'firebase/firestore';
import type { FieldValue } from 'firebase-admin/firestore';

// --- NEW TYPES FOR DYNAMIC FORMS ---

// Defines a single field within a form
export interface DynamicFormField {
  id: string;      // Unique ID for the field (e.g., 'carMake', 'carModel')
  label: string;   // Display label in Greek (e.g., 'Μάρκα Αυτοκινήτου')
  type: 'text' | 'number' | 'textarea' | 'date'; // Input type
  required: boolean; // Is this field mandatory?
  placeholder?: string; // Placeholder text
}

// Defines a complete form template that can be sent
export interface DynamicFormDefinition {
  id: string;        // Unique ID for the form type (e.g., 'car_details_form')
  name: string;      // Name of the form (e.g., 'Φόρμα Στοιχείων Οχήματος')
  description?: string; // Optional description
  fields: DynamicFormField[]; // Array of fields in this form
}

// Content for a message that requests a form to be filled
export interface FormRequestMessageContent {
  formId: string;        // The ID of the form definition being requested (e.g., 'car_details_form')
  formName: string;      // Name of the form (e.g., 'Φόρμα Στοιχείων Οχήματος')
  formDescription?: string; // Optional description
  formFields: DynamicFormField[]; // Embed the actual fields for rendering
  instanceId: string;    // Unique ID for this specific form request within the chat
  status: 'sent' | 'filled' | 'cancelled'; // Status of this form request
}

// Content for a message that contains the filled form data
export interface FormResponseMessageContent {
  formId: string;       // ID of the form definition that was filled
  instanceId: string;   // The instanceId of the original form request message this responds to
  formName: string;     // Name of the form (e.g., 'Φόρμα Στοιχείων Οχήματος')
  filledData: { [key: string]: string | number | undefined }; // Key-value pairs of fieldId: value. Values can be undefined if optional and not filled.
}

// --- IMPORTANT: Define your pre-defined form(s) ---
export const CAR_DETAILS_FORM_DEFINITION: DynamicFormDefinition = {
  id: 'car_details_form',
  name: 'Στοιχεία Οχήματος',
  description: 'Παρακαλώ συμπληρώστε τα στοιχεία του οχήματός σας για καλύτερη εξυπηρέτηση.',
  fields: [
    { id: 'carMake', label: 'Μάρκα Αυτοκινήτου', type: 'text', required: true, placeholder: 'π.χ. Toyota' },
    { id: 'carModel', label: 'Μοντέλο', type: 'text', required: true, placeholder: 'π.χ. Corolla' },
    { id: 'carYear', label: 'Χρονολογία', type: 'number', required: true, placeholder: 'π.χ. 2015' },
    { id: 'carColor', label: 'Χρώμα', type: 'text', required: false, placeholder: 'π.χ. Μαύρο' },
    { id: 'comments', label: 'Κάποιο σχόλιο', type: 'textarea', required: false, placeholder: 'π.χ. Το πρόβλημα είναι...' },
  ],
};

export const AvailableDynamicForms: DynamicFormDefinition[] = [
  CAR_DETAILS_FORM_DEFINITION,
  // Add other form definitions here as needed
];

// --- CRITICAL FIX: ChatMessage 'createdAt' is now flexible for Firestore write operations ---
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text?: string; // Make text optional as message might be a form request/response
  imageUrl?: string;
  // This now correctly allows Timestamp or FieldValue for writing, and string for reading (after mapping)
  createdAt: string | Timestamp | admin.firestore.Timestamp | FieldValue;

  type: 'text' | 'form_request' | 'form_response' | 'image'; // Added 'image' type for clarity
  formRequestContent?: FormRequestMessageContent;
  formResponseContent?: FormResponseMessageContent;
}


// --- CRITICAL FIX: Chat 'lastMessageAt' and 'createdAt' are now flexible for Firestore write operations ---
export interface Chat {
  id: string;
  storeId: string;
  storeName: string;
  storeLogoUrl?: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  ownerId: string;
  // This now correctly allows Timestamp or FieldValue for writing, and string for reading (after mapping)
  lastMessageAt: string | Timestamp | admin.firestore.Timestamp | FieldValue;
  lastMessageText: string;
  lastMessageSenderId?: string;
  lastImageUrl?: string;
  userUnreadCount: number;
  ownerUnreadCount: number;
  participantIds: string[];
  // This now correctly allows Timestamp or FieldValue for writing, and string for reading (after mapping)
  createdAt: string | Timestamp | admin.firestore.Timestamp | FieldValue;
}


// --- EXISTING TYPES (ensure they are present below the new ones) ---
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

export const StandardServiceCategories = [
  { id: 'oil_change', name: 'Αλλαγή Λαδιών' },
  { id: 'tire_rotation', name: 'Επισκευή/Αλλαγή Ελαστικών' },
  { id: 'car_wash_exterior', name: 'Πλύσιμο Εξωτερικό' },
  { id: 'biological_cleaning', name: 'Βιολογικός Καθαρισμός' },
  { id: 'brake_check', name: 'Έλεγχος/Αλλαγή Φρένων' },
  { id: 'full_service', name: 'Πλήρες Service' },
  { id: 'diagnostics', name: 'Διαγνωστικός Έλεγχος' },
  { id: 'air_conditioning', name: 'Service A/C' },
  { id: 'battery_check', name: 'Έλεγχος/Αλλαγή Μπαταρίας' },
  { id: 'wheel_alignment', name: 'Ευθυγράμμιση' },
  { id: 'paint_repair', name: 'Επισκευή Βαφής' },
  { id: 'dent_repair', name: 'Επισκευή Βαθουλωμάτων' },
  { id: 'suspension_check', name: 'Έλεγχος Ανάρτησης' },
  { id: 'exhaust_system', name: 'Έλεγχος/Αλλαγή Εξάτμισης' },
  { id: 'fluid_check', name: 'Έλεγχος Υγρών' },
  // Add other common service categories here with a unique 'id' and a descriptive 'name'
];

export const StoreCategoriesSlugs = AppCategories.map(cat => cat.slug) as readonly string[];
export const TranslatedStoreCategories = AppCategories.map(cat => cat.translatedName) as readonly string[];


export type StoreCategory = typeof StoreCategoriesSlugs[number];

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  availableDaysOfWeek: number[];
  categoryId: string;
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  lunchBreakStartTime?: string;
  lunchBreakEndTime?: string;
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
  bookingDate: string;
  bookingTime: string;
  status: 'pending' | 'confirmed' | 'cancelled_by_user' | 'cancelled_by_store' | 'completed' | 'no_show';
  createdAt: string;
  notes?: string;
  ownerId?: string;
}

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
  status: 'pending' | 'confirmed' | 'cancelled_by_user' | 'cancelled_by_store' | 'completed' | 'no_show';
  createdAt: Timestamp | admin.firestore.Timestamp;
  notes?: string;
  ownerId?: string;
  bookingTime: string;
}


export interface Store {
  id: string;
  name:string;
  logoUrl: string;
  bannerUrl?: string;
  description: string;
  longDescription?: string;
  rating: number;
  categories: StoreCategory[];
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
  location: {
    latitude: number;
    longitude: number;

  };
  distance?: number;
  specializedBrands?: string[];
  tyreBrands?: string[];
  iconType?: 'verified' | 'premium' | FieldValue;
  savedByUsers?: string[];
}

export interface SerializedFeature extends Omit<Feature, 'icon'> {
  icon?: string;
}

export interface SerializedStore extends Omit<Store, 'features' | 'reviews' | 'services' | 'availability' | 'categories' | 'iconType' | 'savedByUsers'> {
  features: SerializedFeature[];
  reviews: Review[];
  services: Service[];
  availability: AvailabilitySlot[];
  specializedBrands?: string[];
  categories: StoreCategory[];
  distance?: number;
  iconType?: 'verified' | 'premium';
  savedByUsers?: string[];
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
  savedStores?: string[];
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
  savedStores?: string[];
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

export interface StoreFormData {
  longitude: string;
  latitude: string;
  name: string;
  logoUrl?: string;
  bannerUrl?: string;
  description: string;
  longDescription?: string;
  tagsInput?: string;
  categoriesInput?: string;
  contactEmail?: string;
  websiteUrl?: string;
  address?: string;
  ownerId?: string;
  servicesJson?: string;
  availabilityJson?: string;
  logoFile?: File | null;
  bannerFile?: File | null;
  existingLogoUrl?: string | null;
  specializedBrands?: string[];
  existingBannerUrl?: string | null;
  tyreBrands?: string[] | undefined;
  iconType?: 'verified' | 'premium' | '';
}

export interface ReviewFormData {
  rating: number;
  comment: string;
}

export interface ChatMessageFormData {
  text: string;
  imageFile?: File | null;
}

export type BookingStatus = Booking['status'];

export type SortByType = 'default' | 'rating_desc' | 'rating_asc' | 'name_asc' | 'name_desc' | 'distance_asc';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
      FIREBASE_STORAGE_BUCKET?: string;
      NEXT_PUBLIC_Maps_API_KEY?: string;
    }
  }
}