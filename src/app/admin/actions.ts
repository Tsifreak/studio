
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { 
  getStoreByIdFromDB, // Keep using client SDK for reads if preferred, or switch to adminDb
} from '@/lib/storeService'; 
import type { Store, StoreCategory, StoreFormData, Feature, SerializedStore, SerializedFeature, Service, AvailabilitySlot } from '@/lib/types';
import { AppCategories } from '@/lib/types'; 
import { auth } from '@/lib/firebase'; // Client SDK for auth checks if needed for UI
import { adminDb, admin } from '@/lib/firebase-admin'; // Admin SDK

const STORE_COLLECTION = 'StoreInfo';

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

// Zod schema for JSON validation
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
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), // HH:mm format
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),   // HH:mm format
  lunchBreakStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().or(z.literal('')),
  lunchBreakEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().or(z.literal('')),
});
const availabilityArraySchema = z.array(availabilitySlotSchema);

const storeFormSchema = z.object({
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
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  const validatedFields = storeFormSchema.safeParse({
    name: formData.get('name') || '',
    logoUrl: formData.get('logoUrl') || '',
    bannerUrl: formData.get('bannerUrl') || '', 
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
  console.log("[addStoreAction] Zod Validation Successful. Data:", validatedFields.data);

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
      ...storeCoreData,
      rating: 0,
      category: defaultCategorySlug as StoreCategory,
      tags: tagsInput?.split(',').map(t => t.trim()).filter(Boolean) || [],
      features: [], 
      pricingPlans: [],
      reviews: [],
      products: [],
      ownerId: ownerId || undefined,
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
  console.log("[updateStoreAction] FormData entries:");
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  // Client SDK auth.currentUser is unreliable here for Firestore writes, Admin SDK will bypass rules.
  // Keep for UI/initial checks if desired, but Firestore operations will use Admin context.
  if (!auth.currentUser) { 
     console.warn("[updateStoreAction] auth.currentUser (client SDK) is null in server action. Proceeding with Admin SDK for Firestore operation.");
  } else {
    console.log(`[updateStoreAction] Client SDK auth.currentUser: ${auth.currentUser.email}. Admin SDK will be used for Firestore.`);
  }

  const existingStore = await getStoreByIdFromDB(storeId); // Using client SDK for read
  if (!existingStore) {
    console.error(`[updateStoreAction] Store not found for ID: ${storeId}`);
    return { success: false, message: "Το κέντρο δεν βρέθηκε." };
  }

  const validatedFields = storeFormSchema.safeParse({
    name: formData.get('name') || '',
    logoUrl: formData.get('logoUrl') || '',
    bannerUrl: formData.get('bannerUrl') || '',
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
  console.log("[updateStoreAction] Zod Validation successful. Data:", validatedFields.data);
  
  try {
    const { servicesJson, availabilityJson, tagsInput, ...dataToUpdate } = validatedFields.data;
    const firestoreUpdatePayload: { [key: string]: any } = { ...dataToUpdate };

    if (tagsInput !== undefined) {
      firestoreUpdatePayload.tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    if (dataToUpdate.ownerId === '') {
      firestoreUpdatePayload.ownerId = admin.firestore.FieldValue.delete(); // Or null if preferred
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
    
    // Fetch the updated document using Admin SDK or client SDK for consistency with reads
    const updatedDocSnap = await adminDb.collection(STORE_COLLECTION).doc(storeId).get();
    if (!updatedDocSnap.exists) {
        console.error(`[updateStoreAction] Store ${storeId} not found after update with Admin SDK.`);
        return { success: false, message: "Αποτυχία ενημέρωσης κέντρου. Το κέντρο δεν βρέθηκε μετά την ενημέρωση." };
    }
    const updatedRawStore = { id: updatedDocSnap.id, ...updatedDocSnap.data() } as Store; // TODO: mapDocToStore for admin if needed
    const updatedSerializedStore = serializeStoreForClient(updatedRawStore);
        
    revalidatePath('/admin/stores');
    revalidatePath('/');
    revalidatePath(`/stores/${storeId}`);

    console.log(`[updateStoreAction] Store "${updatedSerializedStore.name}" updated successfully.`);
    return { success: true, message: `Το κέντρο "${updatedSerializedStore.name}" ενημερώθηκε επιτυχώς.`, store: updatedSerializedStore };
  } catch (error: any) {
    console.error("[updateStoreAction] Error during store update process:", error);
    let message = `Αποτυχία ενημέρωσης κέντρου. Παρακαλώ δοκιμάστε ξανά. Error: ${error.message || 'Unknown error'}`;
    if (error.code) message += ` (Code: ${error.code})`;
    return { success: false, message: message };
  }
}

export async function deleteStoreAction(storeId: string): Promise<{ success: boolean; message: string }> {
  try {
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
    const updatedRawStore = { id: updatedDocSnap.id, ...updatedDocSnap.data() } as Store; // TODO: mapDocToStore for admin
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
