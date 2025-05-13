
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Tag } from 'lucide-react'; // Using Tag icon as a generic category icon

interface CategoryCardProps {
  categorySlug: string;
  translatedCategoryName: string;
}

export function CategoryCard({ categorySlug, translatedCategoryName }: CategoryCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Tag className="w-8 h-8 text-primary" />
          <CardTitle className="text-xl">{translatedCategoryName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center items-center p-4">
        {/* You can add a short description for each category here if available */}
        {/* <p className="text-sm text-muted-foreground text-center mb-4">
          Βρείτε τους καλύτερους {translatedCategoryName.toLowerCase()} στην περιοχή σας.
        </p> */}
      </CardContent>
      <div className="p-4 pt-0">
        <Button asChild className="w-full" variant="outline">
          <Link href={`/category/${encodeURIComponent(categorySlug)}`}>
            Προβολή Κέντρων <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
