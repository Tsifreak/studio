
import { StoreForm } from '@/components/admin/StoreForm';
import { updateStoreAction } from '../../../actions';
import { getStoreById } from '@/lib/placeholder-data';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

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
  const store = getStoreById(params.storeId);

  if (!store) {
    notFound(); // Or show a custom "Store not found" message within admin layout
  }
  
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
      <StoreForm store={store} action={updateStoreActionWithId} />
    </div>
  );
}
