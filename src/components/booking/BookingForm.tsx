
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import React, { useEffect, useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Service, AvailabilitySlot, Booking } from "@/lib/types";
import { createBookingAction } from "@/app/stores/[storeId]/actions"; 
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { CalendarIcon, Clock, Tag, Info, Edit3, Loader2 } from "lucide-react";

interface BookingFormProps {
  selectedService: Service;
  storeId: string;
  storeName: string;
  storeAvailability: AvailabilitySlot[];
  onOpenChange: (open: boolean) => void; // To close dialog on success
}

const bookingFormClientSchema = z.object({
  bookingDate: z.date({
    required_error: "Η ημερομηνία κράτησης είναι υποχρεωτική.",
  }),
  bookingTime: z.string().min(1, { message: "Η ώρα κράτησης είναι υποχρεωτική." })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Μη έγκυρη μορφή ώρας (HH:mm)."),
  notes: z.string().max(500, "Οι σημειώσεις δεν μπορούν να υπερβαίνουν τους 500 χαρακτήρες.").optional(),
});

type BookingFormClientValues = z.infer<typeof bookingFormClientSchema>;

const initialFormState: { success: boolean; message: string; errors?: any; booking?: Booking } = {
  success: false,
  message: "",
  errors: null,
  booking: undefined,
};

export function BookingForm({
  selectedService,
  storeId,
  storeName,
  storeAvailability,
  onOpenChange
}: BookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formState, formAction, isPending] = useActionState(createBookingAction, initialFormState);

  const form = useForm<BookingFormClientValues>({
    resolver: zodResolver(bookingFormClientSchema),
    defaultValues: {
      bookingDate: undefined,
      bookingTime: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (formState.message) {
      if (formState.success) {
        toast({
          title: "Επιτυχία Κράτησης!",
          description: formState.message,
        });
        form.reset();
        onOpenChange(false); // Close dialog on success
      } else {
        toast({
          title: "Σφάλμα Κράτησης",
          description: formState.message || "Παρουσιάστηκε ένα σφάλμα κατά την υποβολή της κράτησης.",
          variant: "destructive",
        });
        if (formState.errors) {
          Object.entries(formState.errors).forEach(([key, value]) => {
            form.setError(key as keyof BookingFormClientValues, {
              type: "server",
              message: Array.isArray(value) ? value.join(", ") : String(value),
            });
          });
        }
      }
    }
  }, [formState, toast, form, onOpenChange]);

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-2xl text-primary">Κράτηση για: {selectedService.name}</CardTitle>
          <CardDescription>
            Διάρκεια: {selectedService.durationMinutes} λεπτά | Τιμή: {selectedService.price.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })}
          </CardDescription>
        </CardHeader>

        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="serviceId" value={selectedService.id} />
        {/* These will be passed from server action when fully implemented */}
        <input type="hidden" name="storeName" value={storeName} />
        <input type="hidden" name="serviceName" value={selectedService.name} />
        <input type="hidden" name="serviceDurationMinutes" value={selectedService.durationMinutes} />
        <input type="hidden" name="servicePrice" value={selectedService.price} />

        {user && (
          <>
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="userName" value={user.name} />
            <input type="hidden" name="userEmail" value={user.email || ""} />
          </>
        )}

        <FormField
          control={form.control}
          name="bookingDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Επιλέξτε Ημερομηνία</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: el })
                      ) : (
                        <span>Επιλέξτε μια ημερομηνία</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Disable past dates
                    initialFocus
                    locale={el}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bookingTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Επιλέξτε Ώρα (π.χ. 10:30)</FormLabel>
              <FormControl>
                <Input
                  placeholder="HH:mm"
                  {...field}
                  type="time" // Using type="time" for basic browser time picker
                />
              </FormControl>
              <FormDescription>
                TODO: Θα εμφανίζονται διαθέσιμες ώρες βάσει προγράμματος.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Σημειώσεις (Προαιρετικό)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ειδικές οδηγίες ή πληροφορίες για την κράτησή σας..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Υποβολή Κράτησης...
            </>
          ) : (
            "Υποβολή Κράτησης"
          )}
        </Button>
      </form>
    </Form>
  );
}
