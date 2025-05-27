
import { getAllStoresFromDB } from '@/lib/storeService';
import type { Store, StoreCategory } from '@/lib/types';
import { AppCategories } from '@/lib/types'; 
import { StoreCard } from '@/components/store/StoreCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';

interface CategoryPageProps {
  params: { categorySlug: string };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const categorySlug = decodeURIComponent(params.categorySlug);
  const categoryInfo = AppCategories.find(cat => cat.slug === categorySlug);
  
  if (!categoryInfo) {
    return {
      title: 'Κατηγορία Δεν Βρέθηκε | Amaxakis',
      description: 'Η κατηγορία που αναζητάτε δεν υπάρχει.',
    };
  }
  
  return {
    title: `Κέντρα: ${categoryInfo.translatedName} | Amaxakis`,
    description: `Βρείτε τα καλύτερα κέντρα εξυπηρέτησης στην κατηγορία ${categoryInfo.translatedName}.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const categorySlug = decodeURIComponent(params.categorySlug) as StoreCategory;

  const categoryInfo = AppCategories.find(cat => cat.slug === categorySlug);

  if (!categoryInfo) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-primary mb-4">Η Κατηγορία δεν Βρέθηκε</h1>
        <p className="text-md text-muted-foreground mb-6">
          Η κατηγορία "{categorySlug}" δεν είναι έγκυρη.
        </p>
        <Button asChild>
          <Link href="/">Επιστροφή στις Κατηγορίες</Link>
        </Button>
      </div>
    );
  }

  const translatedCategoryName = categoryInfo.translatedName;
  const allStores = await getAllStoresFromDB();
  // Filter stores to include those that have the current categorySlug in their 'categories' array
  const storesInCategory = allStores.filter(store => store.categories && store.categories.includes(categorySlug));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold text-primary">
            Κέντρα στην κατηγορία: {translatedCategoryName}
            </h1>
            <p className="text-muted-foreground">
            Εξερευνήστε τα κέντρα εξυπηρέτησης που ανήκουν σε αυτή την κατηγορία.
            </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Πίσω στις Κατηγορίες
          </Link>
        </Button>
      </div>

      {storesInCategory.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storesInCategory.map(store => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-2xl font-semibold text-foreground mt-4">Δεν Βρέθηκαν Κέντρα</h2>
          <p className="mt-2 text-muted-foreground">
            Δεν υπάρχουν καταχωρημένα κέντρα εξυπηρέτησης για την κατηγορία "{translatedCategoryName}" αυτή τη στιγμή.
          </p>
        </div>
      )}
    </div>
  );
}
