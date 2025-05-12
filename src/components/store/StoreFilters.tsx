
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowUpDown, Filter as FilterIcon } from 'lucide-react';

interface StoreFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  // Placeholder for actual filter options
  // filterOptions: string[]; 
  // selectedFilters: string[];
  // onFilterChange: (filters: string[]) => void;
}

export function StoreFilters({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
}: StoreFiltersProps) {
  return (
    <div className="mb-8 p-6 bg-card rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <label htmlFor="search" className="text-sm font-medium text-foreground">Search Stores</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="sort" className="text-sm font-medium text-foreground">Sort By</label>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger id="sort" className="w-full">
              <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Sort stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating_desc">Rating: High to Low</SelectItem>
              <SelectItem value="rating_asc">Rating: Low to High</SelectItem>
              <SelectItem value="name_asc">Name: A to Z</SelectItem>
              <SelectItem value="name_desc">Name: Z to A</SelectItem>
              <SelectItem value="default">Default</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Placeholder for more complex filters */}
        <div className="space-y-2">
            <label htmlFor="category-filter" className="text-sm font-medium text-foreground">Filter by Category (Example)</label>
            <Select disabled> {/* Disabled for now, can be enabled with functionality */}
                <SelectTrigger id="category-filter">
                    <FilterIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="groceries">Groceries</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="handmade">Handmade</SelectItem>
                    <SelectItem value="fitness">Fitness</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
    </div>
  );
}
