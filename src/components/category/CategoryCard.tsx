
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Button and ArrowRight are no longer needed
import { RenderFeatureIcon } from '@/components/store/RenderFeatureIcon'; 

interface CategoryCardProps {
  categorySlug: string;
  translatedCategoryName: string;
  description: string;
  iconName?: string; 
}

export function CategoryCard({ categorySlug, translatedCategoryName, description, iconName }: CategoryCardProps) {
  return (
    <Link href={`/category/${encodeURIComponent(categorySlug)}`} className="block h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg" aria-label={`Προβολή κατηγορίας ${translatedCategoryName}`}>
      <Card className="flex flex-col items-center justify-center text-center overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 h-full p-6 relative min-h-[180px] md:min-h-[200px]">
        {/* Icon and Name - Always Visible */}
        <div className="transition-opacity duration-300 group-hover:opacity-0 absolute inset-0 flex flex-col items-center justify-center p-4">
          {iconName && (
            <RenderFeatureIcon iconName={iconName} className="h-14 w-14 md:h-16 md:w-16 mb-3 text-primary" />
          )}
          <CardTitle className="text-xl md:text-2xl font-bold text-[hsl(217,54%,18%)]">
            {translatedCategoryName}
          </CardTitle>
        </div>

        {/* Description - Visible on Hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute inset-0 flex flex-col items-center justify-center p-4 bg-card/95 backdrop-blur-sm">
           {iconName && ( // Optional: Show icon dimmed in background on hover
            <RenderFeatureIcon iconName={iconName} className="h-16 w-16 md:h-20 md:w-20 mb-2 text-primary/30" />
          )}
          <CardTitle className="text-xl md:text-2xl font-bold text-[hsl(217,54%,18%)] mb-2">
            {translatedCategoryName}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground line-clamp-3">
            {description}
          </CardDescription>
        </div>
      </Card>
    </Link>
  );
}
