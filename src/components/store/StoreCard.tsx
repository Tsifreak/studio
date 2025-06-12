import type { Store } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle
} from '@/components/ui/card';
import { MapPin, Star } from 'lucide-react';

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-transform duration-300 hover:scale-[1.02] h-full rounded-lg text-sm">
      {/* Banner */}
      {store.bannerUrl && (
        <div className="relative w-full h-20">
          <Image
            src={store.bannerUrl}
            alt={`${store.name} banner`}
            layout="fill"
            objectFit="cover"
            className="object-cover"
          />
        </div>
      )}

      <CardHeader className="p-3 pb-0">
        <div className="flex items-start gap-3">
          {/* Logo + Rating */}
          <div className="flex flex-col items-start min-w-[56px]">
            <div className="relative w-14 h-14">
              <Image
                src={store.logoUrl}
                alt={`${store.name} logo`}
                layout="fill"
                objectFit="contain"
                className="rounded-md border"
              />
            </div>
            {store.rating && store.rating > 0 && (
  <div className="flex items-center text-yellow-500 mt-2 ml-1">
    <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
    {store.rating.toFixed(1)}
  </div>
)}
          </div>

          {/* Store Info */}
          <div className="flex flex-col gap-0.5 flex-grow">
            <CardTitle className="text-base font-semibold text-gray-800">{store.name}</CardTitle>

            {store.categories?.length > 0 && (
              <div className="text-xs text-blue-600 font-medium flex flex-wrap gap-1">
                {store.categories.map(cat => (
                  <span key={cat} className="hover:underline cursor-pointer">
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </span>
                ))}
              </div>
            )}

            {store.distance !== undefined && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <MapPin className="w-4 h-4 mr-1 text-blue-500" />
                {store.distance.toFixed(1)} km μακριά
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-2 flex-grow">
        <CardDescription className="line-clamp-3 text-xs text-gray-600 leading-relaxed">
          {store.description}
        </CardDescription>
      </CardContent>

      <CardFooter className="p-3 pt-0">
        <Link
          href={`/stores/${store.id}`}
          className="w-full inline-block text-center bg-blue-600 text-white font-medium py-2 px-3 rounded-full shadow-sm hover:bg-blue-700 transition"
        >
          Προβολή Καταστήματος
        </Link>
      </CardFooter>
    </Card>
  );
}
