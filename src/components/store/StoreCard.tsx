
import type { Store } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, ArrowRight, MapPin } from 'lucide-react'; // Added MapPin

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <CardHeader className="flex-row items-start gap-4 p-4">
        <Image
          src={store.logoUrl}
          alt={`${store.name} logo`}
          width={64}
          height={64}
          className="rounded-lg border"
          data-ai-hint="logo"
        />
        <div>
          <CardTitle className="text-xl mb-1">{store.name}</CardTitle>
          <div className="flex flex-col text-sm text-muted-foreground">
            {store.rating && store.rating > 0 && (
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                {store.rating.toFixed(1)}
              </div>
            )}
            {store.distance !== undefined && (
              <div className="flex items-center mt-1">
                <MapPin className="w-4 h-4 mr-1 text-blue-500" />
                {store.distance.toFixed(1)} km μακριά
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        <CardDescription className="line-clamp-3 text-sm">{store.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full" variant="outline">
          <Link href={`/stores/${store.id}`}>
            Προβολή Καταστήματος <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
