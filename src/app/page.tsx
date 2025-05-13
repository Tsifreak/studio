
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { StoreCard } from '@/components/store/StoreCard';
import { StoreFilters } from '@/components/store/StoreFilters';
import { getAllStoresFromDB } from '@/lib/storeService'; // Changed import
import type { Store } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
// No longer need usePathname specifically for re-fetching on navigation,
// as data fetching is now more direct and revalidation handles updates.

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedStores = await getAllStoresFromDB(); // Use direct DB fetch
        setStores(fetchedStores);
      } catch (err) {
        console.error("Failed to fetch stores:", err);
        setError("Δεν ήταν δυνατή η φόρτωση των κέντρων εξυπηρέτησης. Παρακαλώ δοκιμάστε ξανά αργότερα.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []); // Fetch once on component mount

  const filteredAndSortedStores = useMemo(() => {
    let processedStores = [...stores];

    if (searchTerm) {
      processedStores = processedStores.filter(store =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.tags && store.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    if (selectedCategory !== 'all') {
      processedStores = processedStores.filter(store => store.category === selectedCategory);
    }

    switch (sortBy) {
      case 'rating_desc':
        processedStores.sort((a, b) => b.rating - a.rating);
        break;
      case 'rating_asc':
        processedStores.sort((a, b) => a.rating - b.rating);
        break;
      case 'name_asc':
        processedStores.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        processedStores.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        // Default sort or maintain fetched order
        processedStores.sort((a, b) => a.name.localeCompare(b.name)); // Default sort by name ASC
        break;
    }
    return processedStores;
  }, [stores, searchTerm, sortBy, selectedCategory]);

  return (
    <div className="space-y-8">
      <section className="text-center py-10 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg shadow">
        <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
          Καλώς ήρθατε στην Amaxakis
        </h1>
        <p className="mt-4 text-lg text-foreground/80 md:text-xl">
          Ο αξιόπιστος συνεργάτης σας για όλες τις ανάγκες επισκευής και συντήρησης αυτοκινήτων.
        </p>
      </section>

      <StoreFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {isLoading ? (
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
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          <h2 className="text-2xl font-semibold">Σφάλμα Φόρτωσης</h2>
          <p className="mt-2">{error}</p>
        </div>
      ) : filteredAndSortedStores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedStores.map(store => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-foreground">Δεν Βρέθηκαν Κέντρα Εξυπηρέτησης</h2>
          <p className="mt-2 text-muted-foreground">
            Δεν υπάρχουν διαθέσιμα κέντρα ή δοκιμάστε να προσαρμόσετε τα κριτήρια αναζήτησης.
          </p>
        </div>
      )}
    </div>
  );
}
