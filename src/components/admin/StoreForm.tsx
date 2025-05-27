
"use client";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SerializedStore, StoreCategory } from '@/lib/types';
import { AppCategories, StoreCategoriesSlugs } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React, { useEffect, useActionState, useState, useRef } from "react";
import Image from "next/image";
import dynamic from 'next/dynamic';

// Dynamically import react-leaflet components with SSR disabled
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
  loading: () => <div className="h-80 w-full flex items-center justify-center bg-muted rounded-md"><p>Φόρτωση χάρτη...</p></div>,
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });

// LocationPicker uses a hook, so it's defined here and will only run client-side
// as a child of the dynamically imported MapContainer.
// For useMapEvents to be dynamically imported correctly if it were standalone,
// it would need its own dynamic import wrapper if not a child of a dynamically imported component.
// Here, it's fine as a child.
const ReactLeaflet = await import('react-leaflet'); // For useMapEvents
const useMapEvents = ReactLeaflet.useMapEvents;

interface StoreFormProps {
  store?: SerializedStore;
  action: (prevState: any, formData: FormData) => Promise<{ success: boolean; message: string; errors?: any; store?: SerializedStore }>;
}

function LocationPicker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
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

const clientStoreFormSchema = z.object({
  name: z.string().min(3, { message: "Το όνομα πρέπει να έχει τουλάχιστον 3 χαρακτήρες." }),
  description: z.string().min(10, { message: "Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες." }),
  longDescription: z.string().optional(),
  tagsInput: z.string().optional(),
  categoriesInput: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true; // Allow empty or undefined
    const slugs = val.split(',').map(s => s.trim().toLowerCase());
    return slugs.every(slug => StoreCategoriesSlugs.includes(slug));
  }, { message: `Μία ή περισσότερες κατηγορίες δεν είναι έγκυρες. Έγκυρες τιμές: ${StoreCategoriesSlugs.join(', ')}` }),
  contactEmail: z.string().email({ message: "Παρακαλώ εισάγετε ένα έγκυρο email επικοινωνίας." }).optional().or(z.literal('')),
  websiteUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL ιστοσελίδας." }).optional().or(z.literal('')),
  latitude: z.string().refine(val => !isNaN(parseFloat(val)), { message: "Μη έγκυρο γεωγραφικό πλάτος" }),
  longitude: z.string().refine(val => !isNaN(parseFloat(val)), { message: "Μη έγκυρο γεωγραφικό μήκος" }),
  address: z.string().optional(),
  ownerId: z.string().optional().or(z.literal('')),
  servicesJson: z.string().optional().refine((val) => {
    if (!val?.trim()) return true;
    try {
      servicesArraySchema.parse(JSON.parse(val));
      return true;
    } catch {
      return false;
    }
  }, { message: "Μη έγκυρο JSON για τις υπηρεσίες ή δεν συμφωνεί με το σχήμα." }),
  availabilityJson: z.string().optional().refine((val) => {
    if (!val?.trim()) return true;
    try {
      availabilityArraySchema.parse(JSON.parse(val));
      return true;
    } catch {
      return false;
    }
  }, { message: "Μη έγκυρο JSON για τη διαθεσιμότητα ή δεν συμφωνεί με το σχήμα." }),
  existingLogoUrl: z.string().optional(),
  existingBannerUrl: z.string().optional(),
});

type ClientStoreFormValues = z.infer<typeof clientStoreFormSchema>;

const initialFormState = {
  success: false,
  message: "",
  errors: null,
  store: undefined,
};

// Marker icon for Leaflet
const markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


export function StoreForm({ store, action }: StoreFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [formState, formAction, isPending] = useActionState(action, initialFormState);
  
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
      categoriesInput: store.categories?.join(', ') ?? '',
      contactEmail: store.contactEmail ?? '',
      websiteUrl: store.websiteUrl ?? '',
      address: store.address ?? '',
      latitude: store.location?.latitude?.toString() ?? '',
      longitude: store.location?.longitude?.toString() ?? '',
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
      latitude: '37.9838', // Default to Athens
      longitude: '23.7275', // Default to Athens
      ownerId: '',
      servicesJson: '[]',
      availabilityJson: JSON.stringify([
        { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
        { "dayOfWeek": 2, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
        { "dayOfWeek": 3, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
        { "dayOfWeek": 4, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
        { "dayOfWeek": 5, "startTime": "09:00", "endTime": "17:00", "lunchBreakStartTime": "13:00", "lunchBreakEndTime": "14:00" },
        { "dayOfWeek": 6, "startTime": "10:00", "endTime": "14:00" },
        { "dayOfWeek": 0, "startTime": "", "endTime": "" }
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
        if (formState.errors) {
            Object.entries(formState.errors).forEach(([key, value]) => {
            const fieldKey = key as keyof ClientStoreFormValues;
            const message = Array.isArray(value) ? value.join(", ") : String(value);
            form.setError(fieldKey, { type: "server", message });
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
  
  const watchedCategories = form.watch('categoriesInput', store?.categories?.join(', ') ?? '');

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
                    name="logoFile"
                    ref={logoFileRef}
                    onChange={(e) => handleFileChange(e, 'logo')}
                />
                <FormDescription className="text-xs">PNG, JPG, WebP. Μέγιστο 2MB.</FormDescription>
              </FormItem>

              <FormItem>
                <FormLabel>Banner</FormLabel>
                {currentBannerUrl && <Image src={currentBannerUrl} alt="Προεπισκόπηση Banner" width={300} height={100} className="border rounded-md my-2 object-cover" data-ai-hint="banner store"/>}
                <Input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    name="bannerFile"
                    ref={bannerFileRef}
                    onChange={(e) => handleFileChange(e, 'banner')}
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
                          <FormField
                            key={category.slug}
                            control={form.control}
                            name={`category_${category.slug}` as any} // Temporary name for individual checkboxes
                            render={() => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {category.translatedName}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </div>
                    <FormDescription>Επιλέξτε μία ή περισσότερες κατηγορίες.</FormDescription>
                    <FormMessage /> {/* This will show errors for categoriesInput itself from Zod */}
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
                <MapContainer
                  center={[
                    parseFloat(form.watch("latitude") || "37.9838"),
                    parseFloat(form.watch("longitude") || "23.7275"),
                  ]}
                  zoom={13}
                  scrollWheelZoom={true}
                  className="h-full w-full"
                  whenCreated={mapInstance => { /* Can use mapInstance here if needed */ }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationPicker
                    onSelect={(lat, lng) => {
                      form.setValue("latitude", lat.toFixed(6));
                      form.setValue("longitude", lng.toFixed(6));
                    }}
                  />
                  {form.watch("latitude") && form.watch("longitude") && (
                     <Marker
                      position={[
                        parseFloat(form.watch("latitude")),
                        parseFloat(form.watch("longitude")),
                      ]}
                      icon={markerIcon}
                    />
                  )}
                </MapContainer>
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

