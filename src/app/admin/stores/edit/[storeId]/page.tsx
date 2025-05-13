
import { StoreForm } from '@/components/admin/StoreForm';
import { updateStoreAction } from '../../../actions';
import { getStoreByIdFromDB } from '@/lib/storeService'; // Changed import
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Store, Feature, SerializedStore, SerializedFeature } from '@/lib/types';

interface EditStorePageProps {
  params: { storeId: string };
}

// generateMetadata now needs to be async as getStoreByIdFromDB fetches from DB
export async function generateMetadata({ params }: EditStorePageProps): Promise<Metadata> {
  const store = await getStoreByIdFromDB(params.storeId); // Use direct DB fetch
  if (!store) {
    return { title: 'Κέντρο Δεν Βρέθηκε | Amaxakis Admin' };
  }
  return {
    title: `Επεξεργασία: ${store.name} | Amaxakis Admin`,
    description: `Επεξεργαστείτε τις λεπτομέρειες για το κέντρο ${store.name}.`,
  };
}

// The page component also needs to be async
export default async function EditStorePage({ params }: EditStorePageProps) {
  const storeData = await getStoreByIdFromDB(params.storeId); // Use direct DB fetch

  if (!storeData) {
    notFound(); 
  }
  
  // Assuming storeData.features from DB already contains icon names as strings.
  // The SerializedStore type expects features to be SerializedFeature[]
  const storeForForm: SerializedStore = {
    ...storeData,
    features: storeData.features.map((feature: Feature | SerializedFeature): SerializedFeature => { // Accept Feature or SerializedFeature
      const iconName = typeof feature.icon === 'string' ? feature.icon : undefined;
      return {
        id: feature.id,
        name: feature.name,
        description: feature.description,
        icon: iconName,
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
