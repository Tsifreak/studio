
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
    <Link 
      href={`/category/${encodeURIComponent(categorySlug)}`} 
      className="block h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl max-w-sm mx-auto" 
      aria-label={`Προβολή κατηγορίας ${translatedCategoryName}`}
    >
      <Card className="flex flex-col items-center justify-center text-center overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 h-full p-3 relative min-h-[130px] md:min-h-[145px] rounded-2xl">
        {/* Icon and Name - Always Visible */}
        <div className="transition-opacity duration-300 group-hover:opacity-0 absolute inset-0 flex flex-col items-center justify-center p-3">
          {iconName && (
            <RenderFeatureIcon iconName={iconName} className="h-10 w-10 md:h-12 md:w-12 mb-2 text-primary" />
          )}
          <CardTitle className="text-base md:text-lg font-bold text-[hsl(217,54%,18%)]">
            {translatedCategoryName}
          </CardTitle>
        </div>

        {/* Description - Visible on Hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute inset-0 flex flex-col items-center justify-center p-3 bg-card/95 backdrop-blur-sm rounded-2xl">
           {iconName && ( // Optional: Show icon dimmed in background on hover
            <RenderFeatureIcon iconName={iconName} className="h-12 w-12 md:h-14 md:w-14 mb-1 text-primary/30" />
          )}
          <CardTitle className="text-base md:text-lg font-bold text-[hsl(217,54%,18%)] mb-1.5">
            {translatedCategoryName}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground line-clamp-3">
            {description}
          </CardDescription>
        </div>
      </Card>
    </Link>
  );
}
