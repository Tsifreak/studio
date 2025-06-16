"use client";

import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import type { SerializedStore } from '@/lib/types';
import { AppCategories, StoreCategoriesSlugs } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React, { useEffect, useActionState, useState, useRef, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { TrashIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const DynamicStoreMap = dynamic(() =>
  import('./StoreMap').then((mod) => mod.StoreMap), {
  ssr: false,
  loading: () => <div className="h-80 w-full flex items-center justify-center bg-muted rounded-md"><p>Φόρτωση χάρτη...</p></div>,
});

// Zod schema for the UI-facing array structures
const serviceSchema = z.object({
  id: z.string().min(1, 'Service ID is required.'),
  name: z.string().min(1, 'Service name is required.'),
  description: z.string().min(1, 'Description is required.'),
  durationMinutes: z.coerce.number().int().positive('Must be a positive number'),
  price: z.coerce.number().positive('Must be a positive number'),
  availableDaysOfWeek: z.array(z.number()).optional(),
});

const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean().default(false),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});


const clientStoreFormSchema = z.object({
  name: z.string().min(3, "Το όνομα είναι υποχρεωτικό και πρέπει να έχει τουλάχιστον 3 χαρακτήρες."),
  description: z.string().min(10, "Η περιγραφή είναι υποχρεωτική και πρέπει να έχει τουλάχιστον 10 χαρακτήρες."),
  longDescription: z.string().optional(),
  tagsInput: z.string().optional(),
  categoriesInput: z.string().refine(val => {
    if (!val || val.trim() === "") return true;
    const slugs = val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return slugs.every(slug => StoreCategoriesSlugs.includes(slug));
  }, { message: `Μία ή περισσότερες κατηγορίες δεν είναι έγκυρες.` }).optional(),
  contactEmail: z.string().email("Εισάγετε ένα έγκυρο email.").optional().or(z.literal('')),
  websiteUrl: z.string().url("Εισάγετε μια έγκυρη διεύθυνση URL.").optional().or(z.literal('')),
  address: z.string().min(1, "Η διεύθυνση είναι υποχρεωτική.").optional(),
  latitude: z.string().superRefine((val, ctx) => { if (!val || val.trim() === '') { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Το Γεωγραφικό Πλάτος είναι υποχρεωτικό.", }); return; } const num = parseFloat(val); if (isNaN(num) || num < -90 || num > 90) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Εισάγετε ένα έγκυρο γεωγραφικό πλάτος (-90 έως 90).", }); } }),
  longitude: z.string().superRefine((val, ctx) => { if (!val || val.trim() === '') { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Το Γεωγραφικό Μήκος είναι υποχρεωτικό.", }); return; } const num = parseFloat(val); if (isNaN(num) || num < -180 || num > 180) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Εισάγετε ένα έγκυρο γεωγραφικό μήκος (-180 έως 180).", }); } }),
  ownerId: z.string().optional(),
  services: z.array(serviceSchema).optional(),
  availability: z.array(availabilitySlotSchema).length(7),
  servicesJson: z.string().optional(),
  availabilityJson: z.string().optional(),
  logoFile: z.instanceof(File).optional(),
  bannerFile: z.instanceof(File).optional(),
  specializedBrands: z.array(z.string()).optional(),
  tyreBrands: z.array(z.string()).optional(), // Added for tyre brands
  existingLogoUrl: z.string().optional(),
  existingBannerUrl: z.string().optional(),
});

type ClientStoreFormValues = z.infer<typeof clientStoreFormSchema>;

interface ActionFormState {
  success: boolean;
  message: string;
  errors?: Partial<Record<keyof ClientStoreFormValues, string[]>>;
  store?: SerializedStore;
}
interface StoreFormProps {
  store?: SerializedStore;
  action: (prevState: ActionFormState, formData: FormData) => Promise<ActionFormState>;
}

const initialFormState: ActionFormState = { success: false, message: '', errors: undefined, store: undefined };

const carBrands = ['Audi', 'BMW', 'Citroen', 'Mercedes', 'Dacia', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Kia', 'Mazda', 'Nissan', 'Peugeot', 'Renault', 'Skoda', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'];

// List of tyre brands
const tyreBrands = [
  'Michelin', 'Goodyear', 'Pirelli', 'Continental', 'Bridgestone',
  'Dunlop', 'Hankook', 'Falken', 'Toyo', 'Yokohama',
  'Kumho', 'Nexen', 'Cooper', 'BFGoodrich', 'Firestone',
  'General Tire', 'Kleber', 'Vredestein', 'Nokian', 'Barum',
  'Semperit', 'Uniroyal', 'Sava', 'Kormoran', 'Debica'
];

