
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { 
  addStoreToDB, 
  deleteStoreFromDB, 
  getStoreByIdFromDB, 
  updateStoreCategoryInDB, 
  updateStoreInDB 
} from '@/lib/storeService'; // Import Firestore service functions
import type { Store, StoreCategory, StoreFormData, Feature, SerializedStore, SerializedFeature } from '@/lib/types';
import { StoreCategories } from '@/lib/types';

// Helper function to convert Store to SerializedStore for client components
// (especially for features, as client might expect component icons if not careful)
// However, since Firestore stores icon names, this might just pass through if Store from DB already has string icons.
function serializeStoreForClient(store: Store): SerializedStore {
   // Assuming store.features from DB are already SerializedFeature[] (icon is string)
  return {
    ...store,
    features: store.features.map((feature): SerializedFeature => ({ // Ensure it matches SerializedFeature structure
        id: feature.id,
        name: feature.name,
        description: feature.description,
        icon: typeof feature.icon === 'string' ? feature.icon : undefined, // Ensure icon is string or undefined
    }))
  };
}


// Zod schema for store creation and update (without category)
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
});


export async function addStoreAction(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }> {
  const validatedFields = storeFormSchema.safeParse({
    name: formData.get('name'),
    logoUrl: formData.get('logoUrl'),
    bannerUrl: formData.get('bannerUrl'),
    description: formData.get('description'),
    longDescription: formData.get('longDescription'),
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
    // This data is Omit<StoreFormData, 'category'>
    const storeDataForDB = validatedFields.data as Omit<StoreFormData, 'category'>;
    const newRawStore = await addStoreToDB(storeDataForDB); 
    const newSerializedStore = serializeStoreForClient(newRawStore);
    
    revalidatePath('/admin/stores');
    revalidatePath('/');
    revalidatePath(`/stores/${newSerializedStore.id}`);

    return { success: true, message: `Το κέντρο "${newSerializedStore.name}" προστέθηκε επιτυχώς.`, store: newSerializedStore };
  } catch (error) {
    console.error("Error adding store:", error);
    return { success: false, message: "Αποτυχία προσθήκης κέντρου. Παρακαλώ δοκιμάστε ξανά." };
  }
}

export async function updateStoreAction(storeId: string, prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }> {
  const existingStore = await getStoreByIdFromDB(storeId);
  if (!existingStore) {
    return { success: false, message: "Το κέντρο δεν βρέθηκε." };
  }

  const validatedFields = storeFormSchema.safeParse({
    name: formData.get('name'),
    logoUrl: formData.get('logoUrl'),
    bannerUrl: formData.get('bannerUrl'),
    description: formData.get('description'),
    longDescription: formData.get('longDescription'),
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
    const storeDataForUpdate = validatedFields.data as Partial<Omit<StoreFormData, 'category'>>;
    const updatedRawStore = await updateStoreInDB(storeId, storeDataForUpdate);

    if (!updatedRawStore) {
      return { success: false, message: "Αποτυχία ενημέρωσης κέντρου. Το κέντρο δεν βρέθηκε." };
    }
    const updatedSerializedStore = serializeStoreForClient(updatedRawStore);
    
    revalidatePath('/admin/stores');
    revalidatePath('/');
    revalidatePath(`/stores/${storeId}`);

    return { success: true, message: `Το κέντρο "${updatedSerializedStore.name}" ενημερώθηκε επιτυχώς (εκτός κατηγορίας).`, store: updatedSerializedStore };
  } catch (error) {
    console.error("Error updating store:", error);
    return { success: false, message: "Αποτυχία ενημέρωσης κέντρου. Παρακαλώ δοκιμάστε ξανά." };
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
  category: z.enum(StoreCategories, { errorMap: () => ({ message: "Παρακαλώ επιλέξτε μια έγκυρη κατηγορία."}) }),
});

export async function updateStoreCategoryAction(
  storeId: string, 
  newCategory: StoreCategory
): Promise<{ success: boolean; message: string; store?: SerializedStore }> {
  const validatedCategory = categoryUpdateSchema.safeParse({ category: newCategory });

  if(!validatedCategory.success) {
    return {
      success: false,
      message: "Μη έγκυρη κατηγορία.",
    }
  }

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
