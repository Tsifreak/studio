
import type { Store, UserProfile, Product, Review, PricingPlan, Feature } from './types';
import { CheckCircle2, ShoppingBag, Zap, Award, Users, BarChart3, ShieldCheck, MessageSquare } from 'lucide-react';

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

const commonFeatures: Feature[] = [
  { id: 'f1', name: '24/7 Support', icon: MessageSquare },
  { id: 'f2', name: 'Money Back Guarantee', icon: ShieldCheck },
  { id: 'f3', name: 'Premium Quality', icon: Award },
];

const commonReviews: Review[] = [
  { id: 'r1', userName: 'Bob The Builder', rating: 5, comment: 'Amazing service and products!', date: new Date(2023, 10, 15).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/bob/40/40' },
  { id: 'r2', userName: 'Charlie Chaplin', rating: 4, comment: 'Good value for money, very satisfied.', date: new Date(2023, 11, 1).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/charlie/40/40' },
];

const sampleProducts: Product[] = [
  { id: 'p1', name: 'Eco-friendly Water Bottle', imageUrl: 'https://picsum.photos/seed/product1/200/150', price: '$19.99', description: 'Stay hydrated with our reusable eco-friendly bottle.' },
  { id: 'p2', name: 'Handmade Leather Wallet', imageUrl: 'https://picsum.photos/seed/product2/200/150', price: '$49.50', description: 'Crafted with genuine leather, built to last.' },
  { id: 'p3', name: 'Organic Cotton T-Shirt', imageUrl: 'https://picsum.photos/seed/product3/200/150', price: '$25.00', description: 'Comfortable and sustainable, perfect for everyday wear.' },
];

const samplePricingPlans: PricingPlan[] = [
  { id: 'plan1', name: 'Basic', price: '$9/month', features: ['Feature A', 'Feature B', '10GB Storage'], isFeatured: false },
  { id: 'plan2', name: 'Pro', price: '$29/month', features: ['Feature A, B, C', '50GB Storage', 'Priority Support'], isFeatured: true },
  { id: 'plan3', name: 'Enterprise', price: '$99/month', features: ['All Features', 'Unlimited Storage', 'Dedicated Manager'], isFeatured: false },
];


export const mockStores: Store[] = [
  {
    id: 'store1',
    name: 'GreenLeaf Organics',
    logoUrl: 'https://picsum.photos/seed/greenleaf/100/100',
    bannerUrl: 'https://picsum.photos/seed/greenleaf_banner/800/300',
    description: 'Fresh, organic produce and eco-friendly products delivered to your door.',
    longDescription: 'At GreenLeaf Organics, we believe in sustainability and health. We source the finest organic ingredients and eco-conscious products to help you live a healthier, greener life. Explore our wide range of items, from farm-fresh vegetables to natural home essentials.',
    rating: 4.8,
    category: 'Groceries',
    tags: ['organic', 'eco-friendly', 'healthy'],
    pricingPlans: samplePricingPlans,
    features: [
      ...commonFeatures,
      { id: 'f4', name: 'Farm-to-Table Freshness', icon: Zap }
    ],
    reviews: [
      ...commonReviews,
      { id: 'r3', userName: 'Diana Prince', rating: 5, comment: 'The best organic store I have found!', date: new Date(2023, 9, 5).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/diana/40/40' },
    ],
    products: sampleProducts.slice(0,2),
    contactEmail: 'contact@greenleaf.com',
    websiteUrl: 'https://greenleaf.example.com',
    address: '123 Organic Way, Natureville'
  },
  {
    id: 'store2',
    name: 'TechGadget Hub',
    logoUrl: 'https://picsum.photos/seed/techgadget/100/100',
    bannerUrl: 'https://picsum.photos/seed/techgadget_banner/800/300',
    description: 'The latest and greatest in technology and electronics.',
    longDescription: 'TechGadget Hub is your one-stop shop for cutting-edge technology. We offer a vast selection of gadgets, electronics, and accessories from leading brands. Our team is passionate about tech and ready to help you find the perfect device.',
    rating: 4.5,
    category: 'Electronics',
    tags: ['gadgets', 'tech', 'electronics'],
    pricingPlans: [
      { id: 'planA', name: 'Gadgeteer', price: '$15/month membership', features: ['Exclusive Deals', 'Early Access', 'Tech Support'], isFeatured: true },
      { id: 'planB', name: 'Innovator', price: '$45/month membership', features: ['All Gadgeteer perks', 'Project Kits', 'Prototyping Tools'] },
    ],
    features: [
      ...commonFeatures,
      { id: 'f5', name: 'Expert Tech Support', icon: Users }
    ],
    reviews: [
      ...commonReviews,
      { id: 'r4', userName: 'Clark Kent', rating: 4, comment: 'Great selection of gadgets!', date: new Date(2023, 8, 20).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/clark/40/40' },
    ],
    products: [
      { id: 'p4', name: 'Smart Noise-Cancelling Headphones', imageUrl: 'https://picsum.photos/seed/product4/200/150', price: '$199.00', description: 'Immersive sound experience with advanced noise cancellation.' },
      { id: 'p5', name: 'Portable Power Bank 20000mAh', imageUrl: 'https://picsum.photos/seed/product5/200/150', price: '$39.99', description: 'High-capacity power bank to keep your devices charged on the go.' },
    ],
    contactEmail: 'support@techgadget.com',
    websiteUrl: 'https://techgadget.example.com'
  },
  {
    id: 'store3',
    name: 'Artisan Corner',
    logoUrl: 'https://picsum.photos/seed/artisan/100/100',
    description: 'Handcrafted goods from local artisans and creators.',
    longDescription: 'Discover unique, handcrafted items at Artisan Corner. We showcase the work of talented local artists and crafters, offering a diverse collection of handmade jewelry, pottery, textiles, and more. Support local talent and find one-of-a-kind treasures.',
    rating: 4.9,
    category: 'Handmade',
    tags: ['artisan', 'handmade', 'local'],
    pricingPlans: [], // May not have subscription plans
    features: [
      { id: 'f6', name: 'Unique Handmade Items', icon: ShoppingBag },
      { id: 'f7', name: 'Supports Local Artists', icon: Users },
    ],
    reviews: [
      { id: 'r5', userName: 'Bruce Wayne', rating: 5, comment: 'Exquisite craftsmanship. Highly recommend.', date: new Date(2024, 0, 10).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/bruce/40/40' },
    ],
    products: [
      { id: 'p6', name: 'Hand-painted Silk Scarf', imageUrl: 'https://picsum.photos/seed/product6/200/150', price: '$75.00', description: 'A beautiful silk scarf, individually hand-painted by a local artist.' },
      { id: 'p7', name: 'Ceramic Coffee Mug Set', imageUrl: 'https://picsum.photos/seed/product7/200/150', price: '$40.00', description: 'Set of two unique, handmade ceramic mugs.' },
    ],
    contactEmail: 'hello@artisancorner.com',
    websiteUrl: 'https://artisancorner.example.com'
  },
  {
    id: 'store4',
    name: 'FitLife Pro',
    logoUrl: 'https://picsum.photos/seed/fitlife/100/100',
    bannerUrl: 'https://picsum.photos/seed/fitlife_banner/800/300',
    description: 'Premium fitness equipment and apparel for your active lifestyle.',
    longDescription: 'FitLife Pro provides top-quality fitness gear to help you achieve your health goals. From high-performance workout clothes to durable exercise equipment, we have everything you need for an effective and enjoyable fitness journey.',
    rating: 4.2,
    category: 'Fitness',
    tags: ['fitness', 'sports', 'health'],
    pricingPlans: [
       { id: 'planC', name: 'Monthly Pass', price: '$50/month', features: ['Unlimited Classes', 'Gym Access', 'Personal Training Discount'], isFeatured: true },
       { id: 'planD', name: 'Annual Pass', price: '$500/year', features: ['All Monthly perks', '2 Free Personal Training Sessions', 'Nutrition Plan'] },
    ],
    features: [
      ...commonFeatures,
      { id: 'f8', name: 'Performance Gear', icon: BarChart3 }
    ],
    reviews: [
        ...commonReviews.slice(0,1),
        { id: 'r6', userName: 'Peter Parker', rating: 4, comment: 'Good equipment, helped my training.', date: new Date(2023, 7, 12).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/peter/40/40' }
    ],
    products: [
      { id: 'p8', name: 'Adjustable Dumbbell Set', imageUrl: 'https://picsum.photos/seed/product8/200/150', price: '$250.00', description: 'Space-saving adjustable dumbbells, perfect for home gyms.' },
      { id: 'p9', name: 'Yoga Mat Premium', imageUrl: 'https://picsum.photos/seed/product9/200/150', price: '$30.00', description: 'Non-slip, eco-friendly yoga mat for all types of practice.' },
    ],
    contactEmail: 'care@fitlifepro.com',
    websiteUrl: 'https://fitlifepro.example.com',
    address: '456 Fitness Ave, Gymtown'
  },
];

export const getStoreById = (id: string): Store | undefined => {
  return mockStores.find(store => store.id === id);
};

export const getAllStores = (): Store[] => {
  return mockStores;
};
