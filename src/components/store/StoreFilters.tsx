"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowUpDown, Filter as FilterIcon } from 'lucide-react';
import { AppCategories } from '@/lib/types'; // Correctly import AppCategories

// Define tyre brands locally
const tyreBrands = [
  'Michelin', 'Goodyear', 'Pirelli', 'Continental', 'Bridgestone',
  'Dunlop', 'Hankook', 'Falken', 'Toyo', 'Yokohama',
  'Kumho', 'Nexen', 'Cooper', 'BFGoodrich', 'Firestone',
  'General Tire', 'Kleber', 'Vredestein', 'Nokian', 'Barum',
  'Semperit', 'Uniroyal', 'Sava', 'Kormoran', 'Debica'
];

interface StoreFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  selectedCategory: string; // Can be "all" or a category slug
  onCategoryChange: (category: string) => void;
  selectedTyreBrand: string;
  onTyreBrandChange: (brand: string) => void;
}

export function StoreFilters({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  selectedCategory,
  onCategoryChange,
  selectedTyreBrand,
  onTyreBrandChange,
}: StoreFiltersProps) {
  return (
    <div className="mb-8 p-6 bg-card rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <label htmlFor="search" className="text-sm font-medium text-foreground">Αναζήτηση Καταστημάτων</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Αναζήτηση βάσει ονόματος ή περιγραφής..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="sort" className="text-sm font-medium text-foreground">Ταξινόμηση κατά</label>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger id="sort" className="w-full">
              <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Ταξινόμηση καταστημάτων" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating_desc">Βαθμολογία: Υψηλή προς Χαμηλή</SelectItem>
              <SelectItem value="rating_asc">Βαθμολογία: Χαμηλή προς Υψηλή</SelectItem>
              <SelectItem value="name_asc">Όνομα: Α προς Ω</SelectItem>
              <SelectItem value="name_desc">Όνομα: Ω προς Α</SelectItem>
              <SelectItem value="default">Προεπιλογή</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
            <label htmlFor="category-filter" className="text-sm font-medium text-foreground">Φίλτρο ανά Κατηγορία</label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
                <SelectTrigger id="category-filter">
                    <FilterIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Όλες οι Κατηγορίες" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Όλες οι Κατηγορίες</SelectItem>
                    {/* Use AppCategories to map over for category filter */}
                    {AppCategories.map((category) => (
                        <SelectItem key={category.slug} value={category.slug}>{category.translatedName}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {/* New Tyre Brand Filter */}
        <div className="space-y-2">
          <label htmlFor="tyre-brand-filter" className="text-sm font-medium text-foreground">Φίλτρο ανά Brands Ελαστικών</label>
          <Select value={selectedTyreBrand} onValueChange={onTyreBrandChange}>
            <SelectTrigger id="tyre-brand-filter">
              <FilterIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Όλα τα Brands Ελαστικών" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλα τα Brands Ελαστικών</SelectItem>
              {/* Populate with actual tyre brands */}
              {tyreBrands.map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}