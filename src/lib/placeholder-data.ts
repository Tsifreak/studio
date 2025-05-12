
import type { Store, UserProfile, Product, Review, PricingPlan, Feature, StoreCategory } from './types';
import { StoreCategories } from './types';
import { CheckCircle2, Zap, Award, Users, BarChart3, ShieldCheck, MessageSquare, Car, Paintbrush, Search, Wrench, Settings2, Sparkles, PackageCheck, Scale, ShieldAlert, Combine, AlignCenter, ClipboardCheck, Package } from 'lucide-react';

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
  { id: 'f1', name: 'Certified Technicians', icon: Award },
  { id: 'f2', name: 'Warranty on Parts & Labor', icon: ShieldCheck },
  { id: 'f3', name: 'Customer Lounge & WiFi', icon: Users },
];

const automotiveReviews: Review[] = [
  { id: 'r1', userName: 'Mike Wheeler', rating: 5, comment: 'Fast and reliable service! My car runs like new.', date: new Date(2023, 10, 15).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/mike_w/40/40' },
  { id: 'r2', userName: 'Eleven Hopper', rating: 4, comment: 'Good work, fair prices. Would recommend.', date: new Date(2023, 11, 1).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/eleven_h/40/40' },
];

const sampleServices: Product[] = [
  { id: 's1', name: 'Oil Change & Filter', imageUrl: 'https://picsum.photos/seed/oil_change/200/150', price: '$49.99', description: 'Premium synthetic oil change with filter replacement.' },
  { id: 's2', name: 'Brake Pad Replacement', imageUrl: 'https://picsum.photos/seed/brake_pads/200/150', price: '$129.99 (per axle)', description: 'High-quality brake pad replacement for optimal stopping power.' },
  { id: 's3', name: 'Full Car Detailing', imageUrl: 'https://picsum.photos/seed/car_detailing/200/150', price: '$199.00', description: 'Interior and exterior cleaning, wax, and polish.' },
];

const servicePricingPlans: PricingPlan[] = [
  { id: 'plan1', name: 'Basic Maintenance', price: '$79/visit', features: ['Oil Change', 'Tire Rotation', 'Fluid Top-up'], isFeatured: false },
  { id: 'plan2', name: 'Pro Care Package', price: '$199/year', features: ['2 Basic Maintenances', 'Annual Inspection', '10% Off Repairs'], isFeatured: true },
  { id: 'plan3', name: 'Fleet Management', price: 'Contact Us', features: ['Custom Service Schedule', 'Volume Discounts', 'Dedicated Account Rep'], isFeatured: false },
];


export const mockStores: Store[] = [
  {
    id: 'store1',
    name: 'QuickFix Auto Mechanics',
    logoUrl: 'https://picsum.photos/seed/quickfix_logo/100/100',
    bannerUrl: 'https://picsum.photos/seed/quickfix_banner/800/300',
    description: 'General auto repairs and maintenance services. Your trusted local mechanic.',
    longDescription: 'QuickFix Auto Mechanics offers a wide range of automotive repair and maintenance services. From routine oil changes to complex engine diagnostics, our certified mechanics are here to help. We pride ourselves on honest work and fair prices.',
    rating: 4.7,
    category: 'Mechanic',
    tags: ['engine repair', 'brakes', 'diagnostics', 'oil change', 'Mechanic'],
    pricingPlans: servicePricingPlans.slice(0,2),
    features: [
      ...commonFeatures,
      { id: 'f4', name: 'Advanced Diagnostics', icon: Search }
    ],
    reviews: [
      ...automotiveReviews,
      { id: 'r3', userName: 'Dustin Henderson', rating: 5, comment: 'They fixed my car super fast! Great service.', date: new Date(2023, 9, 5).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/dustin_h/40/40' },
    ],
    products: sampleServices.slice(0,2),
    contactEmail: 'service@quickfixauto.com',
    websiteUrl: 'https://quickfixauto.example.com',
    address: '123 Repair Rd, Autoville'
  },
  {
    id: 'store2',
    name: 'Sparky Auto Electricians',
    logoUrl: 'https://picsum.photos/seed/sparky_logo/100/100',
    bannerUrl: 'https://picsum.photos/seed/sparky_banner/800/300',
    description: 'Specializing in automotive electrical systems, wiring, and electronics.',
    longDescription: 'Sparky Auto Electricians are experts in diagnosing and repairing all automotive electrical issues. From battery problems to complex wiring harnesses and sensor malfunctions, we have the tools and expertise to get your car\'s electronics working perfectly.',
    rating: 4.9,
    category: 'Electrician',
    tags: ['electrical repair', 'battery', 'alternator', 'wiring', 'sensors', 'Electrician'],
    pricingPlans: [
      { id: 'planA', name: 'Diagnostic Check', price: '$89.00', features: ['Full Electrical System Scan', 'Issue Report', 'Repair Estimate'], isFeatured: true },
      { id: 'planB', name: 'Wiring Repair', price: 'Starting at $150', features: ['Identify & Fix Faulty Wiring', 'Component Testing', 'High-Quality Materials'] },
    ],
    features: [
      ...commonFeatures,
      { id: 'f5', name: 'Latest Diagnostic Tools', icon: Wrench }
    ],
    reviews: [
      ...automotiveReviews,
      { id: 'r4', userName: 'Lucas Sinclair', rating: 5, comment: 'Fixed a tricky electrical issue nobody else could!', date: new Date(2023, 8, 20).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/lucas_s/40/40' },
    ],
    products: [
      { id: 's4', name: 'Battery Replacement', imageUrl: 'https://picsum.photos/seed/battery_service/200/150', price: 'Starting at $120', description: 'Includes new battery and installation.' },
      { id: 's5', name: 'Alternator Repair/Replacement', imageUrl: 'https://picsum.photos/seed/alternator_service/200/150', price: 'Contact for Quote', description: 'Expert alternator services to keep your car charged.' },
    ],
    contactEmail: 'contact@sparkyelectric.com',
    websiteUrl: 'https://sparkyelectric.example.com',
    address: '456 Volt Ave, Circuit City'
  },
  {
    id: 'store3',
    name: 'Prestige Auto Painters',
    logoUrl: 'https://picsum.photos/seed/prestige_logo/100/100',
    description: 'High-quality auto body painting and finishing services.',
    longDescription: 'At Prestige Auto Painters, we provide showroom-quality paint jobs and finishes for all types of vehicles. Using state-of-the-art equipment and premium paints, our experienced painters ensure a flawless result every time, whether it\'s a touch-up or a full repaint.',
    rating: 4.8,
    category: 'Painter',
    tags: ['auto painting', 'body work', 'custom paint', 'scratch repair', 'Painter'],
    pricingPlans: [], 
    features: [
      { id: 'f6', name: 'Color Matching Technology', icon: Paintbrush },
      { id: 'f7', name: 'Dust-Free Paint Booth', icon: ShieldCheck },
       ...commonFeatures.slice(0,1)
    ],
    reviews: [
      { id: 'r5', userName: 'Max Mayfield', rating: 5, comment: 'My car looks brand new! Amazing paint job.', date: new Date(2024, 0, 10).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/max_m/40/40' },
    ],
    products: [
      { id: 's6', name: 'Full Car Repaint', imageUrl: 'https://picsum.photos/seed/full_repaint/200/150', price: 'Starting at $1500', description: 'Complete exterior repaint in your choice of color.' },
      { id: 's7', name: 'Scratch & Dent Repair', imageUrl: 'https://picsum.photos/seed/scratch_repair/200/150', price: 'Contact for Estimate', description: 'Expert removal of scratches and dents.' },
    ],
    contactEmail: 'quotes@prestigepainters.com',
    websiteUrl: 'https://prestigepainters.example.com',
    address: '789 Canvas St, Color Town'
  },
  {
    id: 'store4',
    name: 'ShineTime Auto Detailing',
    logoUrl: 'https://picsum.photos/seed/shinetime_logo/100/100',
    bannerUrl: 'https://picsum.photos/seed/shinetime_banner/800/300',
    description: 'Professional auto detailing services for a showroom shine.',
    longDescription: 'ShineTime Auto Detailing offers comprehensive cleaning and detailing services to make your car look its best, inside and out. We use premium products and meticulous techniques for a lasting shine and protection.',
    rating: 4.9,
    category: 'Detailer',
    tags: ['car wash', 'detailing', 'interior cleaning', 'waxing', 'ceramic coating', 'Detailer'],
    pricingPlans: [
       { id: 'planC', name: 'Exterior Wash & Wax', price: '$75', features: ['Hand Wash', 'Wheel Cleaning', 'Carnauba Wax'], isFeatured: false },
       { id: 'planD', name: 'Full Detail Package', price: '$250', features: ['Exterior Wash & Wax', 'Interior Deep Clean', 'Leather Conditioning', 'Engine Bay Cleaning'], isFeatured: true },
    ],
    features: [
      ...commonFeatures.slice(1,3),
      { id: 'f8', name: 'Premium Cleaning Products', icon: Sparkles },
      { id: 'f9', name: 'Paint Correction Specialists', icon: Settings2 }
    ],
    reviews: [
        ...automotiveReviews.slice(0,1),
        { id: 'r6', userName: 'Will Byers', rating: 5, comment: 'My car has never been cleaner. Incredible attention to detail!', date: new Date(2023, 7, 12).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/will_b/40/40' }
    ],
    products: [
      { id: 's8', name: 'Ceramic Coating Application', imageUrl: 'https://picsum.photos/seed/ceramic_coating/200/150', price: 'Starting at $500', description: 'Long-lasting protection and hydrophobic properties for your paint.' },
      sampleServices[2] // Full Car Detailing
    ],
    contactEmail: 'book@shinetime.com',
    websiteUrl: 'https://shinetime.example.com',
    address: '101 Polish Pl, Gleam City'
  },
  {
    id: 'store5',
    name: 'TuneUp Masters',
    logoUrl: 'https://picsum.photos/seed/tuneup_logo/100/100',
    description: 'Performance tuning and ECU remapping for enhanced driving experience.',
    longDescription: 'TuneUp Masters specializes in optimizing your vehicle\'s performance. Our expert tuners use advanced software and dynamometer testing to unlock your engine\'s full potential, improving horsepower, torque, and fuel efficiency.',
    rating: 4.6,
    category: 'Tuner',
    tags: ['performance tuning', 'ECU remapping', 'dyno tuning', 'engine upgrades', 'Tuner'],
    pricingPlans: [],
    features: [
        { id: 'f10', name: 'Dyno-Proven Gains', icon: BarChart3 },
        { id: 'f11', name: 'Custom ECU Maps', icon: Settings2 },
        ...commonFeatures.slice(0,1)
    ],
    reviews: [
        { id: 'r7', userName: 'Steve Harrington', rating: 5, comment: 'My car feels like a beast now! Awesome tuning.', date: new Date(2023, 6, 22).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/steve_h/40/40' }
    ],
    products: [
      { id: 's9', name: 'Stage 1 ECU Tune', imageUrl: 'https://picsum.photos/seed/ecu_tune/200/150', price: 'Starting at $499', description: 'Optimize your engine for improved power and responsiveness.' },
      { id: 's10', name: 'Performance Exhaust Installation', imageUrl: 'https://picsum.photos/seed/exhaust_install/200/150', price: 'Contact for Quote', description: 'Installation of high-performance exhaust systems.' },
    ],
    contactEmail: 'tuning@tuneupmasters.com',
    websiteUrl: 'https://tuneupmasters.example.com',
    address: '202 Speed St, Fast Lane'
  },
   {
    id: 'store6',
    name: 'InspectRite Vehicle Inspectors',
    logoUrl: 'https://picsum.photos/seed/inspectrite_logo/100/100',
    description: 'Comprehensive pre-purchase vehicle inspections and safety checks.',
    longDescription: 'InspectRite offers thorough vehicle inspections to give you peace of mind before purchasing a used car or ensuring your current vehicle meets safety standards. Our detailed reports cover all major systems.',
    rating: 4.9,
    category: 'Inspector',
    tags: ['pre-purchase inspection', 'safety check', 'vehicle assessment', 'Inspector'],
    pricingPlans: [
       { id: 'planE', name: 'Standard Inspection', price: '$150', features: ['Mechanical Check', 'Body & Frame', 'Test Drive', 'Basic Report'], isFeatured: false },
       { id: 'planF', name: 'Premium Inspection', price: '$250', features: ['Standard Plus', 'Computer Diagnostics', 'Detailed Photo Report', 'History Check'], isFeatured: true },
    ],
    features: [
        { id: 'f12', name: 'Detailed Inspection Reports', icon: ClipboardCheck },
        { id: 'f13', name: 'Mobile Inspection Service', icon: Car },
        commonFeatures[0]
    ],
    reviews: [
        { id: 'r8', userName: 'Nancy Wheeler', rating: 5, comment: 'Very thorough inspection, saved me from buying a lemon!', date: new Date(2023, 5, 18).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/nancy_w/40/40' }
    ],
    products: [
      { id: 's11', name: 'Pre-Purchase Car Inspection', imageUrl: 'https://picsum.photos/seed/car_inspection/200/150', price: '$150 - $250', description: 'Comprehensive check before you buy.' },
      { id: 's12', name: 'Roadworthy/Safety Certificate', imageUrl: 'https://picsum.photos/seed/safety_cert/200/150', price: '$99', description: 'Official safety certification for your vehicle.' },
    ],
    contactEmail: 'inspections@inspectrite.com',
    websiteUrl: 'https://inspectrite.example.com',
    address: '303 Checkpoint Charliy, Safe Town'
  },
  {
    id: 'store7',
    name: 'AccuAlign Specialists',
    logoUrl: 'https://picsum.photos/seed/accualign_logo/100/100',
    description: 'Precision wheel alignment and suspension services.',
    longDescription: 'AccuAlign Specialists use state-of-the-art laser alignment equipment to ensure your vehicle\'s wheels are perfectly aligned for optimal handling, tire life, and fuel efficiency. We also service and repair suspension systems.',
    rating: 4.7,
    category: 'Aligner',
    tags: ['wheel alignment', 'suspension', 'tire balancing', 'steering', 'Aligner'],
    pricingPlans: [],
    features: [
        { id: 'f14', name: 'Laser Wheel Alignment', icon: AlignCenter },
        { id: 'f15', name: 'Suspension Experts', icon: Settings2 },
        commonFeatures[1]
    ],
    reviews: [
        { id: 'r9', userName: 'Jonathan Byers', rating: 4, comment: 'Alignment is perfect now, car drives straight.', date: new Date(2023, 4, 10).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/jonathan_b/40/40' }
    ],
    products: [
      { id: 's13', name: 'Four-Wheel Alignment', imageUrl: 'https://picsum.photos/seed/wheel_alignment/200/150', price: '$99.99', description: 'Precision alignment for all four wheels.' },
      { id: 's14', name: 'Suspension Repair', imageUrl: 'https://picsum.photos/seed/suspension_repair/200/150', price: 'Contact for Quote', description: 'Shocks, struts, and other suspension components.' },
    ],
    contactEmail: 'align@accualign.com',
    websiteUrl: 'https://accualign.example.com',
    address: '404 Straight St, Balance City'
  },
  {
    id: 'store8',
    name: 'SoundInstall Pro',
    logoUrl: 'https://picsum.photos/seed/soundinstall_logo/100/100',
    description: 'Expert installation of car audio, video, and security systems.',
    longDescription: 'Upgrade your ride with SoundInstall Pro. We offer professional installation services for car stereos, speakers, amplifiers, navigation systems, alarms, remote starters, and more. Quality components and clean installations guaranteed.',
    rating: 4.8,
    category: 'Installer',
    tags: ['car audio', 'security systems', 'navigation', 'remote start', 'Installer'],
    pricingPlans: [],
    features: [
        { id: 'f16', name: 'Custom Installations', icon: PackageCheck },
        { id: 'f17', name: 'Lifetime Warranty on Labor', icon: ShieldCheck },
        commonFeatures[0]
    ],
    reviews: [
        { id: 'r10', userName: 'Erica Sinclair', rating: 5, comment: 'My new sound system is SICK! These guys are pros.', date: new Date(2023, 3, 25).toISOString(), userAvatarUrl: 'https://picsum.photos/seed/erica_s/40/40' }
    ],
    products: [
      { id: 's15', name: 'Car Stereo Installation', imageUrl: 'https://picsum.photos/seed/stereo_install/200/150', price: 'Starting at $75 (labor)', description: 'Professional head unit and speaker installation.' },
      { id: 's16', name: 'Car Alarm System Installation', imageUrl: 'https://picsum.photos/seed/alarm_install/200/150', price: 'Starting at $199 (includes system)', description: 'Protect your vehicle with a modern alarm system.' },
    ],
    contactEmail: 'install@soundinstallpro.com',
    websiteUrl: 'https://soundinstallpro.example.com',
    address: '505 Amp Ave, Audio Town'
  }
];

export const getStoreById = (id: string): Store | undefined => {
  return mockStores.find(store => store.id === id);
};

export const getAllStores = (): Store[] => {
  return mockStores;
};
