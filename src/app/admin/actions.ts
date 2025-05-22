
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Store, StoreCategory, StoreFormData, Feature, SerializedStore, SerializedFeature, Service, AvailabilitySlot } from '@/lib/types';
import { AppCategories } from '@/lib/types'; 
import { adminDb, adminStorage, admin } from '@/lib/firebase-admin'; // Admin SDK for DB and Storage
// Removed client SDK import: import { getStoreByIdFromDB } from '@/lib/storeService'; 

const STORE_COLLECTION = 'StoreInfo';
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Helper function to upload file to Firebase Storage using Admin SDK
async function uploadFileToStorage(file: File, destinationFolder: string): Promise<string> {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`Μη υποστηριζόμενος τύπος αρχείου: ${file.type}. Επιτρέπονται: JPEG, PNG, WebP.`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Το αρχείο είναι πολύ μεγάλο (${(file.size / 1024 / 1024).toFixed(2)}MB). Μέγιστο επιτρεπτό μέγεθος: ${MAX_FILE_SIZE_MB}MB.`);
  }

  const bucket = adminStorage.bucket(); // Default bucket
  const fileName = `${destinationFolder}/${Date.now()}-${Math.random().toString(36).substring(2,10)}-${file.name.replace(/\s+/g, '_')}`;
  const blob = bucket.file(fileName);
  
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: file.type,
    },
    public: true, // Make the file publicly readable
  });

  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      console.error(`[uploadFileToStorage] Error uploading to GCS:`, err);
      reject(new Error(`Σφάλμα κατά το ανέβασμα του αρχείου: ${err.message}`));
    });
    blobStream.on('finish', async () => {
      // The file is now public, construct the URL
      // Note: For GCS, publicUrl might need to be constructed carefully or by making the object public
      // and using the standard format: `https://storage.googleapis.com/[BUCKET_NAME]/[OBJECT_NAME]`
      // For simplicity, assuming setPublic: true and then using standard URL format is okay.
      // Or, ensure getPublicUrl() is available and works as expected with your bucket permissions.
      // await blob.makePublic(); // Ensure it's public if createWriteStream doesn't guarantee it
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      console.log(`[uploadFileToStorage] File uploaded to ${publicUrl}`);
      resolve(publicUrl);
    });
    blobStream.end(buffer);
  });
}


