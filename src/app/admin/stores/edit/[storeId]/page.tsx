
import { StoreForm } from '@/components/admin/StoreForm';
import { updateStoreAction } from '../../../actions';
import { getStoreById } from '@/lib/placeholder-data';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Store, Feature } from '@/lib/types';

interface EditStorePageProps {
  params: { storeId: string };
}

export async function generateMetadata({ params }: EditStorePageProps): Promise<Metadata> {
  const store = getStoreById(params.storeId);
  if (!store) {
    return { title: 'Κέντρο Δεν Βρέθηκε | Amaxakis Admin' };
  }
  return {
    title: `Επεξεργασία: ${store.name} | Amaxakis Admin`,
    description: `Επεξεργαστείτε τις λεπτομέρειες για το κέντρο ${store.name}.`,
  };
}

export default function EditStorePage({ params }: EditStorePageProps) {
  const storeData = getStoreById(params.storeId);

  if (!storeData) {
    notFound(); 
  }
  
  // Create a serializable version of the store for the form
  // by converting icon components in features to string representations.
  const storeForForm: Store = {
    ...storeData,
    features: storeData.features.map(feature => {
      let iconRepresentation: string | undefined = undefined;
      if (typeof feature.icon === 'function') {
        // Attempt to get a name from the component.
        // For Lucide icons, displayName is typically available.
        iconRepresentation = (feature.icon as any).displayName || (feature.icon as Function).name || 'LucideIconComponent';
      } else if (typeof feature.icon === 'string') {
        iconRepresentation = feature.icon;
      }
      return {
        ...feature,
        icon: iconRepresentation, // Now icon is string | undefined, which is serializable
      };
    }),
  };

  // Bind the storeId to the server action
  const updateStoreActionWithId = updateStoreAction.bind(null, params.storeId);

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" asChild>
                <Link href="/admin/stores">
                    <ArrowLeft className="h-4 w-4" />
                     <span className="sr-only">Πίσω στα Κέντρα</span>
                </Link>
            </Button>
            <h1 className="text-2xl font-semibold">Επεξεργασία Κέντρου</h1>
        </div>
      <StoreForm store={storeForForm} action={updateStoreActionWithId} />
    </div>
  );
}

