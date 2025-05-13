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
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useActionState } from "react"; 

interface StoreFormProps {
  store?: SerializedStore;
  action: (prevState: any, formData: FormData) => Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }>;
}

// Client-side schema without category
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
  ownerId: z.string().optional().or(z.literal('')), // Firebase UID of the store owner
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
        },
  });
  
  useEffect(() => {
    if (formState.success) {
      toast({
        title: store ? "Επιτυχής Ενημέρωση" : "Επιτυχής Προσθήκη",
        description: formState.message,
      });
      
      if (store) { 
        router.push('/admin/stores');
      } else { 
        router.push('/admin/stores');
      }
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

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">
          {store ? `Επεξεργασία Κέντρου: ${store.name}` : "Προσθήκη Νέου Κέντρου"}
        </CardTitle>
        <CardDescription>
          {store ? "Ενημερώστε τα στοιχεία του υπάρχοντος κέντρου. Η κατηγορία αλλάζει από τη λίστα κέντρων." : "Συμπληρώστε τα στοιχεία για το νέο κέντρο εξυπηρέτησης. Η κατηγορία μπορεί να οριστεί από τη λίστα κέντρων μετά την προσθήκη."}
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
