
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addStoreToMockData, deleteStoreFromMockData, getStoreById, updateStoreInMockData } from '@/lib/placeholder-data';
import type { Store, StoreCategory, StoreFormData } from '@/lib/types';
import { StoreCategories } from '@/lib/types';

// Zod schema for store creation and update
// Note: For simplicity, we're not validating complex nested structures like pricingPlans, features, products here.
// These would typically be managed via separate forms/actions in a more complex admin panel.
const storeFormSchema = z.object({
  name: z.string().min(3, { message: "Το όνομα πρέπει να έχει τουλάχιστον 3 χαρακτήρες." }),
  logoUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για το λογότυπο." }),
  bannerUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για το banner." }).optional().or(z.literal('')),
  description: z.string().min(10, { message: "Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες." }),
  longDescription: z.string().optional(),
  category: z.enum(StoreCategories, { errorMap: () => ({ message: "Παρακαλώ επιλέξτε μια έγκυρη κατηγορία."}) }),
  tagsInput: z.string().optional(), // Comma-separated tags
  contactEmail: z.string().email({ message: "Παρακαλώ εισάγετε ένα έγκυρο email επικοινωνίας." }).optional().or(z.literal('')),
  websiteUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL ιστοσελίδας." }).optional().or(z.literal('')),
  address: z.string().optional(),
});


export async function addStoreAction(prevState: any, formData: FormData) {
  const validatedFields = storeFormSchema.safeParse({
    name: formData.get('name'),
    logoUrl: formData.get('logoUrl'),
    bannerUrl: formData.get('bannerUrl'),
    description: formData.get('description'),
    longDescription: formData.get('longDescription'),
    category: formData.get('category'),
    tagsInput: formData.get('tagsInput'),
    contactEmail: formData.get('contactEmail'),
    websiteUrl: formData.get('websiteUrl'),
    address: formData.get('address'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Σφάλμα επικύρωσης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // The data is valid, create the store object
    const storeData = validatedFields.data as StoreFormData;
    const newStore = addStoreToMockData(storeData);
    
    revalidatePath('/admin/stores'); // Revalidate the stores list page
    revalidatePath('/'); // Revalidate home page if it lists stores
    revalidatePath(`/stores/${newStore.id}`); // Revalidate the new store's detail page

    return { success: true, message: `Το κέντρο "${newStore.name}" προστέθηκε επιτυχώς.`, store: newStore };
  } catch (error) {
    console.error("Error adding store:", error);
    return { success: false, message: "Αποτυχία προσθήκης κέντρου. Παρακαλώ δοκιμάστε ξανά." };
  }
}

export async function updateStoreAction(storeId: string, prevState: any, formData: FormData) {
  const existingStore = getStoreById(storeId);
  if (!existingStore) {
    return { success: false, message: "Το κέντρο δεν βρέθηκε." };
  }

  const validatedFields = storeFormSchema.safeParse({
    name: formData.get('name'),
    logoUrl: formData.get('logoUrl'),
    bannerUrl: formData.get('bannerUrl'),
    description: formData.get('description'),
    longDescription: formData.get('longDescription'),
    category: formData.get('category'),
    tagsInput: formData.get('tagsInput'),
    contactEmail: formData.get('contactEmail'),
    websiteUrl: formData.get('websiteUrl'),
    address: formData.get('address'),
  });

  if (!validatedFields.success) {
     return {
      success: false,
      message: "Σφάλμα επικύρωσης.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  try {
    const storeData = validatedFields.data as Partial<StoreFormData>;
    const updatedStore = updateStoreInMockData(storeId, storeData);

    if (!updatedStore) {
      return { success: false, message: "Αποτυχία ενημέρωσης κέντρου. Το κέντρο δεν βρέθηκε." };
    }
    
    revalidatePath('/admin/stores');
    revalidatePath('/');
    revalidatePath(`/stores/${storeId}`);

    return { success: true, message: `Το κέντρο "${updatedStore.name}" ενημερώθηκε επιτυχώς.`, store: updatedStore };
  } catch (error) {
    console.error("Error updating store:", error);
    return { success: false, message: "Αποτυχία ενημέρωσης κέντρου. Παρακαλώ δοκιμάστε ξανά." };
  }
}

export async function deleteStoreAction(storeId: string): Promise<{ success: boolean; message: string }> {
  try {
    const success = deleteStoreFromMockData(storeId);
    if (success) {
      revalidatePath('/admin/stores');
      revalidatePath('/');
      // Note: Revalidating a deleted store's detail page might lead to 404, which is expected.
      revalidatePath(`/stores/${storeId}`); 
      return { success: true, message: "Το κέντρο διαγράφηκε επιτυχώς." };
    }
    return { success: false, message: "Αποτυχία διαγραφής κέντρου. Το κέντρο δεν βρέθηκε." };
  } catch (error) {
    console.error("Error deleting store:", error);
    return { success: false, message: "Αποτυχία διαγραφής κέντρου. Παρακαλώ δοκιμάστε ξανά." };
  }
}
