"use client";

import type { Store } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle
} from '@/components/ui/card';
import { MapPin, Star, Heart } from 'lucide-react';
import VerifiedIconComponent from '@/components/icons/VerifiedIconComponent';
import PremiumIconComponent from '@/components/icons/PremiumIconComponent';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { toggleSavedStore } from '@/app/stores/[storeId]/actions';
import { useToast } from "@/hooks/use-toast";

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  // ✅ Always run hooks
  useEffect(() => {
    if (status === "authenticated" && userId) {
      setIsSaved(store.savedByUsers?.includes(userId) ?? false);
    }
  }, [status, userId, store.savedByUsers]);

  if (status === "loading") return null;

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      toast({
        title: "Απαιτείται Σύνδεση",
        description: "Πρέπει να συνδεθείτε για να αποθηκεύσετε κέντρα.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaved(prev => !prev); // optimistic update
      const result = await toggleSavedStore(store.id, userId, isSaved);

      if (!result.success) {
        setIsSaved(prev => !prev); // rollback
        toast({ title: "Σφάλμα", description: result.message, variant: "destructive" });
      } else {
        toast({ title: "Επιτυχία", description: result.message });
      }
    } catch (error) {
      setIsSaved(prev => !prev); // rollback
      console.error("Error toggling saved store:", error);
      toast({
        title: "Σφάλμα",
        description: "Παρουσιάστηκε απροσδόκητο σφάλμα κατά την αποθήκευση.",
        variant: "destructive",
      });
    }
  };
  console.log("[DEBUG] session", session);
  console.log("[DEBUG] status", status);
  console.log("[DEBUG] userId", userId);
  console.log("[DEBUG] store.bannerUrl", store.bannerUrl);
  console.log("[DEBUG] store.savedByUsers", store.savedByUsers);
  
  return (
    <Card className="relative flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-transform duration-300 hover:scale-[1.02] h-full rounded-lg text-sm">
      {/* Banner with Save Button */}
      {store.bannerUrl && (
        <div className="relative w-full h-20">
          <Image
            src={store.bannerUrl}
            alt={`${store.name} banner`}
            fill
            className="object-cover"
          />

          {/* Save Button positioned over banner */}
          {status === 'authenticated' && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1.5 right-1.5 z-20 text-muted-foreground hover:text-red-500 hover:bg-white/20 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full transition-colors !w-8 !h-8"              onClick={handleToggleSave}
              aria-label={isSaved ? "Unsave store" : "Save store"}
            >
              <Heart className={cn("w-5 h-5", isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
            </Button>
          )}
        </div>
      )}

      {/* Verified / Premium Icon */}
      {(store.iconType === 'verified' || store.iconType === 'premium') && (
        <div className="absolute top-12 right-0 z-10 p-1">
          {store.iconType === 'verified' && <VerifiedIconComponent className="w-24 h-16 store-icon" />}
          {store.iconType === 'premium' && <PremiumIconComponent className="w-28 h-16 store-icon" />}
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
                fill
                className="rounded-md border object-contain"
              />
            </div>
            {store.rating && store.rating > 0 && (
              <div className="flex items-center text-orange-400 font-bold mt-2 ml-1">
                <Star className="w-4 h-4 mr-1 fill-orange-400 text-orange-400" />
                {store.rating.toFixed(1)}
              </div>
            )}
          </div>

          {/* Store Info */}
          <div className="flex flex-col gap-0.5 flex-grow">
            <CardTitle className="text-base font-semibold text-gray-800">
              {store.name}
            </CardTitle>
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

      <CardFooter className="p-3 pt-0 flex justify-center">
        <Link
          href={`/stores/${store.id}`}
          className="w-48 inline-block text-center bg-blue-600 text-white font-medium py-2 px-4 rounded-full shadow-sm hover:bg-blue-700 transition"
        >
          Προβολή
        </Link>
      </CardFooter>
    </Card>
  );
}
