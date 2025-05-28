
"use client";

import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Control, UseFormWatch } from "react-hook-form"; // Added Control, UseFormWatch
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SerializedStore, StoreCategory } from '@/lib/types';
import { AppCategories, StoreCategoriesSlugs } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React, { useEffect, useActionState, useState, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

const DynamicStoreMap = dynamic(() =>
  import('./StoreMap').then((mod) => mod.StoreMap), {
  ssr: false,
  loading: () => <div className="h-80 w-full flex items-center justify-center bg-muted rounded-md"><p>Φόρτωση χάρτη...</p></div>,
});

// ===========================================
// *** START: Zod Schema and Types ***
// ===========================================

const clientStoreFormSchema = z.object({
  name: z.string().min(3, "Το όνομα είναι υποχρεωτικό και πρέπει να έχει τουλάχιστον 3 χαρακτήρες."),
  description: z.string().min(10, "Η περιγραφή είναι υποχρεωτική και πρέπει να έχει τουλάχιστον 10 χαρακτήρες."),
  longDescription: z.string().optional(),
  tagsInput: z.string().optional(),
  categoriesInput: z.string().refine(val => {
    if (!val || val.trim() === "") return true; // Allow empty for no categories selected
    const slugs = val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return slugs.every(slug => StoreCategoriesSlugs.includes(slug));
  }, { message: `Μία ή περισσότερες κατηγορίες δεν είναι έγκυρες. Έγκυρες τιμές: ${StoreCategoriesSlugs.join(', ')}` }).optional(),
  contactEmail: z.string().email("Εισάγετε ένα έγκυρο email.").optional().or(z.literal('')),
  websiteUrl: z.string().url("Εισάγετε μια έγκυρη διεύθυνση URL.").optional().or(z.literal('')),
  address: z.string().optional(),
  latitude: z.string().superRefine((val, ctx) => {
    if (!val || val.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Το Γεωγραφικό Πλάτος είναι υποχρεωτικό.",
        path: ctx.path,
      });
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || num < -90 || num > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Εισάγετε ένα έγκυρο γεωγραφικό πλάτος (-90 έως 90).",
        path: ctx.path,
      });
    }
  }),
  longitude: z.string().superRefine((val, ctx) => {
    if (!val || val.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Το Γεωγραφικό Μήκος είναι υποχρεωτικό.",
        path: ctx.path,
      });
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || num < -180 || num > 180) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Εισάγετε ένα έγκυρο γεωγραφικό μήκος (-180 έως 180).",
        path: ctx.path,
      });
    }
  }),
  ownerId: z.string().optional(),
  servicesJson: z.string().refine((val) => {
    if (!val || val.trim() === "") return true; // Allow empty string for no services
    try {
      const parsed = JSON.parse(val);
      const isValid = Array.isArray(parsed) && parsed.every(item =>
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.description === 'string' &&
        typeof item.durationMinutes === 'number' &&
        typeof item.price === 'number' &&
        Array.isArray(item.availableDaysOfWeek) && item.availableDaysOfWeek.every((day: any) => typeof day === 'number' && day >= 0 && day <= 6)
      );
      return isValid;
    } catch (e) {
      return false;
    }
  }, {
    message: "Το JSON των υπηρεσιών δεν είναι έγκυρο ή δεν έχει τη σωστή μορφή."
  }).optional(),
  availabilityJson: z.string().refine((val) => {
    if (!val || val.trim() === "") return true; // Allow empty string for no availability
    try {
      const parsed = JSON.parse(val);
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      const isValid = Array.isArray(parsed) && parsed.every(item =>
        typeof item.dayOfWeek === 'number' && item.dayOfWeek >= 0 && item.dayOfWeek <= 6 &&
        (typeof item.startTime === 'string' && (item.startTime === '' || timeRegex.test(item.startTime))) &&
        (typeof item.endTime === 'string' && (item.endTime === '' || timeRegex.test(item.endTime))) &&
        (item.lunchBreakStartTime === undefined || item.lunchBreakStartTime === '' || (typeof item.lunchBreakStartTime === 'string' && timeRegex.test(item.lunchBreakStartTime))) &&
        (item.lunchBreakEndTime === undefined || item.lunchBreakEndTime === '' || (typeof item.lunchBreakEndTime === 'string' && timeRegex.test(item.lunchBreakEndTime)))
      );
      return isValid;
    } catch (e) {
      return false;
    }
  }, {
    message: "Το JSON διαθεσιμότητας δεν είναι έγκυρο ή δεν έχει τη σωστή μορφή."
  }).optional(),
  logoFile: z.instanceof(File).optional(),
  bannerFile: z.instanceof(File).optional(),
  existingLogoUrl: z.string().optional(),
  existingBannerUrl: z.string().optional(),
});

