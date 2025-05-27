
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SerializedStore } from '@/lib/types'; 
import { StoreCategoriesSlugs, AppCategories } from '@/lib/types'; // Import for category validation
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useActionState, useState, useRef } from "react"; 
import Image from "next/image";

interface StoreFormProps {
  store?: SerializedStore;
  action: (prevState: any, formData: FormData) => Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }>;
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
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:mm format required"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:mm format required"),
  lunchBreakStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:mm format required").optional().or(z.literal('')),
  lunchBreakEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:mm format required").optional().or(z.literal('')),
});
const availabilityArraySchema = z.array(availabilitySlotSchema);

const clientStoreFormSchema = z.object({
  name: z.string().min(3, { message: "Το όνομα πρέπει να έχει τουλάχιστον 3 χαρακτήρες." }),
  description: z.string().min(10, { message: "Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες." }),
  longDescription: z.string().optional(),
  tagsInput: z.string().optional(), 
  categoriesInput: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true; // Allow empty or undefined
    const slugs = val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return slugs.every(slug => StoreCategoriesSlugs.includes(slug));
  }, { message: `Μία ή περισσότερες κατηγορίες δεν είναι έγκυρες. Έγκυρες τιμές: ${StoreCategoriesSlugs.join(', ')}` }),
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
  existingLogoUrl: z.string().optional(),
  existingBannerUrl: z.string().optional(),
});

type ClientStoreFormValues = z.infer<typeof clientStoreFormSchema>;

const initialFormState: { success: boolean; message: string; errors?: any; store?: SerializedStore } = { 
  success: false, 
  message: "", 
  errors: null, 
  store: undefined 
};

