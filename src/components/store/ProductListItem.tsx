
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProductListItemProps {
  product: Product;
}

export function ProductListItem({ product }: ProductListItemProps) {
  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="p-0">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={300}
          height={200}
          className="object-cover w-full h-48"
          data-ai-hint="product image"
        />
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-lg mb-1">{product.name}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {product.description}
        </CardDescription>
        <p className="text-lg font-semibold text-primary">{product.price}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button variant="outline" className="w-full">Προβολή Υπηρεσίας</Button>
      </CardFooter>
    </Card>
  );
}