type ClientStoreFormValues = z.infer<typeof clientStoreFormSchema>;

interface ActionFormState {
  success: boolean;
  message: string;
  errors?: Partial<Record<keyof ClientStoreFormValues, string[]>>;
  store?: SerializedStore; // Added store to state for add action
}

interface StoreFormProps {
  store?: SerializedStore;
  action: (
    prevState: ActionFormState,
    formData: FormData
  ) => Promise<ActionFormState>;
}

const initialFormState: ActionFormState = {
  success: false,
  message: '',
  errors: undefined,
  store: undefined,
};

// ===========================================
// *** END: Zod Schema and Types ***
// ===========================================


export function StoreForm({ store, action }: StoreFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [formState, formAction, isPending] = useActionState<ActionFormState, FormData>(action, initialFormState);

  const [currentLogoUrl, setCurrentLogoUrl] = useState(store?.logoUrl || null);
  const [currentBannerUrl, setCurrentBannerUrl] = useState(store?.bannerUrl || null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const form = useForm<ClientStoreFormValues>({
    resolver: zodResolver(clientStoreFormSchema),
    defaultValues: store ? {
      name: store.name,
      description: store.description,
      longDescription: store.longDescription ?? '',
      tagsInput: store.tags?.join(', ') ?? '',
      categoriesInput: store.categories?.join(',') ?? '',
      contactEmail: store.contactEmail ?? '',
      websiteUrl: store.websiteUrl ?? '',
      address: store.address ?? '',
      latitude: store.location?.latitude?.toString() ?? '37.9838', 
      longitude: store.location?.longitude?.toString() ?? '23.7275',
      ownerId: store.ownerId ?? '',
      servicesJson: store.services && store.services.length > 0 ? JSON.stringify(store.services, null, 2) : '[]',
      availabilityJson: store.availability && store.availability.length > 0 ? JSON.stringify(store.availability, null, 2) : '[]',
      existingLogoUrl: store.logoUrl ?? '',
      existingBannerUrl: store.bannerUrl ?? '',
    } : {
      name: '',
      description: '',
      longDescription: '',
      tagsInput: '',
      categoriesInput: '',
      contactEmail: '',
      websiteUrl: '',
      address: '',
      latitude: '37.9838', 
      longitude: '23.7275',
      ownerId: '',
      servicesJson: '[]',
      availabilityJson: JSON.stringify([
        { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
        { "dayOfWeek": 2, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
        { "dayOfWeek": 3, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
        { "dayOfWeek": 4, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
        { "dayOfWeek": 5, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
        { "dayOfWeek": 6, "startTime": "10:00", "endTime": "14:00" , "lunchBreakStartTime": "", "lunchBreakEndTime": ""},
        { "dayOfWeek": 0, "startTime": "", "endTime": "" , "lunchBreakStartTime": "", "lunchBreakEndTime": ""}
      ], null, 2),
      existingLogoUrl: '',
      existingBannerUrl: '',
    },
  });

  useEffect(() => {
    if (!isPending && formState.message) {
      if (formState.success) {
        toast({
          title: store ? "Επιτυχής Ενημέρωση" : "Επιτυχής Προσθήκη",
          description: formState.message,
        });
        router.push("/admin/stores");
      } else {
        toast({
          title: "Σφάλμα",
          description: formState.message,
          variant: "destructive",
        });
        // Ensure errors object exists and has keys before processing
        if (formState.errors && Object.keys(formState.errors).length > 0) {
          console.error("[StoreForm] Server-side validation errors received:", JSON.stringify(formState.errors, null, 2));
          if (formState.errors.latitude) console.error("[StoreForm] Latitude server error:", formState.errors.latitude);
          if (formState.errors.longitude) console.error("[StoreForm] Longitude server error:", formState.errors.longitude);

          Object.entries(formState.errors).forEach(([key, value]) => {
            const fieldKey = key as keyof ClientStoreFormValues;
            const message = Array.isArray(value) ? value.join(", ") : String(value);
            if (form.getFieldState(fieldKey)) { // Check if field exists in form
                 form.setError(fieldKey, { type: "server", message });
            } else {
                console.warn(`[StoreForm] Attempted to set error on non-existent field '${fieldKey}'`);
            }
          });
        }
      }
    }
  }, [formState, isPending, store, router, toast, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'logo') setCurrentLogoUrl(reader.result as string);
        if (type === 'banner') setCurrentBannerUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const watchedCategoriesInput = form.watch('categoriesInput');
  console.log("[StoreForm] Current categoriesInput value (watched):", watchedCategoriesInput);


  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>{store ? `Επεξεργασία Κέντρου: ${store.name}` : "Προσθήκη Νέου Κέντρου"}</CardTitle>
        <CardDescription>Συμπληρώστε τα στοιχεία για το κέντρο.</CardDescription>
      </CardHeader>

      <Form {...form}>
         <form action={formAction} className="space-y-6">
           <input type="hidden" {...form.register("existingLogoUrl")} />
           <input type="hidden" {...form.register("existingBannerUrl")} />
           <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Όνομα Κέντρου</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. AutoFix Πάτρας" {...field} />
                    </FormControl>
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
                      <Textarea placeholder="π.χ. Εξειδικευμένο συνεργείο για ευρωπαϊκά αυτοκίνητα." {...field} />
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
                      <Textarea placeholder="Περισσότερες λεπτομέρειες για τις υπηρεσίες, την ιστορία, κ.λπ." {...field} rows={5}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Λογότυπο</FormLabel>
                {currentLogoUrl && <Image src={currentLogoUrl} alt="Προεπισκόπηση Λογοτύπου" width={100} height={100} className="border rounded-md my-2" data-ai-hint="logo store"/>}
                <Input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    {...form.register("logoFile")} 
                />
                <FormDescription className="text-xs">PNG, JPG, WebP. Μέγιστο 2MB.</FormDescription>
              </FormItem>

              <FormItem>
                <FormLabel>Banner</FormLabel>
                {currentBannerUrl && <Image src={currentBannerUrl} alt="Προεπισκόπηση Banner" width={300} height={100} className="border rounded-md my-2 object-cover" data-ai-hint="banner store"/>}
                <Input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                     {...form.register("bannerFile")} 
                />
                <FormDescription className="text-xs">PNG, JPG, WebP. Μέγιστο 2MB.</FormDescription>
              </FormItem>

              <FormField
                control={form.control}
                name="tagsInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ετικέτες (Tags - Προαιρετικό)</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. φρένα, service, toyota, audi" {...field} />
                    </FormControl>
                    <FormDescription>Διαχωρίστε τις ετικέτες με κόμμα.</FormDescription>
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
                  <div className="space-y-2 p-2 border rounded-md max-h-48 overflow-y-auto">
                    {AppCategories.map((category) => {
                      const currentSelectedSlugs = field.value?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) || [];
                      const isChecked = currentSelectedSlugs.includes(category.slug);
                      return (
                        <FormItem key={category.slug} className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                let updatedSlugs = [...currentSelectedSlugs];
                                if (checked) {
                                  if (!updatedSlugs.includes(category.slug)) {
                                    updatedSlugs.push(category.slug);
                                  }
                                } else {
                                  updatedSlugs = updatedSlugs.filter(s => s !== category.slug);
                                }
                                field.onChange(updatedSlugs.join(','));
                                console.log("[StoreForm] categoriesInput changed to:", updatedSlugs.join(','));
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {category.translatedName}
                          </FormLabel>
                        </FormItem>
                      );
                    })}
                  </div>
                  <FormDescription>Επιλέξτε μία ή περισσότερες κατηγορίες.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <div className="space-y-6">
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
                    <FormLabel>Ιστοσελίδα (Προαιρετικό)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://www.example.com" {...field} />
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
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Γεωγραφικό Πλάτος (Latitude)</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. 37.9838" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Γεωγραφικό Μήκος (Longitude)</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. 23.7275" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="h-80 w-full rounded-md overflow-hidden border">
                <DynamicStoreMap
                  key={store?.id ? `edit-map-${store.id}` : "new-store-map"}
                  latitude={parseFloat(form.watch("latitude") || '0')}
                  longitude={parseFloat(form.watch("longitude") || '0')}
                  onCoordinatesChange={(lat, lng) => {
                    form.setValue("latitude", lat.toFixed(6));
                    form.setValue("longitude", lng.toFixed(6));
                  }}
                />
              </div>
               <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner User ID (Firebase UID - Προαιρετικό)</FormLabel>
                    <FormControl>
                      <Input placeholder="UID του ιδιοκτήτη από Firebase Auth" {...field} />
                    </FormControl>
                      <FormDescription>Αφήστε κενό αν δεν αντιστοιχεί σε συγκεκριμένο χρήστη.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="md:col-span-2 space-y-6">
                <FormField
                    control={form.control}
                    name="servicesJson"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Υπηρεσίες (JSON format)</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder={JSON.stringify([{"id": "service1", "name": "Όνομα Υπηρεσίας", "description": "Περιγραφή", "durationMinutes": 60, "price": 50, "availableDaysOfWeek": [1,2,3,4,5]}], null, 2)}
                            {...field}
                            rows={8}
                        />
                        </FormControl>
                        <FormDescription>
                            Εισάγετε τις υπηρεσίες σε μορφή JSON array. Κάθε υπηρεσία πρέπει να έχει: id (string), name (string), description (string), durationMinutes (number), price (number), availableDaysOfWeek (array of numbers, 0=Κυριακή, 1=Δευτέρα...).
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
                        <Textarea
                            placeholder={JSON.stringify([
                                { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
                                { "dayOfWeek": 2, "startTime": "09:00", "endTime": "17:00" },
                                { "dayOfWeek": 0, "startTime": "", "endTime": "" } // Κυριακή - Κλειστά
                              ], null, 2)}
                            {...field}
                            rows={8}
                        />
                        </FormControl>
                        <FormDescription>
                            Εισάγετε το πρόγραμμα σε μορφή JSON array. Κάθε αντικείμενο: dayOfWeek (0-6, 0=Κυριακή), startTime (HH:mm), endTime (HH:mm), προαιρετικά lunchBreakStartTime (HH:mm), lunchBreakEndTime (HH:mm). Για κλειστές μέρες, αφήστε startTime/endTime κενά.
                            <pre className="mt-2 p-2 bg-muted rounded text-xs whitespace-pre-wrap">
{`Παράδειγμα:
[
  { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
  { "dayOfWeek": 2, "startTime": "09:00", "endTime": "17:00" },
  { "dayOfWeek": 3, "startTime": "09:00", "endTime": "17:00" },
  { "dayOfWeek": 4, "startTime": "09:00", "endTime": "17:00" },
  { "dayOfWeek": 5, "startTime": "09:00", "endTime": "17:00" },
  { "dayOfWeek": 6, "startTime": "10:00", "endTime": "14:00" },
  { "dayOfWeek": 0, "startTime": "", "endTime": "" } // Κυριακή - Κλειστά
]`}
                            </pre>
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end p-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="mr-2"
              disabled={isPending}
            >
              Άκυρο
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? store
                  ? "Ενημέρωση..."
                  : "Προσθήκη..."
                : store
                  ? "Αποθήκευση Αλλαγών"
                  : "Προσθήκη Κέντρου"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
