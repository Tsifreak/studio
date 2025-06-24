import { StoreForm } from '@/components/admin/StoreForm';
import { updateStoreAction } from '@/app/admin/actions';
import { getStoreByIdFromDB } from '@/lib/storeService';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Store, Feature, SerializedStore, SerializedFeature } from '@/lib/types';
// Import GeoPoint if getStoreByIdFromDB could return it directly from Firebase client SDK
// or ensure your Store type uses the correct GeoPoint type.
// For admin SDK GeoPoint, typically it's 'firebase-admin/firestore's GeoPoint
import { GeoPoint } from 'firebase/firestore'; // Assuming this is client-side GeoPoint if getStoreByIdFromDB uses client SDK

interface EditStorePageProps {
    params: Promise<{ storeId: string }> | { storeId: string };
}

// NOTE: The serializeFirestoreData helper function is NOT needed if getStoreByIdFromDB
// already returns data in a client-ready format or if it's handled in actions.ts.
// Let's remove it to simplify and prevent conflicts.
// The transformation from raw DB data to SerializedStore should primarily happen
// in serializeStoreForClient in actions.ts.

export async function generateMetadata({ params }: EditStorePageProps): Promise<Metadata> {
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
    const resolvedParams = await params;
    // CRITICAL: Ensure getStoreByIdFromDB returns data in a format compatible with Store type
    // and ideally already serialized for the client, or you handle it explicitly here.
    // Given the previous logs, getStoreByIdFromDB probably returns raw Firestore data.
    const storeData = await getStoreByIdFromDB(resolvedParams.storeId);

    if (!storeData) {
        notFound();
    }

    // Explicitly construct the SerializedStore object based on the StoreData received.
    // All transformations (like Timestamp to string, GeoPoint to object) should happen here
    // or within getStoreByIdFromDB if it's responsible for client-side serialization.
    // If getStoreByIdFromDB already returns SerializedStore, this mapping is redundant.
    const storeForForm: SerializedStore = {
        id: storeData.id,
        name: storeData.name,
        logoUrl: storeData.logoUrl || '',
        bannerUrl: storeData.bannerUrl || '',
        description: storeData.description,
        longDescription: storeData.longDescription ?? '',
        rating: storeData.rating ?? 0,
        tags: storeData.tags || [],
        contactEmail: storeData.contactEmail ?? '',
        websiteUrl: storeData.websiteUrl ?? '',
        address: storeData.address ?? '',
        ownerId: storeData.ownerId ?? '',
        pricingPlans: storeData.pricingPlans || [],
        products: storeData.products || [],
        features: (storeData.features || []).map(feature => ({
            id: feature.id,
            name: feature.name,
            description: feature.description,
            icon: typeof feature.icon === 'string' ? feature.icon : undefined,
        })),
        // REVERTED REVIEW DATE HANDLING: Assuming reviews are already serialized in actions.ts
        // or handled by storeService. If not, this is where you'd convert Timestamps to ISO strings.
        // For now, it's safer to assume storeData.reviews contains compatible data.
        reviews: storeData.reviews || [], // Assuming reviews are compatible
        categories: storeData.categories || [],
        services: storeData.services || [],
        availability: storeData.availability || [],
        // Location: Ensure GeoPoint from DB is converted to a plain object
        location: (storeData.location && typeof storeData.location.latitude === 'number' && typeof storeData.location.longitude === 'number')
                  ? { latitude: storeData.location.latitude, longitude: storeData.location.longitude }
                  : undefined, // Or handle if it's a GeoPoint instance from getStoreByIdFromDB
        specializedBrands: storeData.specializedBrands || [],
        tyreBrands: storeData.tyreBrands || [],
        iconType: (typeof storeData.iconType === 'string' && (storeData.iconType === 'verified' || storeData.iconType === 'premium'))
                  ? storeData.iconType
                  : undefined,
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