// Helper function to convert Store to SerializedStore for client components
function serializeStoreForClient(store: Store): SerializedStore {
  return {
    ...store,
    features: store.features.map((feature): SerializedFeature => ({ 
        id: feature.id,
        name: feature.name,
        description: feature.description,
        icon: typeof feature.icon === 'string' ? feature.icon : undefined, 
    })),
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

// This Zod schema is for data *after* file uploads are processed and URLs are determined.
const storeDbSchema = z.object({
  name: z.string().min(3, { message: "Το όνομα πρέπει να έχει τουλάχιστον 3 χαρακτήρες." }),
  logoUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για το λογότυπο." }),
  bannerUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για το banner." }).optional().or(z.literal('')),
  description: z.string().min(10, { message: "Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες." }),
  longDescription: z.string().optional(),
  tagsInput: z.string().optional(),
  contactEmail: z.string().email({ message: "Παρακαλώ εισάγετε ένα έγκυρο email επικοινωνίας." }).optional().or(z.literal('')),
  websiteUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL ιστοσελίδας." }).optional().or(z.literal('')),
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
});


export async function addStoreAction(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }> {
  console.log("[addStoreAction] Received FormData entries:");
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
      console.log("[addStoreAction] Processing logoFile upload...");
      logoUrlToSave = await uploadFileToStorage(logoFile, 'store-logos');
    } else {
      const storeNameForPlaceholder = formData.get('name') as string || "store";
      logoUrlToSave = `https://placehold.co/100x100.png?text=${encodeURIComponent(storeNameForPlaceholder.substring(0,3))}`;
      console.log(`[addStoreAction] No logo file provided, using placeholder: ${logoUrlToSave}`);
    }

    if (bannerFile && bannerFile.size > 0) {
      console.log("[addStoreAction] Processing bannerFile upload...");
      bannerUrlToSave = await uploadFileToStorage(bannerFile, 'store-banners');
    } else {
      const storeNameForPlaceholder = formData.get('name') as string || "store";
      bannerUrlToSave = `https://placehold.co/800x300.png?text=${encodeURIComponent(storeNameForPlaceholder)}`;
      console.log(`[addStoreAction] No banner file provided, using placeholder: ${bannerUrlToSave}`);
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
  console.log("[addStoreAction] Zod Validation Successful. Data (with image URLs):", validatedFields.data);

  try {
    const { ownerId, servicesJson, availabilityJson, tagsInput, ...storeCoreData } = validatedFields.data;
    
    const defaultCategorySlug = AppCategories.length > 0 ? AppCategories[0].slug : "mechanic";
    let services: Service[] = [];
    if (servicesJson) {
      try { services = JSON.parse(servicesJson); } catch (e) { console.warn("Could not parse servicesJson:", e); }
    }
    let availability: AvailabilitySlot[] = [];
    if (availabilityJson) {
      try { availability = JSON.parse(availabilityJson); } catch (e) { console.warn("Could not parse availabilityJson:", e); }
    }

    const storeDataForDB: Omit<Store, 'id'> = {
      ...storeCoreData, // name, logoUrl, bannerUrl, description, longDescription, contactEmail, websiteUrl, address
      rating: 0,
      category: defaultCategorySlug as StoreCategory,
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
    revalidatePath(`/stores/${newSerializedStore.id}`);

    return { success: true, message: `Το κέντρο "${newSerializedStore.name}" προστέθηκε επιτυχώς.`, store: newSerializedStore };
  } catch (error: any) {
    console.error("Error adding store in addStoreAction:", error);
    return { success: false, message: `Αποτυχία προσθήκης κέντρου. Παρακαλώ δοκιμάστε ξανά. Error: ${error.message}` };
  }
}

export async function updateStoreAction(storeId: string, prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }> {
  console.log(`[updateStoreAction] Received request for storeId: ${storeId}`);
  const formEntries: { [key: string]: any } = {};
  for (const [key, value] of formData.entries()) {
    formEntries[key] = value;
    console.log(`  ${key}: ${value instanceof File ? `File: ${value.name}, Size: ${value.size}, Type: ${value.type}`: value }`);
  }

  const existingStoreDocSnap = await adminDb.collection(STORE_COLLECTION).doc(storeId).get();
  if (!existingStoreDocSnap.exists) {
    console.error(`[updateStoreAction] Store not found with Admin SDK for ID: ${storeId}`);
    return { success: false, message: "Το κέντρο δεν βρέθηκε." };
  }

  let logoUrlToSave: string | undefined = formData.get('existingLogoUrl') as string || undefined;
  let bannerUrlToSave: string | undefined = formData.get('existingBannerUrl') as string || undefined;

  const logoFile = formData.get('logoFile') as File | null;
  const bannerFile = formData.get('bannerFile') as File | null;

  try {
    if (logoFile && logoFile.size > 0) {
      console.log("[updateStoreAction] Processing logoFile upload...");
      logoUrlToSave = await uploadFileToStorage(logoFile, 'store-logos');
      // TODO: Delete old logo from storage if new one is uploaded successfully
    }
    
    if (bannerFile && bannerFile.size > 0) {
      console.log("[updateStoreAction] Processing bannerFile upload...");
      bannerUrlToSave = await uploadFileToStorage(bannerFile, 'store-banners');
       // TODO: Delete old banner from storage
    }
  } catch (uploadError: any) {
    console.error("[updateStoreAction] File upload error:", uploadError);
    return { success: false, message: uploadError.message || "Σφάλμα κατά το ανέβασμα αρχείου." };
  }
  
  // Ensure placeholders if URLs become empty and no file was uploaded to replace them
  if (!logoUrlToSave && !(logoFile && logoFile.size > 0)) {
      const storeNameForPlaceholder = formData.get('name') as string || "store";
      logoUrlToSave = `https://placehold.co/100x100.png?text=${encodeURIComponent(storeNameForPlaceholder.substring(0,3))}`;
  }
  if (!bannerUrlToSave && !(bannerFile && bannerFile.size > 0)) {
      const storeNameForPlaceholder = formData.get('name') as string || "store";
      // bannerUrl can be empty string if user wants to remove it
      bannerUrlToSave = formData.get('bannerUrl') === '' ? '' : `https://placehold.co/800x300.png?text=${encodeURIComponent(storeNameForPlaceholder)}`;
  }


  const validatedFields = storeDbSchema.safeParse({
    name: formData.get('name') || '',
    logoUrl: logoUrlToSave,
    bannerUrl: bannerUrlToSave || '', // Banner can be empty string
    description: formData.get('description') || '',
    longDescription: formData.get('longDescription') ?? undefined,
    tagsInput: formData.get('tagsInput') ?? undefined,
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
  console.log("[updateStoreAction] Zod Validation successful. Data (with image URLs):", validatedFields.data);
  
  try {
    const { servicesJson, availabilityJson, tagsInput, ...dataToUpdate } = validatedFields.data;
    const firestoreUpdatePayload: { [key: string]: any } = { ...dataToUpdate };

    if (tagsInput !== undefined) {
      firestoreUpdatePayload.tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
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
    
    console.log("[updateStoreAction] Calling adminDb.collection(STORE_COLLECTION).doc(storeId).update() with payload:", firestoreUpdatePayload);
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
    revalidatePath(`/stores/${storeId}`);

    console.log(`[updateStoreAction] Store "${updatedSerializedStore.name}" updated successfully.`);
    return { success: true, message: `Το κέντρο "${updatedSerializedStore.name}" ενημερώθηκε επιτυχώς.`, store: updatedSerializedStore };
  } catch (error: any) {
    console.error("[updateStoreAction] Error during store update process with Admin SDK:", error);
    let message = `Αποτυχία ενημέρωσης κέντρου. Παρακαλώ δοκιμάστε ξανά. Error: ${error.message || 'Unknown error'}`;
    if (error.code) message += ` (Code: ${error.code})`;
    return { success: false, message: message };
  }
}

export async function deleteStoreAction(storeId: string): Promise<{ success: boolean; message: string }> {
  try {
    // TODO: Delete associated images from Firebase Storage
    await adminDb.collection(STORE_COLLECTION).doc(storeId).delete();
    revalidatePath('/admin/stores');
    revalidatePath('/');
    revalidatePath(`/stores/${storeId}`); 
    return { success: true, message: "Το κέντρο διαγράφηκε επιτυχώς." };
  } catch (error: any) {
    console.error("Error deleting store with Admin SDK:", error);
    return { success: false, message: `Αποτυχία διαγραφής κέντρου. Παρακαλώ δοκιμάστε ξανά. Error: ${error.message}` };
  }
}

const categoryUpdateSchema = z.object({
  category: z.enum(AppCategories.map(c => c.slug) as [string, ...string[]]),
});

export async function updateStoreCategoryAction(
  storeId: string, 
  newCategory: StoreCategory
): Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }> { 
  const validatedCategory = categoryUpdateSchema.safeParse({ category: newCategory });

  if(!validatedCategory.success) {
    console.error("[updateStoreCategoryAction] Zod Validation Failed. Errors:", JSON.stringify(validatedCategory.error.flatten().fieldErrors, null, 2));
    return {
      success: false,
      message: "Μη έγκυρη κατηγορία.",
       errors: validatedCategory.error.flatten().fieldErrors,
    }
  }
  console.log("[updateStoreCategoryAction] Zod Validation Successful. Data:", validatedCategory.data);

  try {
    await adminDb.collection(STORE_COLLECTION).doc(storeId).update({ category: validatedCategory.data.category });
    
    const updatedDocSnap = await adminDb.collection(STORE_COLLECTION).doc(storeId).get();
     if (!updatedDocSnap.exists) {
        console.error(`[updateStoreCategoryAction] Store ${storeId} not found after category update.`);
        return { success: false, message: "Αποτυχία ενημέρωσης κατηγορίας. Το κέντρο δεν βρέθηκε μετά την ενημέρωση." };
    }
    const updatedRawStore = { id: updatedDocSnap.id, ...updatedDocSnap.data() } as Store;
    const updatedSerializedStore = serializeStoreForClient(updatedRawStore);
    
    revalidatePath('/admin/stores');
    revalidatePath('/');
    revalidatePath(`/stores/${storeId}`);

    return { success: true, message: `Η κατηγορία του κέντρου "${updatedSerializedStore.name}" ενημερώθηκε επιτυχώς.`, store: updatedSerializedStore };
  } catch (error: any) {
    console.error("Error updating store category with Admin SDK:", error);
    return { success: false, message: `Αποτυχία ενημέρωσης κατηγορίας. Παρακαλώ δοκιμάστε ξανά. Error: ${error.message}` };
  }
}