declare global {
  interface Window {
    googleMapsScriptLoadedForStoreForm?: () => void;
    google?: typeof google;
  }
}

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const getDefaultAvailability = () => weekDays.map((_, index) => ({
    dayOfWeek: index,
    isClosed: index === 0,
    startTime: index >= 1 && index <= 5 ? '09:00' : (index === 6 ? '10:00' : ''),
    endTime: index >= 1 && index <= 5 ? '17:00' : (index === 6 ? '14:00' : ''),
}));

export function StoreForm({ store, action }: StoreFormProps) {
  console.log("[StoreForm - Initial Load] Store prop received:", store);
  console.log("[StoreForm - Initial Load] Tyre Brands from prop:", store?.tyreBrands);
  const { toast } = useToast();
  const router = useRouter();
  const [formState, formAction, isPending] = useActionState<ActionFormState, FormData>(action, initialFormState);

  const [currentLogoUrl, setCurrentLogoUrl] = useState(store?.logoUrl || null);
  const [currentBannerUrl, setCurrentBannerUrl] = useState(store?.bannerUrl || null);
  
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null); 

  const mappedAvailability = store?.availability?.length
    ? weekDays.map((_, index) => {
        const dayData = store.availability.find(d => d.dayOfWeek === index);
        return dayData
          ? { ...dayData, isClosed: !dayData.startTime && !dayData.endTime }
          : { dayOfWeek: index, isClosed: true, startTime: '', endTime: '', lunchBreakStartTime: '', lunchBreakEndTime: '' };
      }) // Note: Removed lunch break props here too if they were implicitly included
    : getDefaultAvailability();
 
  const form = useForm<ClientStoreFormValues>({
    resolver: zodResolver(clientStoreFormSchema),
    defaultValues: {
      name: store?.name ?? '',
      description: store?.description ?? '',
      longDescription: store?.longDescription ?? '',
      tagsInput: store?.tags?.join(', ') ?? '',
      categoriesInput: store?.categories?.join(',') ?? '',
      contactEmail: store?.contactEmail ?? '',
      websiteUrl: store?.websiteUrl ?? '',
      address: store?.address ?? '',
      latitude: store?.location?.latitude?.toString() ?? '37.9838', 
      longitude: store?.location?.longitude?.toString() ?? '23.7275',
      ownerId: store?.ownerId ?? '',
      existingLogoUrl: store?.logoUrl ?? '',
      existingBannerUrl: store?.bannerUrl ?? '',
      services: store?.services ?? [],
      availability: mappedAvailability,
      servicesJson: store?.services ? JSON.stringify(store.services) : '[]',
      availabilityJson: store?.availability ? JSON.stringify(store.availability) : '[]', 
      specializedBrands: store?.specializedBrands ?? [],
      tyreBrands: store?.tyreBrands ?? [],
    },
  });

  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({ control: form.control, name: 'services' });
  const { fields: availabilityFields } = useFieldArray({ control: form.control, name: 'availability' });

  const watchedServices = form.watch('services');
  const watchedAvailability = form.watch('availability');

  useEffect(() => {
    const servicesToSave = (watchedServices || []).map(s => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      durationMinutes: Number(s.durationMinutes) || 0,
      price: Number(s.price) || 0,
      availableDaysOfWeek: s.availableDaysOfWeek || [],
    }));
    form.setValue('servicesJson', JSON.stringify(servicesToSave));
  }, [JSON.stringify(watchedServices), form]);

  useEffect(() => {
    const availabilityToSave = watchedAvailability
      .filter(day => !day.isClosed)
      .map(day => ({
        dayOfWeek: day.dayOfWeek,
        startTime: day.startTime || '',
        endTime: day.endTime || '',
    }));
    form.setValue('availabilityJson', JSON.stringify(availabilityToSave));
  }, [watchedAvailability, form]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { console.error("Google Maps API Key is not configured."); toast({ title: "Σφάλμα Διαμόρφωσης Χάρτη", description: "Το κλειδί API λείπει.", variant: "destructive" }); return; }
    if (window.google?.maps?.places) { setGoogleScriptLoaded(true); return; }
    const scriptId = "google-maps-places-script-storeform";
    if (!document.getElementById(scriptId)) {
      window.googleMapsScriptLoadedForStoreForm = () => setGoogleScriptLoaded(true);
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=googleMapsScriptLoadedForStoreForm`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else if (window.google?.maps?.places) { setGoogleScriptLoaded(true); }
  }, [toast]);

  useEffect(() => {
    if (!googleScriptLoaded || !addressInputRef.current || autocompleteRef.current) return;
    if (!window.google?.maps?.places) { console.warn("Google Places Autocomplete not ready yet."); return; }
    const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, { types: ['address'], componentRestrictions: { country: 'gr' }, fields: ['formatted_address', 'geometry.location', 'name'], });
    autocompleteRef.current = autocomplete;
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location && place.formatted_address) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        form.setValue('address', place.formatted_address, { shouldValidate: true, shouldDirty: true });
        form.setValue('latitude', lat.toString(), { shouldValidate: true, shouldDirty: true });
        form.setValue('longitude', lng.toString(), { shouldValidate: true, shouldDirty: true });
        if (leafletMapRef.current) leafletMapRef.current.setView([lat, lng], 17);
      } else { toast({ title: "Τοποθεσία μη Ολοκληρωμένη", description: "Παρακαλώ επιλέξτε μια πλήρη διεύθυνση.", variant: "destructive" }); }
    });
  }, [googleScriptLoaded, form, toast]);

  useEffect(() => {
    if (!isPending && formState.message) {
      if (formState.success) {
        toast({ title: store ? "Επιτυχής Ενημέρωση" : "Επιτυχής Προσθήκη", description: formState.message });
        router.push("/admin/stores");
      } else {
        toast({ title: "Σφάλμα", description: formState.message, variant: "destructive" });
        if (formState.errors) {
          Object.entries(formState.errors).forEach(([key, value]) => {
            const fieldKey = key as keyof ClientStoreFormValues;
            const message = Array.isArray(value) ? value.join(", ") : String(value);
            if (form.getFieldState(fieldKey)) form.setError(fieldKey, { type: "server", message });
            else console.warn(`[StoreForm] Attempted to set error on non-existent field '${fieldKey}'`);
          });
        }
      }
    }
  }, [formState, isPending, store, router, toast, form]);

  const watchedLatitude = form.watch('latitude');
  const watchedLongitude = form.watch('longitude');
  const handleMapCoordinatesChange = useCallback((lat: number, lng: number) => { form.setValue("latitude", lat.toFixed(7)); form.setValue("longitude", lng.toFixed(7)); }, [form]);

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl">
      {/* ... CardHeader ... */}
      <Form {...form}>
        <form action={formAction} className="space-y-6">
          <input type="hidden" {...form.register("existingLogoUrl")} />
          <input type="hidden" {...form.register("existingBannerUrl")} />
          <input type="hidden" {...form.register("servicesJson")} />
          <input type="hidden" {...form.register("availabilityJson")} />
  
          {form.watch('specializedBrands')?.map((brand) => (
              <input
                  key={`hidden-car-${brand}`} // Unique key for each hidden input
                  type="hidden"
                  name="specializedBrands" // CRITICAL: This name must match what actions.ts expects
                  value={brand}
              />
          ))}
          {form.watch('tyreBrands')?.map((brand) => (
              <input
                  key={`hidden-tyre-${brand}`} // Unique key for each hidden input
                  type="hidden"
                  name="tyreBrands" // CRITICAL: This name must match what actions.ts expects
                  value={brand}
              />
          ))}


           <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Όνομα Κέντρου</FormLabel><FormControl><Input placeholder="π.χ. AutoFix Πάτρας" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Σύντομη Περιγραφή</FormLabel><FormControl><Textarea placeholder="π.χ. Εξειδικευμένο συνεργείο..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="longDescription" render={({ field }) => (<FormItem><FormLabel>Αναλυτική Περιγραφή</FormLabel><FormControl><Textarea placeholder="Περισσότερες λεπτομέρειες..." {...field} rows={5}/></FormControl><FormMessage /></FormItem>)} />
              <FormItem><FormLabel>Λογότυπο</FormLabel>{currentLogoUrl && <Image src={currentLogoUrl} alt="Προεπισκόπηση Λογοτύπου" width={100} height={100} className="border rounded-md my-2" />
              }<Input type="file" accept="image/png, image/jpeg, image/webp" {...form.register("logoFile")} onChange={(e) => { const file = e.target.files?.[0]; if (file) setCurrentLogoUrl(URL.createObjectURL(file)); form.register("logoFile").onChange(e); }}/><FormDescription className="text-xs">PNG, JPG, WebP. Μέγιστο 2MB.</FormDescription></FormItem>
              <FormItem><FormLabel>Banner</FormLabel>{currentBannerUrl && <Image src={currentBannerUrl} alt="Προεπισκόπηση Banner" width={300} height={100} className="border rounded-md my-2 object-cover"/>
              }<Input type="file" accept="image/png, image/jpeg, image/webp" {...form.register("bannerFile")} onChange={(e) => { const file = e.target.files?.[0]; if (file) setCurrentBannerUrl(URL.createObjectURL(file)); form.register("bannerFile").onChange(e); }}/><FormDescription className="text-xs">PNG, JPG, WebP. Μέγιστο 2MB.</FormDescription></FormItem>
              <FormField control={form.control} name="tagsInput" render={({ field }) => (<FormItem><FormLabel>Ετικέτες (Tags)</FormLabel><FormControl><Input placeholder="π.χ. φρένα, service, toyota" {...field} /></FormControl><FormDescription>Διαχωρίστε τις ετικέτες με κόμμα.</FormDescription><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="categoriesInput" render={({ field }) => (<FormItem><FormLabel>Κατηγορίες</FormLabel><input type="hidden" name={field.name} value={field.value || ''} /><div className="space-y-2 p-2 border rounded-md max-h-48 overflow-y-auto">{AppCategories.map((category) => {
                    const currentSlugs = (form.getValues('categoriesInput') || '').split(',').filter(Boolean);
                    const isChecked = currentSlugs.includes(category.slug);
                    return (<FormItem key={category.slug} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={isChecked} onCheckedChange={(checked) => {
                              let updatedSlugs = currentSlugs;
                              if (checked) { updatedSlugs.push(category.slug); } else { updatedSlugs = updatedSlugs.filter(s => s !== category.slug); }
                              field.onChange([...new Set(updatedSlugs)].join(','));
                            }} /></FormControl><FormLabel className="font-normal cursor-pointer">{category.translatedName}</FormLabel></FormItem>);})}</div><FormDescription>Επιλέξτε μία ή περισσότερες κατηγορίες.</FormDescription><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="specializedBrands" render={({ field }) => (<FormItem><FormLabel>Εξειδίκευση σε Brands</FormLabel><div className="space-y-2 p-2 border rounded-md max-h-48 overflow-y-auto">{carBrands.map((brand) => (<FormItem key={brand} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(brand)} onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...(field.value || []), brand]);
                              } else {
                                field.onChange(field.value?.filter(value => value !== brand));
                              }
                            }} /></FormControl><FormLabel className="font-normal cursor-pointer">{brand}</FormLabel></FormItem>))}</div><FormDescription>Επιλέξτε τα brands στα οποία ειδικεύεται το κέντρο.</FormDescription><FormMessage /></FormItem>)} />

              {/* NEW FIELD FOR TYRE BRANDS */}
              <FormField control={form.control} name="tyreBrands" render={({ field }) => (
                <FormItem>
                  <FormLabel>Εξειδίκευση σε Μάρκες Ελαστικών</FormLabel>
                  <div className="space-y-2 p-2 border rounded-md max-h-48 overflow-y-auto">
                    {tyreBrands.map((brand) => (
                      <FormItem key={brand} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(brand)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...(field.value || []), brand]);
                              } else {
                                field.onChange(field.value?.filter(value => value !== brand));
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">{brand}</FormLabel>
                      </FormItem>
                    ))}
                  </div>
                  <FormDescription>Επιλέξτε τις μάρκες ελαστικών στις οποίες ειδικεύεται το κέντρο.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="space-y-6">
              <FormField control={form.control} name="contactEmail" render={({ field }) => (<FormItem><FormLabel>Email Επικοινωνίας</FormLabel><FormControl><Input type="email" placeholder="contact@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="websiteUrl" render={({ field }) => (<FormItem><FormLabel>Ιστοσελίδα</FormLabel><FormControl><Input type="url" placeholder="https://www.example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Διεύθυνση</FormLabel><FormControl><Input placeholder="π.χ. Οδός Παραδείγματος 123, Πόλη" {...field} ref={addressInputRef} /></FormControl><FormDescription>Ξεκινήστε να πληκτρολογείτε.</FormDescription><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="latitude" render={({ field }) => (<FormItem><FormLabel>Γεωγραφικό Πλάτος</FormLabel><FormControl><Input {...field} readOnly className="bg-muted/50" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="longitude" render={({ field }) => (<FormItem><FormLabel>Γεωγραφικό Μήκος</FormLabel><FormControl><Input {...field} readOnly className="bg-muted/50" /></FormControl><FormMessage /></FormItem>)} />
              <div className="h-80 w-full rounded-md overflow-hidden border"><DynamicStoreMap key={store?.id ? `edit-${store.id}` : 'new'} latitude={parseFloat(watchedLatitude || '37.9838')} longitude={parseFloat(watchedLongitude || '23.7275')} onCoordinatesChange={handleMapCoordinatesChange} mapRef={leafletMapRef} /></div>
              <FormField control={form.control} name="ownerId" render={({ field }) => (<FormItem><FormLabel>Owner User ID (Firebase UID)</FormLabel><FormControl><Input placeholder="UID του ιδιοκτήτη από Firebase Auth" {...field} /></FormControl><FormDescription>Αφήστε κενό αν δεν αντιστοιχεί.</FormDescription><FormMessage /></FormItem>)} />
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="text-lg font-medium">Services</h3>
                  {serviceFields.map((item, index) => (
                    <div key={item.id} className="relative rounded-md border bg-background p-4 shadow-sm">
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => removeService(index)}><TrashIcon className="h-4 w-4 text-destructive"/></Button>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField control={form.control} name={`services.${index}.id`} render={({ field }) => (<FormItem><FormLabel>Service ID</FormLabel><FormControl><Input placeholder="e.g., oil_change" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name={`services.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Service Name</FormLabel><FormControl><Input placeholder="e.g., Oil Change" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                      </div>
                      <FormField control={form.control} name={`services.${index}.description`} render={({ field }) => (<FormItem className='mt-4'><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the service" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField control={form.control} name={`services.${index}.durationMinutes`} render={({ field }) => (<FormItem><FormLabel>Duration (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name={`services.${index}.price`} render={({ field }) => (<FormItem><FormLabel>Price (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                      </div>
                      <FormField
                        control={form.control}
                        name={`services.${index}.availableDaysOfWeek`}
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Available Days</FormLabel>
                            <div className="mt-2 grid grid-cols-4 gap-x-4 gap-y-2 sm:grid-cols-7">
                              {weekDays.map((dayName, dayIndex) => (
                                <FormItem key={dayIndex} className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(dayIndex)}
                                      onCheckedChange={checked => {
                                        const currentValue = field.value || [];
                                        return checked
                                          ? field.onChange([...currentValue, dayIndex])
                                          : field.onChange(currentValue.filter(v => v !== dayIndex));
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">{dayName.substring(0,3)}</FormLabel>
                                </FormItem>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendService({ id: '', name: '', description: '', durationMinutes: 30, price: 50, availableDaysOfWeek: [1,2,3,4,5] })}>Add Service</Button>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="text-lg font-medium">Weekly Availability</h3>
                  {availabilityFields.map((item, index) => {
                    const day = form.watch(`availability.${index}`);
                    return (
                      <div key={item.id} className="rounded-md border p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="font-semibold">{weekDays[index]}</h4>
                          <FormField control={form.control} name={`availability.${index}.isClosed`} render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="cursor-pointer text-sm font-normal">Closed</FormLabel>
                            </FormItem>
                          )}/>
                        </div>
                        {!day.isClosed && (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-4">
                            <FormField control={form.control} name={`availability.${index}.startTime`} render={({ field }) => (<FormItem><FormLabel>Opening</FormLabel><FormControl><Input type="time" {...field}/></FormControl></FormItem>)}/>
                            <FormField control={form.control} name={`availability.${index}.endTime`} render={({ field }) => (<FormItem><FormLabel>Closing</FormLabel><FormControl><Input type="time" {...field}/></FormControl><FormMessage /></FormItem>)}/>
                            {/* Lunch break fields removed */}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
            
           </CardContent>

          <CardFooter className="flex justify-end p-6 border-t">
            <Button type="button" variant="outline" onClick={() => router.back()} className="mr-2" disabled={isPending}>Άκυρο</Button>
            <Button type="submit" disabled={isPending}>{isPending ? (store ? "Ενημέρωση..." : "Προσθήκη...") : (store ? "Αποθήκευση Αλλαγών" : "Προσθήκη Κέντρου")}</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}