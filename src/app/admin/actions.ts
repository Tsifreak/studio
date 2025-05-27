
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Store, StoreCategory, StoreFormData, SerializedStore, SerializedFeature, Service, AvailabilitySlot } from '@/lib/types';
import { AppCategories, StoreCategoriesSlugs } from '@/lib/types'; 
import { adminDb, adminStorage, admin } from '@/lib/firebase-admin';

const STORE_COLLECTION = 'StoreInfo';
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function uploadFileToStorage(file: File, destinationFolder: string): Promise<string> {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`Μη υποστηριζόμενος τύπος αρχείου: ${file.type}. Επιτρέπονται: JPEG, PNG, WebP.`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Το αρχείο είναι πολύ μεγάλο (${(file.size / 1024 / 1024).toFixed(2)}MB). Μέγιστο επιτρεπτό μέγεθος: ${MAX_FILE_SIZE_MB}MB.`);
  }

  if (!adminStorage) {
    console.error("[uploadFileToStorage] Firebase Admin Storage is not initialized.");
    throw new Error("Η υπηρεσία αποθήκευσης αρχείων δεν είναι διαθέσιμη.");
  }
  const bucket = adminStorage.bucket();
  if (!bucket) {
      console.error("[uploadFileToStorage] Default bucket not available in Admin Storage.");
      throw new Error("Ο προεπιλεγμένος χώρος αποθήκευσης δεν είναι διαθέσιμος.");
  }
  console.log(`[uploadFileToStorage] Attempting to use bucket: '${bucket.name}'`);


  const fileName = `${destinationFolder}/${Date.now()}-${Math.random().toString(36).substring(2,10)}-${file.name.replace(/\s+/g, '_')}`;
  const blob = bucket.file(fileName);
  
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: file.type,
    },
    public: true, 
  });

  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      console.error(`[uploadFileToStorage] Error uploading to GCS (Bucket: ${bucket.name}, File: ${fileName}):`, err);
      reject(new Error(`Σφάλμα κατά το ανέβασμα του αρχείου: ${err.message}`));
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
  return {
    ...store,
    features: store.features.map((feature): SerializedFeature => ({ 
        id: feature.id,
        name: feature.name,
        description: feature.description,
        icon: typeof feature.icon === 'string' ? feature.icon : undefined, 
    })),
    categories: store.categories || [], // Ensure categories is an array
    services: store.services || [],
    availability: store.availability || [],
  };
}

const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  price: z.number().positive(),
  availableDaysOfWeek: z.array(z.number().int().min(0).max(6)),
});
const servicesArraySchema = z.array(serviceSchema);

const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), 
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),   
  lunchBreakStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().or(z.literal('')),
  lunchBreakEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().or(z.literal('')),
});
const availabilityArraySchema = z.array(availabilitySlotSchema);

const storeDbSchema = z.object({
  name: z.string().min(3, { message: "Το όνομα πρέπει να έχει τουλάχιστον 3 χαρακτήρες." }),
  logoUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για το λογότυπο." }),
  bannerUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για το banner." }).optional().or(z.literal('')),
  description: z.string().min(10, { message: "Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες." }),
  longDescription: z.string().optional(),
  tagsInput: z.string().optional(),
  categoriesInput: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true; // Allow empty or undefined
    const slugs = val.split(',').map(s => s.trim()).filter(Boolean);
    return slugs.every(slug => StoreCategoriesSlugs.includes(slug));
  }, { message: `Μία ή περισσότερες κατηγορίες δεν είναι έγκυρες. Έγκυρες τιμές: ${StoreCategoriesSlugs.join(', ')}` }),
  contactEmail: z.string().email({ message: "Παρακαλώ εισάγετε ένα έγκυρο email επικοινωνίας." }).optional().or(z.literal('')),
  websiteUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL ιστοσελίδας." }).optional().or(z.literal('')),
  latitude: z.string().refine(val => !isNaN(parseFloat(val)), {
    message: "Μη έγκυρο γεωγραφικό πλάτος",
  }),
  longitude: z.string().refine(val => !isNaN(parseFloat(val)), {
    message: "Μη έγκυρο γεωγραφικό μήκος",
  }),
  address: z.string().optional(),
  ownerId: z.string().optional().or(z.literal('')), 
  servicesJson: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true; 
    try {
      JSON.parse(val); // Check if valid JSON first
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
      JSON.parse(val); // Check if valid JSON first
      const parsed = JSON.parse(val);
      availabilityArraySchema.parse(parsed);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: "Μη έγκυρο JSON για τη διαθεσιμότητα ή δεν συμφωνεί με το σχήμα." }),
});


export async function addStoreAction(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }> {
  console.log("[addStoreAction] Received FormData entries:");
  if (!adminDb || !adminStorage) {
    const errorMsg = "Σφάλμα: Το Firebase Admin SDK δεν έχει αρχικοποιηθεί σωστά. Ελέγξτε τα διαπιστευτήρια του service account και τις μεταβλητές περιβάλλοντος.";
    console.error(`[addStoreAction] ${errorMsg}`);
    return { success: false, message: errorMsg };
  }
  const formEntries: { [key: string]: any } = {};
  for (const [key, value] of formData.entries()) {
    formEntries[key] = value;
    console.log(`  ${key}: ${value instanceof File ? `File: ${value.name}, Size: ${value.size}, Type: ${value.type}` : value}`);
  }

  let logoUrlToSave: string | undefined = undefined;
  let bannerUrlToSave: string | undefined = undefined;

  const logoFile = formData.get('logoFile') as File | null;
  const bannerFile = formData.get('bannerFile') as File | null;

  try {
    if (logoFile && logoFile.size > 0) {
      logoUrlToSave = await uploadFileToStorage(logoFile, 'store-logos');
    } else {
      const storeNameForPlaceholder = formData.get('name') as string || "store";
      logoUrlToSave = `https://placehold.co/100x100.png?text=${encodeURIComponent(storeNameForPlaceholder.substring(0,3))}`;
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
  
  const validatedFields = storeDbSchema.safeParse({
    name: formData.get('name') || '',
    logoUrl: logoUrlToSave, 
    bannerUrl: bannerUrlToSave || '', 
    description: formData.get('description') || '',
    longDescription: formData.get('longDescription') ?? undefined, 
    tagsInput: formData.get('tagsInput') ?? undefined,
    categoriesInput: formData.get('categoriesInput') ?? undefined,
    contactEmail: formData.get('contactEmail') || '',
    websiteUrl: formData.get('websiteUrl') || '',
    address: formData.get('address') ?? undefined,
    ownerId: formData.get('ownerId') || '',
    servicesJson: formData.get('servicesJson') || '',
    availabilityJson: formData.get('availabilityJson') || '',
  });

  if (!validatedFields.success) {
    console.error("[addStoreAction] Zod Validation Failed. Errors:", JSON.stringify(validatedFields.error.flatten().fieldErrors, null, 2));
    return {
      success: false,
      message: "Σφάλμα επικύρωσης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  try {
    const { ownerId, servicesJson, availabilityJson, tagsInput, categoriesInput, ...storeCoreData } = validatedFields.data;
    
    let categories: StoreCategory[] = [];
    if (categoriesInput) {
        categories = categoriesInput.split(',').map(s => s.trim()).filter(Boolean) as StoreCategory[];
    }
    if (categories.length === 0 && AppCategories.length > 0) {
        categories.push(AppCategories[0].slug as StoreCategory); // Default to first category if none provided
    }


    let services: Service[] = [];
    if (servicesJson) {
      try { services = JSON.parse(servicesJson); } catch (e) { console.warn("Could not parse servicesJson:", e); }
    }
    let availability: AvailabilitySlot[] = [];
    if (availabilityJson) {
      try { availability = JSON.parse(availabilityJson); } catch (e) { console.warn("Could not parse availabilityJson:", e); }
    }

    const storeDataForDB: Omit<Store, 'id'> = {
      ...storeCoreData,
      rating: 0,
      location: {
        latitude: parseFloat(validatedFields.data.latitude),
        longitude: parseFloat(validatedFields.data.longitude),
      },
      categories: categories,
      tags: tagsInput?.split(',').map(t => t.trim()).filter(Boolean) || [],
      features: [], 
      pricingPlans: [],
      reviews: [],
      products: [],
      ownerId: ownerId || null,
      services: services,
      availability: availability,
    };
    
    const docRef = await adminDb.collection(STORE_COLLECTION).add(storeDataForDB);
    const newRawStore: Store = { ...storeDataForDB, id: docRef.id };
    const newSerializedStore = serializeStoreForClient(newRawStore);
    
    revalidatePath('/admin/stores');
    revalidatePath('/');
    // Revalidate all category pages (can be broad, consider more targeted revalidation if performance becomes an issue)
    AppCategories.forEach(cat => revalidatePath(`/category/${cat.slug}`));
    revalidatePath(`/stores/${newSerializedStore.id}`);

    return { success: true, message: `Το κέντρο "${newSerializedStore.name}" προστέθηκε επιτυχώς.`, store: newSerializedStore };
  } catch (error: any) {
    console.error("Error adding store in addStoreAction:", error);
    return { success: false, message: `Αποτυχία προσθήκης κέντρου. Παρακαλώ δοκιμάστε ξανά. Error: ${error.message}` };
  }
}

export async function updateStoreAction(storeId: string, prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }> {
  if (!adminDb || !adminStorage) {
    const errorMsg = "Σφάλμα: Το Firebase Admin SDK δεν έχει αρχικοποιηθεί σωστά. Ελέγξτε τα διαπιστευτήρια του service account και τις μεταβλητές περιβάλλοντος.";
    console.error(`[updateStoreAction] ${errorMsg}`);
    return { success: false, message: errorMsg };
  }
  console.log(`[updateStoreAction] Received request for storeId: ${storeId}`);
  const formEntries: { [key: string]: any } = {};
  for (const [key, value] of formData.entries()) {
    formEntries[key] = value;
  }
  console.log("[updateStoreAction] FormData entries:", formEntries);


  const existingStoreDocSnap = await adminDb.collection(STORE_COLLECTION).doc(storeId).get();
  if (!existingStoreDocSnap.exists) {
    console.error(`[updateStoreAction] Store not found with Admin SDK for ID: ${storeId}`);
    return { success: false, message: "Το κέντρο δεν βρέθηκε." };
  }
  const existingStoreData = existingStoreDocSnap.data();

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
      logoUrlToSave = `https://placehold.co/100x100.png?text=${encodeURIComponent(storeNameForPlaceholder.substring(0,3))}`;
  }
  if (!bannerUrlToSave && !(bannerFile && bannerFile.size > 0)) {
      const storeNameForPlaceholder = formData.get('name') as string || "store";
      bannerUrlToSave = formData.get('bannerUrl') === '' ? '' : `https://placehold.co/800x300.png?text=${encodeURIComponent(storeNameForPlaceholder)}`;
  }

  const validatedFields = storeDbSchema.safeParse({
    name: formData.get('name') || '',
    logoUrl: logoUrlToSave,
    bannerUrl: bannerUrlToSave || '', 
    description: formData.get('description') || '',
    longDescription: formData.get('longDescription') ?? undefined,
    tagsInput: formData.get('tagsInput') ?? undefined,
    categoriesInput: formData.get('categoriesInput') ?? undefined,
    contactEmail: formData.get('contactEmail') || '',
    websiteUrl: formData.get('websiteUrl') || '',
    address: formData.get('address') ?? undefined,
    ownerId: formData.get('ownerId') || '',
    servicesJson: formData.get('servicesJson') || '',
    availabilityJson: formData.get('availabilityJson') || '',
  });

  if (!validatedFields.success) {
     console.error("[updateStoreAction] Zod Validation failed:", JSON.stringify(validatedFields.error.flatten().fieldErrors, null, 2));
     return {
      success: false,
      message: "Σφάλμα επικύρωσης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  try {
    const { servicesJson, availabilityJson, tagsInput, categoriesInput, ...dataToUpdate } = validatedFields.data;
    const firestoreUpdatePayload: { [key: string]: any } = { ...dataToUpdate };
    firestoreUpdatePayload.location = {
      latitude: parseFloat(validatedFields.data.latitude),
      longitude: parseFloat(validatedFields.data.longitude),
    };

    if (tagsInput !== undefined) {
      firestoreUpdatePayload.tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    if (categoriesInput !== undefined) {
        const parsedCategories = categoriesInput.split(',').map(s => s.trim()).filter(Boolean) as StoreCategory[];
        firestoreUpdatePayload.categories = parsedCategories.length > 0 ? parsedCategories : (AppCategories.length > 0 ? [AppCategories[0].slug as StoreCategory] : []);
    } else {
        // If categoriesInput is not provided at all, retain existing or set default if it becomes empty
        const currentCategories = existingStoreData?.categories || [];
        firestoreUpdatePayload.categories = currentCategories.length > 0 ? currentCategories : (AppCategories.length > 0 ? [AppCategories[0].slug as StoreCategory] : []);
    }


    if (dataToUpdate.ownerId === '') {
      firestoreUpdatePayload.ownerId = null;
    } else if (dataToUpdate.ownerId) {
      firestoreUpdatePayload.ownerId = dataToUpdate.ownerId;
    }
    
    if (servicesJson !== undefined) {
      try { firestoreUpdatePayload.services = JSON.parse(servicesJson); } 
      catch (e: any) { throw new Error(`Invalid JSON for services: ${e.message}`); }
    }
    if (availabilityJson !== undefined) {
      try { firestoreUpdatePayload.availability = JSON.parse(availabilityJson); } 
      catch (e: any) { throw new Error(`Invalid JSON for availability: ${e.message}`); }
    }
    
    await adminDb.collection(STORE_COLLECTION).doc(storeId).update(firestoreUpdatePayload);
    
    const updatedDocSnap = await adminDb.collection(STORE_COLLECTION).doc(storeId).get();
    if (!updatedDocSnap.exists) {
        console.error(`[updateStoreAction] Store ${storeId} not found after update with Admin SDK.`);
        return { success: false, message: "Αποτυχία ενημέρωσης κέντρου. Το κέντρο δεν βρέθηκε μετά την ενημέρωση." };
    }
    const updatedRawStore = { id: updatedDocSnap.id, ...updatedDocSnap.data() } as Store;
    const updatedSerializedStore = serializeStoreForClient(updatedRawStore);
        
    revalidatePath('/admin/stores');
    revalidatePath('/');
    AppCategories.forEach(cat => revalidatePath(`/category/${cat.slug}`));
    revalidatePath(`/stores/${storeId}`);

    return { success: true, message: `Το κέντρο "${updatedSerializedStore.name}" ενημερώθηκε επιτυχώς.`, store: updatedSerializedStore };
  } catch (error: any) {
    console.error("[updateStoreAction] Error during store update process with Admin SDK:", error);
    let message = `Αποτυχία ενημέρωσης κέντρου. Παρακαλώ δοκιμάστε ξανά. Error: ${error.message || 'Unknown error'}`;
    if (error.code) message += ` (Code: ${error.code})`;
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
