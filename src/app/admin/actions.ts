"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Store, StoreCategory, StoreFormData, SerializedStore, SerializedFeature, Service, AvailabilitySlot } from '@/lib/types';
import { AppCategories, StoreCategoriesSlugs } from '@/lib/types';
import { adminDb, adminStorage, admin } from '@/lib/firebase-admin';
import type { GeoPoint as AdminGeoPoint, FieldValue } from 'firebase-admin/firestore';

const STORE_COLLECTION = 'StoreInfo';
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Define the storage bucket name using the environment variable
// This variable MUST be set to "cariera-9ba32.firebasestorage.app" in your .env.local or deployment config.
const EXPLICIT_STORAGE_BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET; //

async function uploadFileToStorage(file: File, destinationFolder: string): Promise<string> {
    if (!adminStorage) {
        console.error("[uploadFileToStorage] Firebase Admin Storage is not initialized.");
        throw new Error("Η υπηρεσία αποθήκευσης αρχείων δεν είναι διαθέσιμη.");
    }
    // Add a check for the environment variable being present
    if (!EXPLICIT_STORAGE_BUCKET_NAME) {
        console.error("[uploadFileToStorage] FIREBASE_STORAGE_BUCKET environment variable is not set or empty.");
        throw new Error("Η μεταβλητή περιβάλλοντος FIREBASE_STORAGE_BUCKET δεν έχει οριστεί.");
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new Error(`Μη υποστηριζόμενος τύπος αρχείου: ${file.type}. Επιτρέπονται: JPEG, PNG, WebP.`);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Το αρχείο είναι πολύ μεγάλο (${(file.size / 1024 / 1024).toFixed(2)}MB). Μέγιστο επιτρεπτό μέγεθος: ${MAX_FILE_SIZE_MB}MB.`);
    }
    let bucket;
    try {
        // --- CRITICAL CHANGE HERE ---
        // Explicitly specify the bucket name instead of relying on the default.
        bucket = adminStorage.bucket(EXPLICIT_STORAGE_BUCKET_NAME);
        // --- END CRITICAL CHANGE ---

        if (!bucket) {
            console.error("[uploadFileToStorage] Specified bucket not available in Admin Storage after explicit call.");
            throw new Error("Ο καθορισμένος χώρος αποθήκευσης δεν είναι διαθέσιμος.");
        }
        console.log(`[uploadFileToStorage] Using bucket explicitly: '${bucket.name}'`);
    } catch (error) {
        console.error("[uploadFileToStorage] Error accessing adminStorage.bucket() with explicit name:", error);
        throw new Error(`Σφάλμα πρόσβασης στον χώρο αποθήκευσης. Βεβαιωθείτε ότι το "${EXPLICIT_STORAGE_BUCKET_NAME}" είναι σωστό.`);
    }

    const fileName = `${destinationFolder}/${Date.now()}-${Math.random().toString(36).substring(2, 10)}-${file.name.replace(/\s+/g, '_')}`;
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.type,
        },
        public: true, // Make file public by default
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    return new Promise((resolve, reject) => {
        blobStream.on('error', (err) => {
            console.error(`[uploadFileToStorage] Error uploading to GCS (Bucket: ${bucket.name}, File: ${fileName}):`, err);
            reject(new Error(`Σφάλμα κατά το ανέβασμα του αρχείου: ${JSON.stringify(err)}`));
        });
        blobStream.on('finish', async () => {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            console.log(`[uploadFileToStorage] File uploaded to ${publicUrl}`);
            resolve(publicUrl);
        });
        blobStream.end(buffer);
    });
}

function serializeStoreForClient(store: Store): SerializedStore {
    // Determine the iconType for the client
    let clientIconType: 'verified' | 'premium' | undefined;
    if (store.iconType && typeof store.iconType === 'string') {
        // Only assign if it's one of the expected string literal values
        if (store.iconType === 'verified' || store.iconType === 'premium') {
            clientIconType = store.iconType;
        }
    }

    return {
        id: store.id,
        name: store.name,
        logoUrl: store.logoUrl || '',
        bannerUrl: store.bannerUrl || '',
        description: store.description,
        longDescription: store.longDescription ?? '',
        rating: store.rating ?? 0,
        tags: store.tags || [],
        contactEmail: store.contactEmail ?? '',
        websiteUrl: store.websiteUrl ?? '',
        address: store.address ?? '',
        ownerId: store.ownerId ?? '',
        pricingPlans: store.pricingPlans || [],
        products: store.products || [],
        features: (store.features || []).map(feature => ({
            id: feature.id,
            name: feature.name,
            description: feature.description,
            icon: typeof feature.icon === 'string' ? feature.icon : undefined,
        })),
        reviews: (store.reviews || []).map(review => {
          const date = review.date as any;
          let isoDateString: string;
          if (date && typeof date.toDate === 'function') {
            isoDateString = date.toDate().toISOString();
          } else if (date && typeof date._seconds === 'number' && typeof date._nanoseconds === 'number') {
            isoDateString = new Date(date._seconds * 1000 + date._nanoseconds / 1000000).toISOString();
          } else if (typeof date === 'string') {
            isoDateString = new Date(date).toISOString();
          } else if (date instanceof Date) {
            isoDateString = date.toISOString();
          } else {
            isoDateString = new Date().toISOString();
          }
          return { ...review, date: isoDateString };
        }),
        categories: store.categories || [],
        services: store.services || [],
        availability: store.availability || [],
        location: (store.location instanceof admin.firestore.GeoPoint) ? { latitude: store.location.latitude, longitude: store.location.longitude } :
                  (store.location && typeof store.location.latitude === 'number' && typeof store.location.longitude === 'number') ? { latitude: store.location.latitude, longitude: store.location.longitude } : undefined,
        specializedBrands: store.specializedBrands || [],
        tyreBrands: store.tyreBrands || [],
        iconType: (typeof store.iconType === 'string' && (store.iconType === 'verified' || store.iconType === 'premium'))
            ? store.iconType
            : undefined, // Ensures FieldValue.delete() or any other non-string/invalid string becomes undefined
    };
}

const serviceSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    durationMinutes: z.number().int().positive(),
    price: z.number().positive(),
    availableDaysOfWeek: z.array(z.number().int().min(0).max(6)),
    categoryId: z.string().min(1),
});
const servicesArraySchema = z.array(serviceSchema);

const availabilitySlotSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).or(z.literal('')),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).or(z.literal('')),
});
const availabilityArraySchema = z.array(availabilitySlotSchema);
const specializedBrandsSchema = z.array(z.string()).optional();
const tyreBrandsSchema = z.array(z.string()).optional();
const storeDbSchema = z.object({
    name: z.string().min(3, { message: "Το όνομα πρέπει να έχει τουλάχιστον 3 χαρακτήρες." }),
    logoUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για το λογότυπο." }).optional().or(z.literal('')),
    bannerUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για το banner." }).optional().or(z.literal('')),
    description: z.string().min(10, { message: "Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες." }),
    longDescription: z.string().optional(),
    tagsInput: z.string().optional(),
    categoriesInput: z.string().refine((val) => {
      // Allow empty string or string that parses to empty array after filtering
      if (val === '' || val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).length === 0) return true;
      const slugs = val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      return slugs.every(slug => StoreCategoriesSlugs.includes(slug));
    }, {
        message: `Μία ή περισσότερες κατηγορίες δεν είναι έγκυρες. Έγκυρες τιμές: ${StoreCategoriesSlugs.join(', ')}`,
    }).optional(),
    contactEmail: z.string().email({ message: "Παρακαλώ εισάγετε ένα έγκυρο email επικοινωνίας." }).optional().or(z.literal('')),
    websiteUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL ιστοσελίδας." }).optional().or(z.literal('')),
    latitude: z.string()
        .min(1, { message: "Το Γεωγραφικό Πλάτος είναι υποχρεωτικό." })
        .refine(val => {
            const num = parseFloat(val);
            return !isNaN(num) && num >= -90 && num <= 90;
        }, { message: "Εισάγετε ένα έγκυρο γεωγραφικό πλάτος (-90 έως 90)." }),
    longitude: z.string()
        .min(1, { message: "Το Γεωγραφικό Μήκος είναι υποχρεωτικό." })
        .refine(val => {
            const num = parseFloat(val);
            return !isNaN(num) && num >= -180 && num <= 180;
        }, { message: "Εισάγετε ένα έγκυρο γεωγραφικό μήκος (-180 έως 180)." }),
    address: z.string().optional(),
    ownerId: z.string().optional().or(z.literal('')),
    servicesJson: z.string().optional().refine((val) => {
        if (!val || val.trim() === "") return true;
        try {
            const parsed = JSON.parse(val);
            servicesArraySchema.parse(parsed);
            return true;
        } catch (e) {
            return false;
        }
    }, { message: "Μη έγκυρο JSON για τις υπηρεσίες ή δεν συμφωνεί με το σχήμα." }),
    availabilityJson: z.string().optional().refine((val) => {
        if (!val || val.trim() === "") return true;
        try {
            const parsed = JSON.parse(val);
            availabilityArraySchema.parse(parsed);
            return true;
        } catch (e) {
            return false;
        }
    }, { message: "Μη έγκυρο JSON για τη διαθεσιμότητα ή δεν συμφωνεί με το σχήμα." }),
    specializedBrands: specializedBrandsSchema,
    tyreBrands: tyreBrandsSchema,
    iconType: z.enum(['verified', 'premium']).optional().or(z.literal('')),
});

export async function addStoreAction(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }> {
    if (!adminDb || !adminStorage) {
        const errorMsg = "Σφάλμα: Το Firebase Admin SDK δεν έχει αρχικοποιηθεί σωστά.";
        console.error(`[addStoreAction] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }
    console.log("[addStoreAction] Received FormData entries:");
    const formEntries: { [key: string]: any } = {};
    for (const [key, value] of formData.entries()) {
        formEntries[key] = value;
    }
    console.log("[addStoreAction] Raw FormData entries:", formEntries);

    let logoUrlToSave: string | undefined = undefined;
    let bannerUrlToSave: string | undefined = undefined;

    const logoFile = formData.get('logoFile') as File | null;
    const bannerFile = formData.get('bannerFile') as File | null;

    try {
        if (logoFile && logoFile.size > 0) {
            logoUrlToSave = await uploadFileToStorage(logoFile, 'store-logos');
        } else {
            const storeNameForPlaceholder = formData.get('name') as string || "store";
            logoUrlToSave = `https://placehold.co/100x100.png?text=${encodeURIComponent(storeNameForPlaceholder.substring(0, 3))}`;
        }

        if (bannerFile && bannerFile.size > 0) {
            bannerUrlToSave = await uploadFileToStorage(bannerFile, 'store-banners');
        } else {
            const storeNameForPlaceholder = formData.get('name') as string || "store";
            bannerUrlToSave = `https://placehold.co/800x300.png?text=${encodeURIComponent(storeNameForPlaceholder)}`;
        }
    } catch (uploadError: any) {
        console.error("[addStoreAction] File upload error:", uploadError);
        return { success: false, message: uploadError.message || "Σφάλμα κατά το ανέβασμα αρχείου." };
    }

    const rawCategoriesInputFromForm = formData.get('categoriesInput') as string | null;
    console.log("[addStoreAction] Raw categoriesInput from FormData:", rawCategoriesInputFromForm);

    const validatedFields = storeDbSchema.safeParse({
        name: formData.get('name') as string,
        logoUrl: logoUrlToSave,
        bannerUrl: bannerUrlToSave,
        description: formData.get('description') as string,
        longDescription: formData.get('longDescription') as string || undefined,
        tagsInput: formData.get('tagsInput') as string || undefined,
        // Pass the raw string (or undefined if null) to Zod. Zod's .optional() handles undefined.
        // Zod's .refine handles empty string or valid slugs.
        categoriesInput: rawCategoriesInputFromForm === null ? undefined : String(rawCategoriesInputFromForm),
        contactEmail: formData.get('contactEmail') as string || '',
        websiteUrl: formData.get('websiteUrl') as string || '',
        latitude: formData.get('latitude') as string,
        longitude: formData.get('longitude') as string,
        address: formData.get('address') as string || undefined,
        ownerId: formData.get('ownerId') as string || '',
        servicesJson: formData.get('servicesJson') as string || '[]',
        availabilityJson: formData.get('availabilityJson') as string || '[]',
        // Assuming specializedBrands comes as FormData entry, potentially as a comma-separated string or an array (handled by form library?)
        // If it's an array of strings from the form, Zod handles it. If it's a single string, you might need refinement.
        iconType: (formData.get('iconType') as string) || '',
    });


    if (!validatedFields.success) {
        console.error("[addStoreAction] Zod Validation Failed. Errors:", JSON.stringify(validatedFields.error.flatten().fieldErrors, null, 2));
        return {
            success: false,
            message: "Σφάλμα επικύρωσης.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    const validatedCategoriesInputFromZod = validatedFields.data.categoriesInput;
    console.log("[addStoreAction] Validated categoriesInput from Zod:", validatedCategoriesInputFromZod);


    try {
        const { ownerId, servicesJson, availabilityJson, tagsInput, specializedBrands, tyreBrands, latitude, longitude, iconType, ...storeCoreData } = validatedFields.data;
        console.log("[updateStoreAction] Debug: iconType from validatedFields.data:", iconType, "Type:", typeof iconType);
        let categoriesToSave: StoreCategory[] = [];
        // If validatedCategoriesInputFromZod is a string (even empty), parse it.
        // If it's undefined (field not submitted), categoriesToSave remains [].
        if (validatedCategoriesInputFromZod !== undefined) {
            categoriesToSave = (validatedCategoriesInputFromZod ?? '')
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean) as StoreCategory[];
        }
        console.log("[addStoreAction] Parsed categories for new store:", categoriesToSave);


        let services: Service[] = [];
        if (servicesJson) {
            try { services = JSON.parse(servicesJson); } catch (e) { console.warn("[addStoreAction] Could not parse servicesJson:", e); }
        }
        let availability: AvailabilitySlot[] = [];
        if (availabilityJson) {
            try { availability = JSON.parse(availabilityJson); } catch (e) { console.warn("[addStoreAction] Could not parse availabilityJson:", e); }
        }

        const storeDataForDB: Omit<Store, 'id' | 'location'> & { location: AdminGeoPoint } = {
            name: validatedFields.data.name,
            logoUrl: validatedFields.data.logoUrl || '',
            bannerUrl: validatedFields.data.bannerUrl,
            description: validatedFields.data.description,
            longDescription: validatedFields.data.longDescription,
            contactEmail: validatedFields.data.contactEmail,
            websiteUrl: validatedFields.data.websiteUrl,
            address: validatedFields.data.address ?? null,
            location: new admin.firestore.GeoPoint(parseFloat(latitude), parseFloat(longitude)),
            categories: categoriesToSave,
            tags: tagsInput?.split(',').map(t => t.trim()).filter(Boolean) || [],
            features: [],
            pricingPlans: [],
            reviews: [],
            products: [],
            ownerId: ownerId || null,
            rating: 0,
            services,
            availability,
            specializedBrands: specializedBrands || [],
            tyreBrands: tyreBrands || [],
            iconType: iconType === '' ? undefined : (iconType as 'verified' | 'premium'),
        };

        const docRef = await adminDb.collection(STORE_COLLECTION).add(storeDataForDB);
        const newRawStore: Store = {
            ...storeDataForDB,
            id: docRef.id,
            location: { latitude: storeDataForDB.location.latitude, longitude: storeDataForDB.location.longitude }
        };
        const newSerializedStore = serializeStoreForClient(newRawStore);

        revalidatePath('/admin/stores');
        revalidatePath('/');
        AppCategories.forEach(cat => revalidatePath(`/category/${cat.slug}`));
        revalidatePath(`/stores/${newSerializedStore.id}`);

        return { success: true, message: `Το κέντρο "${newSerializedStore.name}" προστέθηκε επιτυχώς.`, store: newSerializedStore };
    } catch (error: any) {
        console.error("Error adding store in addStoreAction:", error);
        if (error.message && error.message.includes("GeoPoint")) {
          return { success: false, message: `Σφάλμα με το GeoPoint: ${error.message}. Βεβαιωθείτε ότι οι συντεταγμένες είναι έγκυρες.` };
        }
        return { success: false, message: `Αποτυχία προσθήκης κέντρου. Παρακαλώ δοκιμάστε ξανά. Error: ${error.message}` };
    }
}


export async function updateStoreAction(storeId: string, prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }> {
    if (!adminDb || !adminStorage) {
        const errorMsg = "Σφάλμα: Το Firebase Admin SDK δεν έχει αρχικοποιηθεί σωστά.";
        console.error(`[updateStoreAction] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }
    console.log(`[updateStoreAction] Received request for storeId: ${storeId}`);
    console.log("[updateStoreAction] FormData for specializedBrands:", formData.getAll('specializedBrands'));
console.log("[updateStoreAction] FormData for tyreBrands:", formData.getAll('tyreBrands'));
    
    const formEntries: { [key: string]: any } = {};
    for (const [key, value] of formData.entries()) {
        formEntries[key] = value;
    }
    console.log("[updateStoreAction] Raw FormData entries:", formEntries);

    const rawCategoriesInputFromForm = formData.get('categoriesInput') as string | null;
    console.log("[updateStoreAction] Raw categoriesInput from FormData:", rawCategoriesInputFromForm);


    const existingStoreDocSnap = await adminDb.collection(STORE_COLLECTION).doc(storeId).get();
    if (!existingStoreDocSnap.exists) {
        console.error(`[updateStoreAction] Store not found with Admin SDK for ID: ${storeId}`);
        return { success: false, message: "Το κέντρο δεν βρέθηκε." };
    }
    const existingStoreData = existingStoreDocSnap.data() as Omit<Store, 'id' | 'location'> & { location: AdminGeoPoint | {latitude: number, longitude: number}, categories?: StoreCategory[] };

    let logoUrlToSave: string | undefined = formData.get('existingLogoUrl') as string || existingStoreData?.logoUrl || undefined;
    let bannerUrlToSave: string | undefined = formData.get('existingBannerUrl') as string || existingStoreData?.bannerUrl || undefined;

    const logoFile = formData.get('logoFile') as File | null;
    const bannerFile = formData.get('bannerFile') as File | null;

    try {
        if (logoFile && logoFile.size > 0) {
            logoUrlToSave = await uploadFileToStorage(logoFile, 'store-logos');
        }

        if (bannerFile && bannerFile.size > 0) {
            bannerUrlToSave = await uploadFileToStorage(bannerFile, 'store-banners');
        }
    } catch (uploadError: any) {
        console.error("[updateStoreAction] File upload error:", uploadError);
        return { success: false, message: uploadError.message || "Σφάλμα κατά το ανέβασμα αρχείου." };
    }

    if (!logoUrlToSave && !(logoFile && logoFile.size > 0)) {
        const storeNameForPlaceholder = formData.get('name') as string || "store";
        logoUrlToSave = `https://placehold.co/100x100.png?text=${encodeURIComponent(storeNameForPlaceholder.substring(0, 3))}`;
    }
    if (!bannerUrlToSave && !(bannerFile && bannerFile.size > 0) && formData.get('bannerUrl') !== '') {
        const storeNameForPlaceholder = formData.get('name') as string || "store";
        bannerUrlToSave = `https://placehold.co/800x300.png?text=${encodeURIComponent(storeNameForPlaceholder)}`;
    } else if (formData.get('bannerUrl') === '') {
        bannerUrlToSave = '';
    }

    const validatedFields = storeDbSchema.safeParse({
        name: formData.get('name') as string,
        logoUrl: logoUrlToSave,
        bannerUrl: bannerUrlToSave,
        description: formData.get('description') as string,
        longDescription: formData.get('longDescription') as string || undefined,
        tagsInput: formData.get('tagsInput') as string || undefined,
        categoriesInput: rawCategoriesInputFromForm === null ? undefined : String(rawCategoriesInputFromForm),
        contactEmail: formData.get('contactEmail') as string || '',
        websiteUrl: formData.get('websiteUrl') as string || '',
        latitude: formData.get('latitude') as string,
        longitude: formData.get('longitude') as string,
        address: formData.get('address') as string || undefined,
        ownerId: formData.get('ownerId') as string || '',
        servicesJson: formData.get('servicesJson') as string || '[]',
        availabilityJson: formData.get('availabilityJson') as string || '[]',
        specializedBrands: formData.getAll('specializedBrands') as string[] | undefined, // Assuming checkboxes send an array
        // Explicitly include tyreBrands from formData using getAll
        tyreBrands: formData.getAll('tyreBrands') as string[] | undefined, // Ensure tyreBrands is passed to Zod
        iconType: (formData.get('iconType') as string) || '',
    });

    if (!validatedFields.success) {
        console.error("[updateStoreAction] Zod Validation failed:", JSON.stringify(validatedFields.error.flatten().fieldErrors, null, 2));
        return {
            success: false,
            message: "Σφάλμα επικύρωσης.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    const validatedCategoriesInputFromZod = validatedFields.data.categoriesInput;
    console.log("[updateStoreAction] Zod validation successful. Validated Data (categoriesInput from Zod):", validatedCategoriesInputFromZod);


    try {
        // Destructure all validated data fields, then explicitly build the payload.
        const {
            name, logoUrl, bannerUrl, description, longDescription,
            contactEmail, websiteUrl, address, latitude, longitude,
            ownerId, servicesJson, availabilityJson, tagsInput,
            specializedBrands, tyreBrands, iconType
        } = validatedFields.data;
        console.log("[updateStoreAction] Debug: iconType after Zod validation:", iconType, "Type:", typeof iconType);
        let categoriesToUseInUpdate: StoreCategory[];

        if (validatedCategoriesInputFromZod !== undefined) {
            // Field was present in form data (could be "" or "slug,slug")
            // This means user interacted with checkboxes or the field was submitted with a value (even empty).
            categoriesToUseInUpdate = (validatedCategoriesInputFromZod ?? '')
                .split(',')
                .map(s => s.trim().toLowerCase())
                .filter(Boolean) as StoreCategory[];
            console.log("[updateStoreAction] Categories determined from form input (validatedCategoriesInputFromZod was a string, possibly empty):", categoriesToUseInUpdate);
        } else {
            // Field was NOT present in form data (formData.get('categoriesInput') was null, so validatedCategoriesInputFromZod is undefined).
            // This implies the categories section was not "dirty" or touched by the user. Retain existing.
            categoriesToUseInUpdate = (existingStoreData.categories && Array.isArray(existingStoreData.categories)) ? existingStoreData.categories : [];
            console.log("[updateStoreAction] Retaining existing categories from DB (validatedCategoriesInputFromZod was undefined):", categoriesToUseInUpdate);
        }


        const firestoreUpdatePayload: Partial<Omit<Store, 'id' | 'location' | 'reviews'>> & { location?: AdminGeoPoint; reviews?: any[]; iconType?: 'verified' | 'premium' | FieldValue; } = {
            name: name,
            logoUrl: logoUrl || '',
            bannerUrl: bannerUrl,
            description: description,
            longDescription: longDescription,
            contactEmail: contactEmail,
            websiteUrl: websiteUrl,
            address: address ?? null,
            location: new admin.firestore.GeoPoint(parseFloat(latitude), parseFloat(longitude)),
            categories: categoriesToUseInUpdate,
            tags: tagsInput !== undefined ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : existingStoreData.tags || [],
            ownerId: ownerId === '' ? null : (ownerId || existingStoreData.ownerId || null),
            services: servicesJson ? JSON.parse(servicesJson) : (existingStoreData.services || []),
            availability: availabilityJson ? JSON.parse(availabilityJson) : (existingStoreData.availability || []),
            features: existingStoreData.features || [],
            pricingPlans: existingStoreData.pricingPlans || [],
            products: existingStoreData.products || [],
            reviews: (existingStoreData.reviews || []).map((review: any) => {
                const date = review.date;
                let jsDate: Date;

                // Attempt to convert to a standard JavaScript Date object
                if (date instanceof Date) {
                    jsDate = date;
                } else if (date && typeof date.toDate === 'function') {
                    // This handles Firestore Timestamp objects (from both client and admin SDKs)
                    jsDate = date.toDate();
                } else if (typeof date === 'string') {
                    // Handles date strings
                    jsDate = new Date(date);
                } else if (date && typeof date._seconds === 'number' && typeof date._nanoseconds === 'number') {
                    // This specifically handles the internal structure of admin.firestore.Timestamp objects
                    // when they might not be direct instances (e.g., after serialization/deserialization).
                    jsDate = new Date(date._seconds * 1000 + date._nanoseconds / 1_000_000);
                } else {
                    // Fallback for any other unexpected or missing date formats
                    console.warn(`[updateStoreAction] Unexpected date format for review.date: ${JSON.stringify(date)}. Using current date.`);
                    jsDate = new Date();
                }

                return { ...review, date: jsDate }; // Pass a standard JavaScript Date object
            }),
            rating: existingStoreData.rating || 0,
            specializedBrands: specializedBrands !== undefined ? specializedBrands : existingStoreData.specializedBrands || [],
            tyreBrands: tyreBrands !== undefined ? tyreBrands : existingStoreData.tyreBrands || [],
            iconType: iconType === '' ? admin.firestore.FieldValue.delete() : (iconType as 'verified' | 'premium'),
        };

        console.log("[updateStoreAction] FINAL PAYLOAD for Firestore update:", JSON.stringify(firestoreUpdatePayload, null, 2));
        console.log("[updateStoreAction] FINAL PAYLOAD categories field specifically:", firestoreUpdatePayload.categories);


        // Perform the Firestore update
        await adminDb.collection(STORE_COLLECTION).doc(storeId).update(firestoreUpdatePayload as any)
            .catch(updateError => {
                console.error(`[updateStoreAction] Firestore update error for storeId ${storeId}:`, updateError);
                throw updateError; // Re-throw to be caught by the main try...catch block
            });
        
        // Revalidate paths after successful update
        revalidatePath('/admin/stores');
        revalidatePath(`/admin/stores/edit/${storeId}`);
        revalidatePath('/');
        AppCategories.forEach(cat => revalidatePath(`/category/${cat.slug}`));
        revalidatePath(`/stores/${storeId}`);

        const updatedDocSnap = await adminDb.collection(STORE_COLLECTION).doc(storeId).get();
        if (!updatedDocSnap.exists) {
            console.error(`[updateStoreAction] Store ${storeId} not found after update with Admin SDK.`);
            return { success: false, message: "Αποτυχία ενημέρωσης κέντρου. Το κέντρο δεν βρέθηκε μετά την ενημέρωση." };
        }

        const updatedAdminData = updatedDocSnap.data() as Omit<Store, 'id' | 'location'> & { location: AdminGeoPoint };
        const updatedRawStore: Store = {
            id: updatedDocSnap.id,
            ...updatedAdminData,
            location: { latitude: updatedAdminData.location.latitude, longitude: updatedAdminData.location.longitude}
        };
        const updatedSerializedStore = serializeStoreForClient(updatedRawStore);

        return { success: true, message: `Το κέντρο "${updatedSerializedStore.name}" ενημερώθηκε επιτυχώς.`, store: updatedSerializedStore };
    } catch (error: any) {
        console.error("[updateStoreAction] Error during store update process with Admin SDK:", error);
        let message = `Αποτυχία ενημέρωσης κέντρου. Παρακαλώ δοκιμάστε ξανά. Error: ${error.message || 'Unknown error'}`;
        if (error.code) message += ` (Code: ${error.code})`;
         if (error.message && error.message.includes("GeoPoint")) {
          message = `Σφάλμα με το GeoPoint: ${error.message}. Βεβαιωθείτε ότι οι συντεταγμένες είναι έγκυρες.`;
        }
        return { success: false, message: message };
    }
}

export async function deleteStoreAction(storeId: string): Promise<{ success: boolean; message: string }> {
    if (!adminDb) {
        const errorMsg = "Σφάλμα: Το Firebase Admin SDK δεν έχει αρχικοποιηθεί σωστά.";
        console.error(`[deleteStoreAction] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }
    try {
        await adminDb.collection(STORE_COLLECTION).doc(storeId).delete();
        revalidatePath('/admin/stores');
        revalidatePath('/');
        AppCategories.forEach(cat => revalidatePath(`/category/${cat.slug}`));
        revalidatePath(`/stores/${storeId}`);
        return { success: true, message: "Το κέντρο διαγράφηκε επιτυχώς." };
    } catch (error: any) {
        console.error("Error deleting store with Admin SDK:", error);
        return { success: false, message: `Αποτυχία διαγραφής κέντρου. Παρακαλώ δοκιμάστε ξανά. Error: ${error.message}` };
    }
}