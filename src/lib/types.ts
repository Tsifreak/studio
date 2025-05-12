
export interface Review {
  id: string;
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
  // Icon can be a Lucide icon name or SVG string
  icon?: React.ComponentType<{ className?: string }> | string;
}

export interface Store {
  id: string;
  name:string;
  logoUrl: string;
  bannerUrl?: string;
  description: string;
  longDescription?: string;
  rating: number; // Average rating 0-5
  category?: string; // Optional: For filtering
  tags?: string[]; // Optional: For filtering/search
  pricingPlans: PricingPlan[];
  features: Feature[];
  reviews: Review[];
  products: Product[];
  contactEmail?: string; // For query form submissions (simulated)
  websiteUrl?: string;
  address?: string; // Optional physical address
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  preferences?: {
    darkMode?: boolean;
    notifications?: boolean;
  };
  // Add other profile fields as needed
}

export interface QueryFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  storeId: string;
}
