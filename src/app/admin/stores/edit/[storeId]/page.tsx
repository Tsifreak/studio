
import { StoreForm } from '@/components/admin/StoreForm';
import { updateStoreAction } from '../../../actions';
import { getStoreByIdFromDB } from '@/lib/storeService'; 
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Store, Feature, SerializedStore, SerializedFeature, StoreCategory } from '@/lib/types';

interface EditStorePageProps {
  params: { storeId: string };
}

export async function generateMetadata({ params }: EditStorePageProps): Promise<Metadata> {
  const store = await getStoreByIdFromDB(params.storeId); 
  if (!store) {
    return { title: 'Κέντρο Δεν Βρέθηκε | Amaxakis Admin' };
  }
  return {
    title: `Επεξεργασία: ${store.name} | Amaxakis Admin`,
    description: `Επεξεργαστείτε τις λεπτομέρειες για το κέντρο ${store.name}.`,
  };
}

export default async function EditStorePage({ params }: EditStorePageProps) {
  const storeData = await getStoreByIdFromDB(params.storeId); 

  if (!storeData) {
    notFound(); 
  }
  
  // Ensure categories is an array, even if it's undefined or null in Firestore
  const categoriesForForm: StoreCategory[] = storeData.categories && Array.isArray(storeData.categories) 
    ? storeData.categories 
    : [];

  const storeForForm: SerializedStore = {
    ...storeData,
    features: storeData.features.map((feature: Feature | SerializedFeature): SerializedFeature => {
      const iconName = typeof feature.icon === 'string' ? feature.icon : undefined;
      return {
        id: feature.id,
        name: feature.name,
        description: feature.description,
        icon: iconName,
      };
    }),
    categories: categoriesForForm, // Pass the processed categories array
    services: storeData.services || [],
    availability: storeData.availability || [],
  };

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