export function StoreForm({ store, action }: StoreFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [formState, formAction, isPending] = useActionState(action, initialFormState);

  const [logoPreview, setLogoPreview] = useState<string | null>(store?.logoUrl || null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(store?.bannerUrl || null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const form = useForm<ClientStoreFormValues>({
    resolver: zodResolver(clientStoreFormSchema),
    defaultValues: store
      ? {
          name: store.name,
          description: store.description,
          longDescription: store.longDescription || '',
          tagsInput: store.tags?.join(', ') || '',
          categoriesInput: store.categories?.join(', ') || '', // For multiple categories
          contactEmail: store.contactEmail || '',
          websiteUrl: store.websiteUrl || '',
          address: store.address || '',
          ownerId: store.ownerId || '',
          servicesJson: store.services ? JSON.stringify(store.services, null, 2) : '[]',
          availabilityJson: store.availability ? JSON.stringify(store.availability.map(slot => ({
            ...slot,
            lunchBreakStartTime: slot.lunchBreakStartTime || undefined,
            lunchBreakEndTime: slot.lunchBreakEndTime || undefined,
          })), null, 2) : '[]',
          existingLogoUrl: store.logoUrl || '',
          existingBannerUrl: store.bannerUrl || '',
        }
      : {
          name: "",
          description: "",
          longDescription: "",
          tagsInput: "",
          categoriesInput: "", // For multiple categories
          contactEmail: "",
          websiteUrl: "",
          address: "",
          ownerId: "",
          servicesJson: '[]',
          availabilityJson: '[]',
          existingLogoUrl: '',
          existingBannerUrl: '',
        },
  });
  
  useEffect(() => {
    if (formState.success) {
      toast({
        title: store ? "Επιτυχής Ενημέρωση" : "Επιτυχής Προσθήκη",
        description: formState.message,
      });
      router.push('/admin/stores');
    } else if (formState.message && !formState.success && formState.errors) {
       toast({
        title: "Σφάλμα Φόρμας",
        description: formState.message,
        variant: "destructive",
      });
      Object.keys(formState.errors).forEach((key) => {
        const fieldKey = key as keyof ClientStoreFormValues;
        if (clientStoreFormSchema.shape.hasOwnProperty(fieldKey)) {
            const message = formState.errors[key as keyof typeof formState.errors]?.[0];
            if (message) {
                form.setError(fieldKey, { type: 'server', message });
            }
        }
      });
    } else if (formState.message && !formState.success && !formState.errors) {
        toast({
            title: "Σφάλμα",
            description: formState.message,
            variant: "destructive",
        });
    }
  }, [formState, toast, router, store, form]);

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(store?.logoUrl || null); 
    }
  };

  const handleBannerFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBannerPreview(URL.createObjectURL(file));
    } else {
      setBannerPreview(store?.bannerUrl || null); 
    }
  };

  const exampleServiceJson = JSON.stringify([
    { id: "service1", name: "Αλλαγή Λαδιών", description: "Συνθετικά λάδια και φίλτρο.", durationMinutes: 60, price: 50, availableDaysOfWeek: [1,2,3,4,5] },
    { id: "service2", name: "Έλεγχος Φρένων", description: "Έλεγχος και καθαρισμός.", durationMinutes: 45, price: 30, availableDaysOfWeek: [1,2,3,4,5,6] }
  ], null, 2);

  const exampleAvailabilityJson = JSON.stringify([
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", lunchBreakStartTime: "13:00", lunchBreakEndTime: "14:00" },
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", lunchBreakStartTime: "12:30", lunchBreakEndTime: "13:00" },
  ], null, 2);

  const availableCategorySlugs = AppCategories.map(cat => cat.slug).join(', ');

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">
          {store ? `Επεξεργασία Κέντρου: ${store.name}` : "Προσθήκη Νέου Κέντρου"}
        </CardTitle>
        <CardDescription>
          {store ? "Ενημερώστε τα στοιχεία του υπάρχοντος κέντρου." : "Συμπληρώστε τα στοιχεία για το νέο κέντρο εξυπηρέτησης."}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form action={formAction} className="space-y-6">
          <input type="hidden" {...form.register("existingLogoUrl")} />
          <input type="hidden" {...form.register("existingBannerUrl")} />
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Όνομα Κέντρου</FormLabel>
                  <FormControl>
                    <Input placeholder="π.χ. ΤαχύFix Αυτοκινήτων" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Λογότυπο</FormLabel>
              {logoPreview && (
                <div className="mt-2 mb-2">
                  <Image src={logoPreview} alt="Προεπισκόπηση Λογοτύπου" width={100} height={100} className="rounded-md border object-cover" data-ai-hint="logo store"/>
                </div>
              )}
              <FormControl>
                <Input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  name="logoFile"
                  ref={logoFileRef}
                  onChange={handleLogoFileChange}
                />
              </FormControl>
              <FormDescription>Προτεινόμενο μέγεθος: 100x100 pixels. Μέγιστο μέγεθος αρχείου: 2MB.</FormDescription>
              <FormMessage />
            </FormItem>

            <FormItem>
              <FormLabel>Banner (Προαιρετικό)</FormLabel>
              {bannerPreview && (
                <div className="mt-2 mb-2">
                  <Image src={bannerPreview} alt="Προεπισκόπηση Banner" width={300} height={100} className="rounded-md border object-cover" data-ai-hint="banner store"/>
                </div>
              )}
              <FormControl>
                <Input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  name="bannerFile" 
                  ref={bannerFileRef}
                  onChange={handleBannerFileChange}
                />
              </FormControl>
              <FormDescription>Προτεινόμενο μέγεθος: 800x300 pixels. Μέγιστο μέγεθος αρχείου: 2MB.</FormDescription>
              <FormMessage />
            </FormItem>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Σύντομη Περιγραφή</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Μια σύντομη περιγραφή του κέντρου (έως 150 χαρακτήρες)." {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="longDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Αναλυτική Περιγραφή (Προαιρετικό)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Μια πιο λεπτομερής περιγραφή των υπηρεσιών και της φιλοσοφίας του κέντρου." {...field} rows={6} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="categoriesInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Κατηγορίες</FormLabel>
                  <FormControl>
                    <Input placeholder="π.χ. mechanic, electrician" {...field} />
                  </FormControl>
                  <FormDescription>Καταχωρίστε κατηγορίες χωρισμένες με κόμμα. Διαθέσιμες κατηγορίες: {availableCategorySlugs}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tagsInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ετικέτες (Tags)</FormLabel>
                  <FormControl>
                    <Input placeholder="π.χ. φρένα, αλλαγή λαδιών, ηλεκτρολογικά" {...field} />
                  </FormControl>
                  <FormDescription>Καταχωρίστε ετικέτες χωρισμένες με κόμμα.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Επικοινωνίας (Προαιρετικό)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Ιστοσελίδας (Προαιρετικό)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Διεύθυνση (Προαιρετικό)</FormLabel>
                  <FormControl>
                    <Input placeholder="Οδός Παραδείγματος 123, Πόλη" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner User ID (Firebase UID - Προαιρετικό)</FormLabel>
                  <FormControl>
                    <Input placeholder="Firebase UID του ιδιοκτήτη" {...field} />
                  </FormControl>
                  <FormDescription>Αντιστοιχίστε έναν χρήστη ως ιδιοκτήτη αυτού του κέντρου.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="servicesJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Υπηρεσίες (JSON format)</FormLabel>
                  <FormControl>
                    <Textarea placeholder={exampleServiceJson} {...field} rows={8} />
                  </FormControl>
                  <FormDescription>
                    Εισάγετε έναν πίνακα από αντικείμενα υπηρεσιών σε μορφή JSON. Κάθε υπηρεσία πρέπει να έχει:
                    id (string), name (string), description (string), durationMinutes (number), price (number), availableDaysOfWeek (array of numbers 0-6, 0=Κυριακή, 1=Δευτέρα κ.ο.κ.).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="availabilityJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Εβδομαδιαία Διαθεσιμότητα (JSON format)</FormLabel>
                  <FormControl>
                    <Textarea placeholder={exampleAvailabilityJson} {...field} rows={10} />
                  </FormControl>
                  <FormDescription>
                    Εισάγετε έναν πίνακα από αντικείμενα διαθεσιμότητας σε μορφή JSON. Κάθε αντικείμενο πρέπει να έχει:
                    dayOfWeek (number 0-6, 0=Κυριακή, 1=Δευτέρα κ.ο.κ.), startTime (string "HH:mm"), endTime (string "HH:mm").
                    Προαιρετικά: lunchBreakStartTime (string "HH:mm"), lunchBreakEndTime (string "HH:mm").
                    <pre className="mt-2 p-2 bg-muted text-xs rounded-md overflow-x-auto">
                      {`Παράδειγμα:\n${exampleAvailabilityJson}`}
                    </pre>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()} className="mr-2" disabled={isPending}>
              Άκυρο
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (store ? "Ενημέρωση..." : "Προσθήκη...") : (store ? "Αποθήκευση Αλλαγών" : "Προσθήκη Κέντρου")}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
