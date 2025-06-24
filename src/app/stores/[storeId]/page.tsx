"use client";

import { getStoreByIdFromDB } from '@/lib/storeService';
import type { Store, Feature, SerializedStore, SerializedFeature, Product as ProductType, Review, Service, AvailabilitySlot, StoreCategory } from '@/lib/types';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Star, MapPin, Globe, ShoppingBag, Edit, CalendarDays, AlertTriangle, Info, Tag, CheckCircle2, Tags, Heart } from 'lucide-react'; // Import Heart icon
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PricingCard } from '@/components/store/PricingCard';
import { ProductListItem } from '@/components/store/ProductListItem';
import { ContactForm } from '@/components/shared/ContactForm';
import { ReviewForm } from '@/components/store/ReviewForm';
import { submitStoreQuery, addReviewAction, toggleSavedStore } from './actions'; // Import toggleSavedStore
import { AppCategories } from '@/lib/types';
import { RenderFeatureIcon } from '@/components/store/RenderFeatureIcon';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookingForm } from '@/components/booking/BookingForm';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { SingleStoreMap } from '@/components/maps/SingleStoreMap';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react'; // Import useSession for user authentication

// ADDED IMPORTS FOR THE ICONS (kept from previous changes)
import VerifiedIconComponent from '@/components/icons/VerifiedIconComponent';
import PremiumIconComponent from '@/components/icons/PremiumIconComponent';
// END ADDITIONS

