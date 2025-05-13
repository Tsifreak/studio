
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { RenderFeatureIcon } from '@/components/store/RenderFeatureIcon'; // Re-use for consistency

interface CategoryCardProps {
  categorySlug: string;
  translatedCategoryName: string;
  description: string; // New prop for short description
  iconName?: string; // Optional icon name
}

export function CategoryCard({ categorySlug, translatedCategoryName, description, iconName }: CategoryCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center gap-3">
          {iconName && <RenderFeatureIcon iconName={iconName} className="w-7 h-7 text-primary" />}
          <CardTitle className="text-lg font-semibold">{translatedCategoryName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0">
        <CardDescription className="text-sm text-muted-foreground">
          {description}
        </CardDescription>
      </CardContent>
      <div className="p-4 pt-2">
        <Button asChild className="w-full" variant="outline">
          <Link href={`/category/${encodeURIComponent(categorySlug)}`}>
            Προβολή Κέντρων <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
