
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { StoreCard } from '@/components/store/StoreCard';
import { StoreFilters } from '@/components/store/StoreFilters';
import { getAllStores } from '@/lib/placeholder-data';
import type { Store } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default'); // e.g., 'rating_desc', 'name_asc'
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data
    const fetchData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      setStores(getAllStores());
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const filteredAndSortedStores = useMemo(() => {
    let processedStores = [...stores];

    if (searchTerm) {
      processedStores = processedStores.filter(store =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
        // Keep original order or apply a default sort if necessary
        break;
    }
    return processedStores;
  }, [stores, searchTerm, sortBy]);

  return (
    <div className="space-y-8">
      <section className="text-center py-10 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg shadow">
        <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
          Welcome to StoreSpot
        </h1>
        <p className="mt-4 text-lg text-foreground/80 md:text-xl">
          Discover a world of unique stores and services, all in one place.
        </p>
      </section>

      <StoreFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="p-4 border rounded-lg bg-card">
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
      ) : filteredAndSortedStores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedStores.map(store => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-foreground">No Stores Found</h2>
          <p className="mt-2 text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
