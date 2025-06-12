"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getAllStoresFromDB } from '@/lib/storeService';
import type { Store, StoreCategory, SortByType } from '@/lib/types';
import { AppCategories } from '@/lib/types';
import { StoreCard } from '@/components/store/StoreCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ArrowLeft, ShieldAlert, Search, ArrowUpDown, Tag,
  Loader2, LocateFixed, Info, ChevronDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateDistance } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const sortOptions: { value: SortByType; label: string; disabled?: (hasLocation: boolean) => boolean }[] = [
  { value: 'default', label: 'Προεπιλογή' },
  { value: 'rating_desc', label: 'Βαθμολογία: Υψηλότερη' },
  { value: 'rating_asc', label: 'Βαθμολογία: Χαμηλότερη' },
  { value: 'name_asc', label: 'Όνομα: Α-Ω' },
  { value: 'name_desc', label: 'Όνομα: Ω-Α' },
  { value: 'distance_asc', label: 'Απόσταση: Πλησιέστερα', disabled: (hasLocation) => !hasLocation },
];
const getBrandLogoPath = (brand: string) => {
  const filename = brand.toLowerCase().replace(/\s+/g, '-');
  return `/logos/brands/${filename}.svg`;
};
// Brand Filter Dropdown Component
const BrandFilterDropdown = ({ allBrands, selectedBrands, handleBrandChange }: {
  allBrands: string[],
  selectedBrands: string[],
  handleBrandChange: (brand: string) => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !(dropdownRef.current as any).contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <h3 className="text-md font-medium text-foreground mb-2">Εξειδικευμένα Brands</h3>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border rounded-md flex justify-between items-center bg-white shadow hover:shadow-md"
      >
        <span>{selectedBrands.length ? `${selectedBrands.length} Επιλεγμένα` : 'Επιλογή Brands'}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {allBrands.map(brand => (
            <label key={brand} className="flex items-center px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedBrands.includes(brand)}
              onChange={() => handleBrandChange(brand)}
              className="mr-2"
            />
            <span className="flex items-center gap-2">
              <img
                src={getBrandLogoPath(brand)}
                alt={brand}
                className="w-5 h-5 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              {brand}
            </span>
          </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default function CategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const categorySlug = decodeURIComponent(params.categorySlug as string) as StoreCategory;
  const categoryInfo = AppCategories.find(cat => cat.slug === categorySlug);

  const [allStores, setAllStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [sortBy, setSortBy] = useState<SortByType>('default');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  // Tag chip helpers
  const allAvailableTags = useMemo(() => {
    const tagSet = new Set<string>();
    allStores.forEach(store => store.tags?.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [allStores]);

  const selectedTags = useMemo(() => tagInput.split(',').map(t => t.trim()).filter(Boolean), [tagInput]);

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setTagInput(newTags.join(','));
  };

  // Get data on mount
  useEffect(() => {
    const fetchStores = async () => {
      setIsLoading(true);
      try {
        const stores = await getAllStoresFromDB();
        setAllStores(stores);
      } catch {
        setError('Δεν ήταν δυνατή η φόρτωση των κέντρων.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStores();
  }, []);

  // Sync URL parameters
  useEffect(() => {
    const term = searchParams.get('search') || '';
    const tags = searchParams.get('tags') || '';
    const sort = (searchParams.get('sort') as SortByType) || 'default';
    setSearchTerm(term);
    setTagInput(tags);
    setSortBy(sort);
  }, [searchParams]);

  const updateSearchParams = useCallback((key: string, value: string | null) => {
    const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
    value ? currentParams.set(key, value) : currentParams.delete(key);
    router.replace(`${window.location.pathname}?${currentParams.toString()}`);
  }, [searchParams, router]);

  useEffect(() => {
    updateSearchParams('search', searchTerm || null);
  }, [searchTerm, updateSearchParams]);

  useEffect(() => {
    updateSearchParams('tags', tagInput || null);
  }, [tagInput, updateSearchParams]);

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Δεν υποστηρίζεται τοποθεσία", variant: "destructive" });
      return;
    }
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setIsFetchingLocation(false);
        toast({ title: "Τοποθεσία εντοπίστηκε!" });
      },
      () => {
        toast({ title: "Αποτυχία εντοπισμού τοποθεσίας", variant: "destructive" });
        setIsFetchingLocation(false);
      }
    );
  }, [toast]);

  const storesInCategory = useMemo(() => {
    return allStores.filter(store => store.categories?.includes(categorySlug));
  }, [allStores, categorySlug]);

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    allStores.forEach(store => {
      store.specializedBrands?.forEach(b => brands.add(b.trim()));
    });
    return Array.from(brands).sort();
  }, [allStores]); 

  const filteredAndSortedStores = useMemo(() => {
    let filtered = [...storesInCategory];
    if (searchTerm) {
      filtered = filtered.filter(store =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedTags.length > 0) {
      filtered = filtered.filter(store =>
        store.tags?.some(tag => selectedTags.includes(tag))
      );
    }
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(store =>
        store.specializedBrands?.some(brand => selectedBrands.includes(brand))
      );
    }

    switch (sortBy) {
      case 'name_asc': return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc': return filtered.sort((a, b) => b.name.localeCompare(a.name));
      case 'rating_asc': return filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      case 'rating_desc': return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'distance_asc':
        if (userLocation) {
          return filtered.map(store => ({
            ...store,
            distance: store.location
              ? calculateDistance(userLocation.latitude, userLocation.longitude, store.location.latitude, store.location.longitude)
              : Infinity,
          })).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        }
        return filtered;
      default: return filtered;
    }
  }, [storesInCategory, searchTerm, selectedTags, selectedBrands, sortBy, userLocation]);

  if (isLoading) return <div className="p-6 text-center">Φόρτωση...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!categoryInfo) return <div>Κατηγορία δεν βρέθηκε</div>;

  return (
    <div className="space-y-6 px-6 py-4 max-w-screen-xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">Κατηγορία: {categoryInfo.translatedName}</h1>
          <p className="text-muted-foreground">{categoryInfo.description}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Πίσω</Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <div>
            <Label htmlFor="search">Αναζήτηση</Label>
            <Input id="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sort">Ταξινόμηση</Label>
            <Select value={sortBy} onValueChange={value => setSortBy(value as SortByType)}>
              <SelectTrigger id="sort"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sortOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled?.(!!userLocation)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Τοποθεσία</Label>
            <Button onClick={requestUserLocation} disabled={isFetchingLocation} className="w-full">
              {isFetchingLocation ? <><Loader2 className="mr-2 animate-spin" />Εντοπισμός...</> : <><LocateFixed className="mr-2" />Εντοπισμός</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="p-4 space-y-6">
          {/* Tag Chips */}
          <div>
            <h3 className="font-semibold mb-2">Ετικέτες</h3>
            <div className="flex flex-wrap gap-2">
              {allAvailableTags.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1 rounded-full text-sm font-medium transition ${selectedTags.includes(tag) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Dropdown */}
          <BrandFilterDropdown allBrands={uniqueBrands} selectedBrands={selectedBrands} handleBrandChange={(brand) => {
            setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
          }} />
        </Card>

        {/* Listings */}
        <div className="lg:col-span-3">
          {filteredAndSortedStores.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Δεν βρέθηκαν αποτελέσματα.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedStores.map(store => <StoreCard key={store.id} store={store} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
