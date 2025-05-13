
"use client";

import React from 'react';
import { StoreCategories, TranslatedStoreCategories } from '@/lib/types';
import { CategoryCard } from '@/components/category/CategoryCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center py-10 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg shadow">
        <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
          Καλώς ήρθατε στην Amaxakis
        </h1>
        <p className="mt-4 text-lg text-foreground/80 md:text-xl">
          Επιλέξτε μια κατηγορία για να βρείτε εξειδικευμένα κέντρα εξυπηρέτησης.
        </p>
      </section>

      <div className="mb-8 p-6 bg-card rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-center mb-6 text-primary">Εξερεύνηση Κατηγοριών</h2>
        {StoreCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {StoreCategories.map((categorySlug, index) => (
              <CategoryCard
                key={categorySlug}
                categorySlug={categorySlug}
                translatedCategoryName={TranslatedStoreCategories[index]}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-foreground">Δεν Βρέθηκαν Κατηγορίες</h2>
            <p className="mt-2 text-muted-foreground">
              Δεν υπάρχουν διαθέσιμες κατηγορίες αυτή τη στιγμή.
            </p>
          </div>
        )}
      </div>
       {/* Removed StoreFilters as they are not relevant for category selection view */}
       {/* Removed store listing logic as per new requirement */}
    </div>
  );
}

