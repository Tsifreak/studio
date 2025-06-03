
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getAllStoresFromDB } from '@/lib/storeService';
import type { Store, StoreCategory, SortByType } from '@/lib/types';
import { AppCategories } from '@/lib/types';
import { StoreCard } from '@/components/store/StoreCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, Search, ArrowUpDown, Tag, Loader2, LocateFixed, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateDistance } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';


const sortOptions: { value: SortByType; label: string; disabled?: (hasLocation: boolean) => boolean }[] = [
  { value: 'default', label: 'Προεπιλογή' },
  { value: 'rating_desc', label: 'Βαθμολογία: Υψηλότερη' },
  { value: 'rating_asc', label: 'Βαθμολογία: Χαμηλότερη' },
  { value: 'name_asc', label: 'Όνομα: Α-Ω' },
  { value: 'name_desc', label: 'Όνομα: Ω-Α' },
  { value: 'distance_asc', label: 'Απόσταση: Πλησιέστερα', disabled: (hasLocation) => !hasLocation },
];

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = decodeURIComponent(params.categorySlug as string) as StoreCategory;
  const { toast } = useToast();

  const [allStores, setAllStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [sortBy, setSortBy] = useState<SortByType>('default');

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const categoryInfo = AppCategories.find(cat => cat.slug === categorySlug);

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Η γεωγραφική τοποθεσία δεν υποστηρίζεται από το πρόγραμμα περιήγησής σας.");
      toast({ title: "Σφάλμα Τοποθεσίας", description: "Η γεωγραφική τοποθεσία δεν υποστηρίζεται.", variant: "destructive" });
      return;
    }
    setIsFetchingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsFetchingLocation(false);
        toast({ title: "Επιτυχία", description: "Η τοποθεσία σας εντοπίστηκε!" });
      },
      (err) => {
        let message = "Δεν ήταν δυνατός ο εντοπισμός της τοποθεσίας σας.";
        if (err.code === 1) message = "Η πρόσβαση στην τοποθεσία απορρίφθηκε. Παρακαλώ ενεργοποιήστε την στις ρυθμίσεις του προγράμματος περιήγησης.";
        else if (err.code === 2) message = "Η τοποθεσία δεν είναι διαθέσιμη.";
        else if (err.code === 3) message = "Χρονικό όριο αιτήματος τοποθεσίας έληξε.";
        setLocationError(message);
        setIsFetchingLocation(false);
        toast({ title: "Σφάλμα Τοποθεσίας", description: message, variant: "destructive" });
      },
      { timeout: 10000 } // Add timeout
    );
  }, [toast]);

  useEffect(() => {
    const fetchStores = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedStores = await getAllStoresFromDB();
        setAllStores(fetchedStores);
      } catch (err) {
        console.error("Failed to fetch stores for category page:", err);
        setError("Δεν ήταν δυνατή η φόρτωση των κέντρων.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchStores();
  }, []);

  useEffect(() => {
    if (categoryInfo) {
      document.title = `Κέντρα: ${categoryInfo.translatedName} | Amaxakis`;
    } else {
      document.title = 'Κατηγορία Δεν Βρέθηκε | Amaxakis';
    }
  }, [categoryInfo]);

  const storesInCategory = useMemo(() => {
    if (!categorySlug || allStores.length === 0) return [];
    return allStores.filter(store => store.categories && store.categories.includes(categorySlug));
  }, [allStores, categorySlug]);

  const filteredAndSortedStores = useMemo(() => {
    let result = [...storesInCategory].map(store => ({ ...store, distance: undefined } as Store)); // Initialize distance as undefined

    if (searchTerm) {
      result = result.filter(store =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (tagInput) {
      const tagsToFilter = tagInput.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
      if (tagsToFilter.length > 0) {
        result = result.filter(store =>
          store.tags && store.tags.some(storeTag =>
            tagsToFilter.includes(storeTag.toLowerCase())
          )
        );
      }
    }

    switch (sortBy) {
      case 'rating_desc':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'rating_asc':
        result.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'distance_asc':
        if (userLocation) {
          result = result.map(store => ({
            ...store,
            distance: store.location ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              store.location.latitude,
              store.location.longitude
            ) : Infinity,
          })).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        } else {
           // If no user location, distance sort doesn't apply, fallback to default
           // Or it could be handled by disabling the option in UI
        }
        break;
      default:
        // No specific sort or keep original fetched order
        break;
    }
    return result;
  }, [storesInCategory, searchTerm, tagInput, sortBy, userLocation]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-10 w-72 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <Card className="mb-8 p-6">
            <CardHeader><Skeleton className="h-8 w-1/3 mb-4" /></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="p-4 border rounded-lg bg-card shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <Skeleton className="h-16 w-16 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6 mb-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-primary mb-4">Σφάλμα Φόρτωσης</h1>
        <p className="text-md text-muted-foreground mb-6">{error}</p>
        <Button asChild>
          <Link href="/">Επιστροφή στις Κατηγορίες</Link>
        </Button>
      </div>
    );
  }

  if (!categoryInfo) {
    return (
     <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
       <ShieldAlert className="w-16 h-16 text-destructive mb-6" />
       <h1 className="text-3xl font-bold text-primary mb-4">Η Κατηγορία δεν Βρέθηκε</h1>
       <p className="text-md text-muted-foreground mb-6">
         Η κατηγορία "{categorySlug}" δεν είναι έγκυρη.
       </p>
       <Button asChild>
         <Link href="/">Επιστροφή στις Κατηγορίες</Link>
       </Button>
     </div>
   );
 }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold text-primary">
            Κέντρα στην κατηγορία: {categoryInfo.translatedName}
            </h1>
            <p className="text-muted-foreground">
            {categoryInfo.description}
            </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Πίσω στις Κατηγορίες
          </Link>
        </Button>
      </div>

      <Card className="mb-8 shadow-md">
        <CardHeader>
            <CardTitle className="text-xl">Φίλτρα & Ταξινόμηση</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <label htmlFor="cat-search" className="text-sm font-medium text-foreground mb-1 block">Αναζήτηση</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="cat-search"
                        type="text"
                        placeholder="Όνομα, περιγραφή..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>
            <div>
                <label htmlFor="cat-tags" className="text-sm font-medium text-foreground mb-1 block">Ετικέτες (Tags)</label>
                 <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="cat-tags"
                        type="text"
                        placeholder="π.χ. φρένα, service"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>
            <div>
                <label htmlFor="cat-sort" className="text-sm font-medium text-foreground mb-1 block">Ταξινόμηση κατά</label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortByType)}>
                    <SelectTrigger id="cat-sort" className="w-full">
                        <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Επιλογή ταξινόμησης" />
                    </SelectTrigger>
                    <SelectContent>
                    {sortOptions.map(option => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          disabled={option.disabled ? option.disabled(!!userLocation) : false}
                        >
                          {option.label}
                          {option.value === 'distance_asc' && !userLocation && ' (Απαιτείται τοποθεσία)'}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <label htmlFor="get-location" className="text-sm font-medium text-foreground mb-1 block">Η Τοποθεσία μου</label>
                <Button
                  id="get-location"
                  variant="outline"
                  onClick={requestUserLocation}
                  disabled={isFetchingLocation}
                  className="w-full"
                >
                  {isFetchingLocation ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Εντοπισμός...</>
                  ) : (
                    <><LocateFixed className="mr-2 h-4 w-4" /> Εντοπισμός</>
                  )}
                </Button>
            </div>
        </CardContent>
         {locationError && (
          <CardContent className="pt-0">
            <Alert variant="destructive" className="mt-2">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Σφάλμα Τοποθεσίας</AlertTitle>
                <AlertDescription>{locationError}</AlertDescription>
            </Alert>
          </CardContent>
        )}
        {!userLocation && sortBy === 'distance_asc' && (
          <CardContent className="pt-0">
            <Alert variant="default" className="mt-2">
                <Info className="h-4 w-4" />
                <AlertTitle>Απαιτείται Τοποθεσία</AlertTitle>
                <AlertDescription>Παρακαλώ επιτρέψτε την πρόσβαση στην τοποθεσία σας για ταξινόμηση κατά απόσταση.</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {filteredAndSortedStores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedStores.map(store => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-2xl font-semibold text-foreground mt-4">Δεν Βρέθηκαν Κέντρα</h2>
          <p className="mt-2 text-muted-foreground">
            Δεν υπάρχουν κέντρα που να ταιριάζουν με τα φίλτρα σας για την κατηγορία "{categoryInfo.translatedName}".
          </p>
        </div>
      )}
    </div>
  );
}
