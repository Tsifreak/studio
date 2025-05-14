
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { RenderFeatureIcon } from '@/components/store/RenderFeatureIcon'; // Import RenderFeatureIcon

interface CategoryCardProps {
  categorySlug: string;
  translatedCategoryName: string;
  description: string;
  iconName?: string; // Added iconName prop
}

export function CategoryCard({ categorySlug, translatedCategoryName, description, iconName }: CategoryCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <CardHeader className="pb-3 pt-4 text-center">
        <div className="flex flex-col items-center gap-3">
          {iconName && (
            <RenderFeatureIcon iconName={iconName} className="h-12 w-12 mb-2 text-primary" />
          )}
          <CardTitle className="text-2xl font-bold text-[hsl(217,54%,18%)]">{translatedCategoryName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 text-center">
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
