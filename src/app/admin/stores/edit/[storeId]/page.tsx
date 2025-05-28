
import { StoreForm } from '@/components/admin/StoreForm';
import { updateStoreAction } from '../../../actions';
import { getStoreByIdFromDB } from '@/lib/storeService';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Store, Feature, SerializedStore, SerializedFeature, StoreCategory } from '@/lib/types';
import { Timestamp } from 'firebase/firestore'; // Import Client SDK Timestamp

interface EditStorePageProps {
    params: { storeId: string };
}

// Helper function to serialize Firebase Timestamps to ISO strings
function serializeFirestoreData(obj: any): any {
    if (obj == null || typeof obj !== 'object') {
        return obj;
    }

    // Check for Client SDK Timestamp instance
    if (obj instanceof Timestamp) {
        return obj.toDate().toISOString();
    }

    // Check for Admin SDK-like plain object with _seconds and _nanoseconds
    if (Object.prototype.hasOwnProperty.call(obj, '_seconds') && typeof obj._seconds === 'number' &&
        Object.prototype.hasOwnProperty.call(obj, '_nanoseconds') && typeof obj._nanoseconds === 'number') {
        return new Date(obj._seconds * 1000 + obj._nanoseconds / 1000000).toISOString();
    }
    
    // Check for Client SDK-like plain object with seconds and nanoseconds (e.g., after JSON.stringify/parse)
    if (Object.prototype.hasOwnProperty.call(obj, 'seconds') && typeof obj.seconds === 'number' &&
        Object.prototype.hasOwnProperty.call(obj, 'nanoseconds') && typeof obj.nanoseconds === 'number') {
        return new Date(obj.seconds * 1000 + obj.nanoseconds / 1000000).toISOString();
    }

    if (Array.isArray(obj)) {
        return obj.map(item => serializeFirestoreData(item));
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
    const storeData = await getStoreByIdFromDB(params.storeId);
    if (!storeData) {
        return { title: 'Κέντρο Δεν Βρέθηκε | Amaxakis Admin' };
    }
    // Use the local serializeFirestoreData for the name in metadata if it contains Timestamps (unlikely for name)
    // However, it's safer to just use the fetched name directly as mapDocToStore should handle basic fields.
    const nameForMetadata = storeData.name;
    return {
        title: `Επεξεργασία: ${nameForMetadata} | Amaxakis Admin`,
        description: `Επεξεργαστείτε τις λεπτομέρειες για το κέντρο ${nameForMetadata}.`,
    };
}

export default async function EditStorePage({ params }: EditStorePageProps) {
    const storeData = await getStoreByIdFromDB(params.storeId); // mapDocToStore should have handled review dates.

    if (!storeData) {
        notFound();
    }

    // Apply the robust serialization to the entire storeData object.
    // This ensures all potential Timestamp-like objects are converted.
    const serializedStoreData = serializeFirestoreData(storeData);

    // Ensure categories is an array, even if it's undefined or null
    const categoriesForForm: StoreCategory[] = serializedStoreData.categories && Array.isArray(serializedStoreData.categories)
        ? serializedStoreData.categories
        : [];

    // Ensure reviews are correctly processed if they exist
    const reviewsForForm = Array.isArray(serializedStoreData.reviews) 
        ? serializedStoreData.reviews 
        : [];

    const storeForForm: SerializedStore = {
        ...(serializedStoreData as Omit<Store, 'features' | 'reviews' | 'categories' | 'services' | 'availability' | 'location'>), // Cast to avoid type issues with serialized dates
        id: serializedStoreData.id, // Ensure ID is explicitly passed
        name: serializedStoreData.name,
        logoUrl: serializedStoreData.logoUrl,
        bannerUrl: serializedStoreData.bannerUrl,
        description: serializedStoreData.description,
        longDescription: serializedStoreData.longDescription,
        rating: serializedStoreData.rating,
        tags: serializedStoreData.tags,
        contactEmail: serializedStoreData.contactEmail,
        websiteUrl: serializedStoreData.websiteUrl,
        address: serializedStoreData.address,
        ownerId: serializedStoreData.ownerId,
        pricingPlans: serializedStoreData.pricingPlans || [],
        products: serializedStoreData.products || [],
        features: (serializedStoreData.features || []).map((feature: Feature | SerializedFeature): SerializedFeature => {
            const iconName = typeof feature.icon === 'string' ? feature.icon : undefined; // Assuming icon in Store is already string or undefined
            return {
                id: feature.id,
                name: feature.name,
                description: feature.description,
                icon: iconName,
            };
        }),
        reviews: reviewsForForm, // Use the processed reviews
        categories: categoriesForForm,
        services: serializedStoreData.services || [],
        availability: serializedStoreData.availability || [],
        location: serializedStoreData.location, 
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
