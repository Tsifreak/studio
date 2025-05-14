
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
import type { SerializedStore, Service, AvailabilitySlot } from '@/lib/types'; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useActionState } from "react"; 

interface StoreFormProps {
  store?: SerializedStore;
  action: (prevState: any, formData: FormData) => Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }>;
}

// Zod schema for JSON validation (client-side, also validated server-side)
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
  dayOfWeek: z.number().int().min(0).max(6), // 0 (Sunday) - 6 (Saturday)
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:mm format required"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:mm format required"),
  lunchBreakStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:mm format required").optional(),
  lunchBreakEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:mm format required").optional(),
});
const availabilityArraySchema = z.array(availabilitySlotSchema);


// Client-side schema without category, includes JSON fields for services/availability
const clientStoreFormSchema = z.object({
  name: z.string().min(3, { message: "Το όνομα πρέπει να έχει τουλάχιστον 3 χαρακτήρες." }),
  logoUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για το λογότυπο." }).default('https://picsum.photos/seed/new_store_logo/100/100'),
  bannerUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για το banner." }).optional().or(z.literal('')).default('https://picsum.photos/seed/new_store_banner/800/300'),
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

  const form = useForm<ClientStoreFormValues>({
    resolver: zodResolver(clientStoreFormSchema),
    defaultValues: store
      ? {
          name: store.name,
          logoUrl: store.logoUrl,
          bannerUrl: store.bannerUrl || '',
          description: store.description,
          longDescription: store.longDescription || '',
          tagsInput: store.tags?.join(', ') || '',
          contactEmail: store.contactEmail || '',
          websiteUrl: store.websiteUrl || '',
          address: store.address || '',
          ownerId: store.ownerId || '',
          servicesJson: store.services ? JSON.stringify(store.services, null, 2) : '[]',
          availabilityJson: store.availability ? JSON.stringify(store.availability, null, 2) : '[]',
        }
      : {
          name: "",
          logoUrl: "https://picsum.photos/seed/new_logo/100/100",
          bannerUrl: "https://picsum.photos/seed/new_banner/800/300",
          description: "",
          longDescription: "",
          tagsInput: "",
          contactEmail: "",
          websiteUrl: "",
          address: "",
          ownerId: "",
          servicesJson: '[]',
          availabilityJson: '[]',
        },
  });
  
  useEffect(() => {
    if (formState.success) {
      toast({
        title: store ? "Επιτυχής Ενημέρωση" : "Επιτυχής Προσθήκη",
        description: formState.message,
      });
      router.push('/admin/stores');
      router.refresh(); 
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

  const exampleServiceJson = JSON.stringify([
    { id: "service1", name: "Αλλαγή Λαδιών", description: "Συνθετικά λάδια και φίλτρο.", durationMinutes: 60, price: 50, availableDaysOfWeek: [1,2,3,4,5] },
    { id: "service2", name: "Έλεγχος Φρένων", description: "Έλεγχος και καθαρισμός.", durationMinutes: 45, price: 30, availableDaysOfWeek: [1,2,3,4,5,6] }
  ], null, 2);

  const exampleAvailabilityJson = JSON.stringify([
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", lunchBreakStartTime: "13:00", lunchBreakEndTime: "14:00" },
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 6, startTime: "10:00", endTime: "14:00" }
  ], null, 2);


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

            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Λογοτύπου</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/logo.png" {...field} />
                  </FormControl>
                   <FormDescription>Προτεινόμενο μέγεθος: 100x100 pixels.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="bannerUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Banner (Προαιρετικό)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/banner.png" {...field} />
                  </FormControl>
                   <FormDescription>Προτεινόμενο μέγεθος: 800x300 pixels.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    id (string), name (string), description (string), durationMinutes (number), price (number), availableDaysOfWeek (array of numbers 0-6, 0=Κυριακή).
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
                    <Textarea placeholder={exampleAvailabilityJson} {...field} rows={6} />
                  </FormControl>
                  <FormDescription>
                    Εισάγετε έναν πίνακα από αντικείμενα διαθεσιμότητας σε μορφή JSON. Κάθε αντικείμενο πρέπει να έχει:
                    dayOfWeek (number 0-6), startTime (string "HH:mm"), endTime (string "HH:mm"), προαιρετικά lunchBreakStartTime/EndTime.
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
