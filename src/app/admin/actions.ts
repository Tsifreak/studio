
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { 
  addStoreToDB, 
  deleteStoreFromDB, 
  getStoreByIdFromDB, 
  updateStoreCategoryInDB, 
  updateStoreInDB 
} from '@/lib/storeService'; 
import type { Store, StoreCategory, StoreFormData, Feature, SerializedStore, SerializedFeature, Service, AvailabilitySlot } from '@/lib/types';
import { AppCategories } from '@/lib/types'; 
import { auth } from '@/lib/firebase';

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
    const { ownerId, ...storeDataForDB } = validatedFields.data;
    const newRawStore = await addStoreToDB(storeDataForDB as StoreFormData, ownerId || undefined); 
    const newSerializedStore = serializeStoreForClient(newRawStore);
    
    revalidatePath('/admin/stores');
    revalidatePath('/');
    revalidatePath(`/stores/${newSerializedStore.id}`);

    return { success: true, message: `Το κέντρο "${newSerializedStore.name}" προστέθηκε επιτυχώς.`, store: newSerializedStore };
  } catch (error) {
    console.error("Error adding store in addStoreAction:", error);
    return { success: false, message: "Αποτυχία προσθήκης κέντρου. Παρακαλώ δοκιμάστε ξανά." };
  }
}

export async function updateStoreAction(storeId: string, prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }> {
  console.log(`[updateStoreAction] Received request for storeId: ${storeId}`);
  console.log("[updateStoreAction] FormData entries:");
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  // Authentication check
  if (!auth.currentUser) {
    const authErrorMsg = "Σφάλμα: Ο χρήστης δεν είναι πιστοποιημένος στο πλαίσιο της ενέργειας διακομιστή. Η ενημέρωση απέτυχε.";
    console.error(`[updateStoreAction] ${authErrorMsg}`);
    return { success: false, message: authErrorMsg };
  }
  console.log(`[updateStoreAction] User ${auth.currentUser.email} is authenticated.`);


  const existingStore = await getStoreByIdFromDB(storeId);
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
    const storeDataForUpdate = validatedFields.data as Partial<StoreFormData & { ownerId?: string }>;
    console.log("[updateStoreAction] Calling updateStoreInDB with data:", storeDataForUpdate);
    const updatedRawStore = await updateStoreInDB(storeId, storeDataForUpdate);

    if (!updatedRawStore) {
      console.error(`[updateStoreAction] updateStoreInDB returned no store for ID: ${storeId}`);
      return { success: false, message: "Αποτυχία ενημέρωσης κέντρου. Το κέντρο δεν βρέθηκε." };
    }
    const updatedSerializedStore = serializeStoreForClient(updatedRawStore);
    
    revalidatePath('/admin/stores');
    revalidatePath('/');
    revalidatePath(`/stores/${storeId}`);

    console.log(`[updateStoreAction] Store "${updatedSerializedStore.name}" updated successfully.`);
    return { success: true, message: `Το κέντρο "${updatedSerializedStore.name}" ενημερώθηκε επιτυχώς.`, store: updatedSerializedStore };
  } catch (error: any) {
    console.error("[updateStoreAction] Error during store update process:", error);
    let message = "Αποτυχία ενημέρωσης κέντρου. Παρακαλώ δοκιμάστε ξανά.";
    if (error.message) {
        message += ` Λεπτομέρειες: ${error.message}`;
    }
     if (error.code && error.code === 'permission-denied') {
      message = "Σφάλμα: Άρνηση πρόσβασης. Δεν έχετε τα απαραίτητα δικαιώματα για αυτήν την ενέργεια.";
    }
    return { success: false, message: message };
  }
}

export async function deleteStoreAction(storeId: string): Promise<{ success: boolean; message: string }> {
  try {
    const success = await deleteStoreFromDB(storeId);
    if (success) {
      revalidatePath('/admin/stores');
      revalidatePath('/');
      revalidatePath(`/stores/${storeId}`); 
      return { success: true, message: "Το κέντρο διαγράφηκε επιτυχώς." };
    }
    return { success: false, message: "Αποτυχία διαγραφής κέντρου. Το κέντρο δεν βρέθηκε." };
  } catch (error) {
    console.error("Error deleting store:", error);
    return { success: false, message: "Αποτυχία διαγραφής κέντρου. Παρακαλώ δοκιμάστε ξανά." };
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
    const updatedRawStore = await updateStoreCategoryInDB(storeId, validatedCategory.data.category);
    if (!updatedRawStore) {
      return { success: false, message: "Αποτυχία ενημέρωσης κατηγορίας. Το κέντρο δεν βρέθηκε." };
    }
    const updatedSerializedStore = serializeStoreForClient(updatedRawStore);
    
    revalidatePath('/admin/stores');
    revalidatePath('/');
    revalidatePath(`/stores/${storeId}`);

    return { success: true, message: `Η κατηγορία του κέντρου "${updatedSerializedStore.name}" ενημερώθηκε επιτυχώς.`, store: updatedSerializedStore };
  } catch (error) {
    console.error("Error updating store category:", error);
    return { success: false, message: "Αποτυχία ενημέρωσης κατηγορίας. Παρακαλώ δοκιμάστε ξανά." };
  }
}