export default function StoreDetailPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const { data: session, status } = useSession(); // Get user session
  const userId = session?.user?.id; // Assuming your session has a user.id

  const [storeData, setStoreData] = useState<Store | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false); // State to track if the store is saved

  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<Service | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  useEffect(() => {
    const fetchStore = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const currentStoreId = Array.isArray(storeId) ? storeId[0] : storeId;
        if (typeof currentStoreId === 'string') {
          const fetchedStore = await getStoreByIdFromDB(currentStoreId);
          if (fetchedStore) {
            setStoreData(fetchedStore);
            // Check if the store is saved by the current user
            if (userId) {
              const savedStores = fetchedStore.savedByUsers || [];
              setIsSaved(savedStores.includes(userId));
            }
          } else {
            setStoreData(null);
          }
        } else {
          console.warn("storeId is not a string or is undefined:", currentStoreId);
          setError("Μη έγκυρο αναγνωριστικό καταστήματος.");
          setStoreData(null);
        }
      } catch (err) {
        console.error("Failed to fetch store details:", err);
        setError("Δεν ήταν δυνατή η φόρτωση των λεπτομερειών του καταστήματος.");
        setStoreData(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (storeId) {
      fetchStore();
    }
  }, [storeId, userId]); // Re-run effect when userId changes

  const handleToggleSave = async () => {
    if (!userId || !storeData?.id) {
      // Potentially show a toast or redirect to login if not authenticated
      console.warn("User not logged in or store ID missing. Cannot save/unsave.");
      return;
    }
    try {
      // Optimistic UI update
      setIsSaved(prev => !prev);
      const result = await toggleSavedStore(storeData.id, userId, !isSaved);
      if (result.success) {
        // Optionally update storeData.savedByUsers to reflect the change immediately
        setStoreData(prevStore => {
          if (!prevStore) return null;
          const updatedSavedByUsers = new Set(prevStore.savedByUsers || []);
          if (!isSaved) { // If it was not saved, now it is
            updatedSavedByUsers.add(userId);
          } else { // If it was saved, now it's not
            updatedSavedByUsers.delete(userId);
          }
          return { ...prevStore, savedByUsers: Array.from(updatedSavedByUsers) };
        });
      } else {
        // Revert optimistic update if action failed
        setIsSaved(prev => !prev);
        console.error("Failed to toggle saved store:", result.message);
        // Show an error toast
      }
    } catch (error) {
      // Revert optimistic update if action failed
      setIsSaved(prev => !prev);
      console.error("Error toggling saved store:", error);
      // Show an error toast
    }
  };

  if (isLoading || storeData === undefined) {
    return (
        <div className="space-y-8">
            <Card className="overflow-hidden shadow-xl">
                <Skeleton className="h-48 md:h-64 w-full bg-muted" />
                <CardHeader className="p-6 relative mt-[-48px] sm:mt-[-64px] z-10 flex flex-col sm:flex-row items-start sm:items-end gap-4">
                    <Skeleton className="h-32 w-32 rounded-full border-4 border-background shadow-lg bg-muted" />
                    <div className="flex-1 pt-4 sm:pt-0 space-y-2">
                        <Skeleton className="h-10 w-3/4 bg-muted" />
                        <Skeleton className="h-5 w-1/2 bg-muted" />
                        <Skeleton className="h-5 w-full bg-muted" />
                    </div>
                </CardHeader>
            </Card>
             <Skeleton className="h-10 w-1/3 mx-auto bg-muted mb-6" />
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/2 bg-muted" /></CardHeader>
                <CardContent><Skeleton className="h-20 w-full bg-muted" /></CardContent>
            </Card>
             <Card>
                <CardHeader><Skeleton className="h-8 w-1/3 bg-muted" /></CardHeader>
                <CardContent><Skeleton className="h-80 w-full bg-muted rounded-md" /></CardContent>
            </Card>
        </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
        <h1 className="3xl font-bold text-destructive mb-4">Σφάλμα Φόρτωσης</h1>
        <p className="text-md text-muted-foreground mb-6">{error}</p>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
        <h1 className="4xl font-bold text-foreground mb-2">Το Κέντρο Εξυπηρέτησης δεν Βρέθηκε</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Λυπούμαστε, δεν μπορέσαμε να βρούμε το κέντρο εξυπηρέτησης που αναζητούσατε.
        </p>
        <Button asChild>
          <a href="/">Επιστροφή στην Αρχική Σελίδα</a>
        </Button>
      </div>
    );
  }

  const serializableStore: SerializedStore = {
    ...storeData,
    features: storeData.features.map((feature: Feature | SerializedFeature): SerializedFeature => ({
      id: feature.id,
      name: feature.name,
      description: feature.description,
      icon: typeof feature.icon === 'string' ? feature.icon : undefined,
    })),
    products: storeData.products || [],
    reviews: storeData.reviews || [],
    services: storeData.services || [],
    availability: storeData.availability || [],
    categories: storeData.categories || [],
    iconType: (typeof storeData.iconType === 'string' && (storeData.iconType === 'verified' || storeData.iconType === 'premium'))
              ? storeData.iconType
              : undefined,
    // Ensure savedByUsers is also part of SerializedStore if it's not already
    savedByUsers: storeData.savedByUsers || [],
  };


  const averageRating = serializableStore.reviews && serializableStore.reviews.length > 0
    ? serializableStore.reviews.reduce((acc, review) => acc + review.rating, 0) / serializableStore.reviews.length
    : serializableStore.rating;

  const categoryDisplay = serializableStore.categories
    .map(slug => AppCategories.find(cat => cat.slug === slug)?.translatedName)
    .filter(Boolean)
    .join(', ');

  const hasAvailability = serializableStore.availability && serializableStore.availability.length > 0;

  const handleBookServiceClick = (service: Service) => {
    setSelectedServiceForBooking(service);
    setIsBookingDialogOpen(true);
  };

  const weekDaysTranslated = [
    'Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'
  ];

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-xl">
        {serializableStore.bannerUrl && (
          <div className="relative h-48 md:h-64 w-full">
            <Image
              src={serializableStore.bannerUrl}
              alt={`${serializableStore.name} banner`}
              fill={true}
              style={{objectFit:"cover"}}
              data-ai-hint="store banner"
              priority
            />
            <div className="absolute inset-0 bg-black/30" />
            {/* Save Button on Banner */}
            {status === 'authenticated' && userId && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-20 text-white hover:text-red-500 hover:bg-white/20 backdrop-blur-sm rounded-full"
                onClick={handleToggleSave}
                aria-label={isSaved ? "Unsave store" : "Save store"}
              >
                <Heart className={cn("w-6 h-6", isSaved ? "fill-red-500 text-red-500" : "text-white")} />
              </Button>
            )}
          </div>
        )}
        <CardHeader className="p-6 relative mt-[-36px] sm:mt-[-44px] z-10 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <Image
            src={serializableStore.logoUrl}
            alt={`${serializableStore.name} logo`}
            width={128}
            height={128}
            className="rounded-full border-4 border-background shadow-lg bg-background"
            data-ai-hint="logo"
          />
          <div className="flex-1 pt-4 sm:pt-0">
            <CardTitle className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-x-4">
              {serializableStore.name}
              {serializableStore.iconType === 'verified' && (
                  <VerifiedIconComponent className="w-[146px] h-[40px] store-icon" />
              )}
              {serializableStore.iconType === 'premium' && (
                  <PremiumIconComponent className="w-[180px] h-[40px] store-icon" />
              )}
            </CardTitle>

            <CardDescription className="text-md text-muted-foreground mt-1">{serializableStore.description}</CardDescription>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {averageRating > 0 && (
                <span className="flex items-center">
                  <Star className="w-5 h-5 mr-1 fill-yellow-400 text-yellow-400" /> {averageRating.toFixed(1)} ({serializableStore.reviews?.length || 0} κριτικές)
                </span>
              )}
              {categoryDisplay && (
                <span className="flex items-center">
                  <ShoppingBag className="w-4 h-4 mr-1 text-primary" /> {categoryDisplay}
                </span>
              )}
              {serializableStore.address && (
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1 text-primary" /> {serializableStore.address}
                </span>
              )}
              {serializableStore.websiteUrl && (
                <a href={serializableStore.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-primary transition-colors">
                  <Globe className="w-4 h-4 mr-1" /> Επισκεφθείτε την Ιστοσελίδα
                </a>
              )}
            </div>
          </div>
          {/* Save Button on the right corner of the CardHeader */}
          {status === 'authenticated' && userId && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-6 right-6 z-20 text-muted-foreground hover:text-red-500"
              onClick={handleToggleSave}
              aria-label={isSaved ? "Unsave store" : "Save store"}
            >
              <Heart className={cn("w-6 h-6", isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
            </Button>
          )}
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 mb-6">
  <TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
  <TabsTrigger value="services_booking">Υπηρεσίες & Κράτηση ({serializableStore.services?.length || 0})</TabsTrigger>
  <TabsTrigger value="products">Προϊόντα ({serializableStore.products?.length || 0})</TabsTrigger>
  <TabsTrigger value="pricing">Πακέτα</TabsTrigger>
  <TabsTrigger value="reviews">Κριτικές ({serializableStore.reviews?.length || 0})</TabsTrigger>
  <TabsTrigger value="contact">Επικοινωνία</TabsTrigger>
</TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* START: NEW FLEX CONTAINER FOR INFO AND MAP CARDS */}
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Store Info Card (Left Column) */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Σχετικά με το {serializableStore.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">{serializableStore.longDescription || serializableStore.description}</p>

                {/* Categories and Tags */}
                <div className="mt-4 flex flex-col md:flex-row gap-6">
                  {serializableStore.categories && serializableStore.categories.length > 0 && (
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-2 text-foreground">Κατηγορίες:</h3>
                      <div className="flex flex-wrap gap-2">
                        {serializableStore.categories.map(slug => {
                          const catInfo = AppCategories.find(c => c.slug === slug);
                          return catInfo ? (
                            <Link key={slug} href={`/category/${slug}`} legacyBehavior>
                              <a className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors">
                                {catInfo.translatedName}
                              </a>
                            </Link>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {serializableStore.tags && serializableStore.tags.length > 0 && (
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-2 text-foreground">Ετικέτες:</h3>
                      <div className="flex flex-wrap gap-2">
                        {serializableStore.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full flex items-center">
                            <Tag className="w-3 h-3 mr-1.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Location and Opening Hours */}
            <div className="flex flex-col flex-1 gap-6">
              {/* Location Card (Map) - This remains unchanged */}
              {serializableStore.location && (
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle>Τοποθεσία</CardTitle>
                    {serializableStore.address && (
                      <CardDescription>
                        <MapPin className="inline-block w-4 h-4 mr-1 text-muted-foreground" />
                        {serializableStore.address}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 w-full rounded-md overflow-hidden border shadow-inner">
                      <SingleStoreMap
                        key={serializableStore.id}
                        latitude={serializableStore.location.latitude}
                        longitude={serializableStore.location.longitude}
                        storeName={serializableStore.name}
                        zoom={15}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Weekly Availability Card - Moved here */}
              {serializableStore.availability && serializableStore.availability.length > 0 && (
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle>Ώρες Λειτουργίας</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {weekDaysTranslated.map((dayName, index) => {
                        const dayAvailability = serializableStore.availability.find(
                          (slot) => slot.dayOfWeek === index
                        );
                        const isClosed = !dayAvailability || (!dayAvailability.startTime && !dayAvailability.endTime);

                        return (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="font-semibold flex items-center">
                              <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
                              {dayName}
                            </span>
                            <span>
                              {isClosed
                                ? <span className="text-red-500">Κλειστά</span>
                                : `${dayAvailability.startTime} - ${dayAvailability.endTime}`
                              }
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          {/* END: NEW FLEX CONTAINER FOR INFO AND MAP CARDS */}

          <Card>
            <CardHeader>
              <CardTitle>Εξειδίκευση σε Brands</CardTitle>
            </CardHeader>
            <CardContent>
              {serializableStore.specializedBrands && serializableStore.specializedBrands.length > 0 ? (
                <>
                  <h3 className="text-sm font-semibold mb-4 text-foreground">Brands:</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    {serializableStore.specializedBrands.map(brand => (
                      <div key={brand} className="flex flex-col items-center">
                         <Image
                          src={`/logos/brands/${brand.toLowerCase().replace(/\s+/g, '-')}.svg`} // Construct logo path
                          alt={`${brand} logo`}
                          width={64}
                          height={64}
                          className="object-contain"
                          onError={(e) => { e.currentTarget.src = '/logos/brands/default.svg'; }} // Fallback logo if not found
                        />

                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Το κέντρο δεν έχει καταχωρήσει εξειδίκευση σε συγκεκριμένα brands.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brands Ελαστικών</CardTitle>
            </CardHeader>
            <CardContent>
              {serializableStore.tyreBrands && serializableStore.tyreBrands.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-center gap-4">
                    {serializableStore.tyreBrands.map(brand => (
                      <div key={brand} className="flex flex-col items-center">
                         <Image
                          src={`/logos/brands/${brand.toLowerCase().replace(/\\s+/g, '-')}.svg`} // Construct logo path
                          alt={`${brand} logo`}
                          width={64}
                          height={64}
                          className="object-contain"
                          onError={(e) => { e.currentTarget.src = '/logos/brands/default.svg'; }} // Fallback logo if not found
                        />

                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Το κέντρο δεν έχει καταχωρήσει εξειδίκευση σε συγκεκριμένα brands.</p>
              )}
            </CardContent>
          </Card>
          {serializableStore.features && serializableStore.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Βασικά Χαρακτηριστικά</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {serializableStore.features.map(feature => (
                  <div key={feature.id} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                    <RenderFeatureIcon iconName={feature.icon} className="w-6 h-6 text-primary mt-1 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-foreground">{feature.name}</h4>
                      {feature.description && <p className="text-xs text-muted-foreground">{feature.description}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="services_booking">
          <Card>
            <CardHeader>
              <CardTitle>Προσφερόμενες Υπηρεσίες για Κράτηση</CardTitle>
              <CardDescription>Επιλέξτε μια υπηρεσία για να δείτε τις διαθέσιμες ώρες και να κάνετε κράτηση.</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasAvailability && (
                 <Alert variant="default" className="mb-6">
                    <Info className="h-5 w-5" />
                    <AlertTitle>Η Διαθεσιμότητα δεν έχει Οριστεί</AlertTitle>
                    <AlertDescription>
                      Αυτό το κατάστημα δεν έχει ορίσει ακόμη το πρόγραμμα διαθεσιμότητάς του. Οι κρατήσεις δεν είναι δυνατές αυτή τη στιγμή.
                      Παρακαλούμε ελέγξτε ξανά αργότερα ή επικοινωνήστε απευθείας με το κατάστημα.
                    </AlertDescription>
                  </Alert>
               )}
              {serializableStore.services && serializableStore.services.length > 0 ? (
                <div className="space-y-4">
                  {serializableStore.services.map((service: Service) => (
                    <Card key={service.id} className="p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                          <h3 className="text-lg font-semibold text-primary">{service.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1 mb-2">{service.description}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            <span className="flex items-center"><CalendarDays className="w-4 h-4 mr-1.5 text-muted-foreground"/> Διάρκεια: {service.durationMinutes} λεπτά</span>
                            <span className="flex items-center"><Tag className="w-4 h-4 mr-1.5 text-muted-foreground"/> Τιμή: {service.price.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })}</span>
                          </div>
                        </div>
                        <Button
                          className="mt-3 sm:mt-0 sm:ml-4"
                          disabled={!hasAvailability}
                          onClick={() => handleBookServiceClick(service)}
                        >
                          Κάντε Κράτηση
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Δεν υπάρχουν διαθέσιμες υπηρεσίες για κράτηση αυτή τη στιγμή.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Οι Υπηρεσίες/Προϊόντα μας</CardTitle>
              <CardDescription>Περιηγηθείτε στις επιλογές που προσφέρει το {serializableStore.name}. (Αυτό είναι για γενικά προϊόντα/υπηρεσίες, όχι για κρατήσεις)</CardDescription>
            </CardHeader>
            <CardContent>
              {serializableStore.products && serializableStore.products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {serializableStore.products.map((product: ProductType, index: number) => (
                    <ProductListItem key={`${product.id}-${index}`} product={product} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν καταχωρημένες υπηρεσίες/προϊόντα για αυτό το κέντρο ακόμη.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
           <Card>
            <CardHeader>
              <CardTitle>Πακέτα Τιμολόγησης</CardTitle>
              <CardDescription>Βρείτε ένα πακέτο που ταιριάζει στις ανάγκες σας από το {serializableStore.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {serializableStore.pricingPlans && serializableStore.pricingPlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {serializableStore.pricingPlans.map(plan => (
                    <PricingCard key={plan.id} plan={plan} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν διαθέσιμα πακέτα τιμολόγησης για αυτό το κέντρο εξυπηρέτησης.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-8">
  {/* Card 1: Contains the form to write a new review */}
  <Card>
    <CardHeader>
      <CardTitle>Γράψτε τη γνώμη σας</CardTitle>
      <CardDescription>Μοιραστείτε την εμπειρία σας με την κοινότητα.</CardDescription>
    </CardHeader>
    <CardContent>
      {/* The ReviewForm component is now placed here */}
      <ReviewForm storeId={serializableStore.id} action={addReviewAction} />
    </CardContent>
  </Card>

  {/* Card 2: Contains the list of existing reviews */}
  <Card>
    <CardHeader>
      <CardTitle>Κριτικές Πελατών</CardTitle>
      <CardDescription>Δείτε τι λένε οι άλλοι για το {serializableStore.name}.</CardDescription>
    </CardHeader>
    <CardContent>
      {serializableStore.reviews && serializableStore.reviews.length > 0 ? (
         <div className="space-y-4">
          {serializableStore.reviews.map((review: Review) => (
            <div key={review.id} className="p-4 border rounded-md bg-muted/50">
              <div className="flex items-center mb-1">
                {review.userAvatarUrl && (
                   <Image src={review.userAvatarUrl} alt={review.userName} width={32} height={32} className="rounded-full mr-3" data-ai-hint="avatar person" />
                )}
                <p className="font-semibold text-foreground">{review.userName}</p>
              </div>
              <div className="flex items-center my-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                ))}
                 <span className="ml-2 text-xs text-muted-foreground">{review.rating.toFixed(1)} αστέρια</span>
              </div>
              <p className="text-sm text-muted-foreground italic mt-1 mb-2">{review.comment}</p>
               {review.date && <p className="text-xs text-muted-foreground">{new Date(review.date).toLocaleDateString('el-GR', { year: 'numeric', month: 'long', day: 'numeric'})}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν ακόμη κριτικές για αυτό το κέντρο εξυπηρέτησης.</p>
      )}
    </CardContent>
  </Card>
</TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Επικοινωνήστε με το {serializableStore.name}</CardTitle>
              <CardDescription>Έχετε κάποια ερώτηση ή συγκεκριμένο αίτημα? Στείλτε τους απευθείας μήνυμα.</CardDescription>
            </CardHeader>
            <CardContent>
              <ContactForm storeId={serializableStore.id} onSubmitAction={submitStoreQuery} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedServiceForBooking && (
        <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>Κράτηση για: {selectedServiceForBooking.name}</DialogTitle>
                <DialogDescription>
                    Επιλέξτε ημερομηνία και ώρα για την υπηρεσία. Διάρκεια: {selectedServiceForBooking.durationMinutes} λεπτά.
                </DialogDescription>
            </DialogHeader>
            <BookingForm
              selectedService={selectedServiceForBooking}
              storeId={serializableStore.id}
              storeName={serializableStore.name}
              storeAvailability={serializableStore.availability}
              onOpenChange={setIsBookingDialogOpen}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}