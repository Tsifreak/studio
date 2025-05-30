import { StoreForm } from '@/components/admin/StoreForm';
import { updateStoreAction } from '@/app/admin/actions'; // Adjust path if necessary
import { getStoreByIdFromDB } from '@/lib/storeService';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Store, Feature, SerializedStore, SerializedFeature, StoreCategory } from '@/lib/types';
import { Timestamp, GeoPoint } from 'firebase/firestore';

// IMPORTANT CHANGE: Allow params to be a Promise, as Next.js might pass it this way
interface EditStorePageProps {
    params: Promise<{ storeId: string }> | { storeId: string };
}

// Helper function to deeply serialize Firebase data to plain JavaScript objects
function serializeFirestoreData(obj: any): any {
    if (obj == null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Timestamp) {
        return obj.toDate().toISOString();
    }

    if (obj instanceof GeoPoint) {
        return { latitude: obj.latitude, longitude: obj.longitude };
    }

    if (Array.isArray(obj)) {
        return obj.map(serializeFirestoreData);
    }

    const serializedObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            serializedObj[key] = serializeFirestoreData(obj[key]);
        }
    }
    return serializedObj;
}

export async function generateMetadata({ params }: EditStorePageProps): Promise<Metadata> {
    // Await params to ensure it's resolved before accessing properties
    const resolvedParams = await params;
    const store = await getStoreByIdFromDB(resolvedParams.storeId);
    if (!store) {
        return { title: 'Κέντρο Δεν Βρέθηκε | Amaxakis Admin' };
    }
    return {
        title: `Επεξεργασία: ${store.name} | Amaxakis Admin`,
        description: `Επεξεργαστείτε τις λεπτομέρειες για το κέντρο ${store.name}.`,
    };
}

export default async function EditStorePage({ params }: EditStorePageProps) {
    // Await params to ensure it's resolved before accessing properties
    const resolvedParams = await params;
    const storeData = await getStoreByIdFromDB(resolvedParams.storeId);

    if (!storeData) {
        notFound();
    }

    // Serialize the storeData, including Timestamp conversion
    const serializedStoreData = serializeFirestoreData(storeData);

    const storeForForm: SerializedStore = {
        ...serializedStoreData, // Use the serialized data here
        features: (serializedStoreData.features || []).map((feature: any): SerializedFeature => { // Explicitly cast feature to any
            const iconName = typeof feature.icon === 'string' ? feature.icon : undefined;
            return {
                id: feature.id,
                name: feature.name,
                description: feature.description,
                icon: iconName,
            };
        }),
        categories: serializedStoreData.categories || [],
        services: serializedStoreData.services || [],
        availability: serializedStoreData.availability || [],
        location: serializedStoreData.location, // Keep the location as is, assuming it's already plain data
    };

    // Use resolvedParams.storeId for binding, ensuring it's always a string
    const updateStoreActionWithId = updateStoreAction.bind(null, resolvedParams.storeId);

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