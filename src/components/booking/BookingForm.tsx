
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React, { useEffect, useActionState, useState, useCallback, startTransition } from "react"; // Imported startTransition
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Service, AvailabilitySlot, Booking } from "@/lib/types";
import {
  createBookingAction,
  getBookingsForStoreAndDate,
} from "@/app/stores/[storeId]/actions";
import { format, getDay, isPast, parseISO } from "date-fns";
import { el } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";

interface BookingFormProps {
  selectedService: Service;
  storeId: string;
  storeName: string; // Added storeName prop
  storeAvailability: AvailabilitySlot[];
  onOpenChange: (open: boolean) => void; // To close dialog on success
}

// Client-side schema, server-side will re-validate
const bookingFormClientSchema = z.object({
  bookingDate: z.date({
    required_error: "Η ημερομηνία είναι υποχρεωτική.",
  }),
  bookingTime: z
    .string()
    .min(1, "Η ώρα είναι υποχρεωτική.")
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Μη έγκυρη ώρα (π.χ. 14:30)"),
  notes: z
    .string()
    .max(500, "Οι σημειώσεις δεν μπορούν να ξεπερνούν τους 500 χαρακτήρες.")
    .optional(),
  // Hidden fields that will be populated
  storeId: z.string(),
  serviceId: z.string(),
  userId: z.string().optional(), // Optional because user might not be logged in
  userName: z.string().optional(),
  userEmail: z.string().email().optional(),
});

type BookingFormClientValues = z.infer<typeof bookingFormClientSchema>;

const initialFormState: {
  success: boolean;
  message: string;
  errors?: any;
  booking?: Booking;
} = {
  success: false,
  message: "",
  errors: null,
  booking: undefined,
};

// Helper function to convert "HH:mm" to total minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Helper function to convert total minutes from midnight to "HH:mm"
const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const generateTimeSlots = (
  selectedDate: Date,
  storeAvailability: AvailabilitySlot[],
  serviceDuration: number,
  existingBookings: Booking[]
): string[] => {
  const dayOfWeek = getDay(selectedDate); // 0 (Sunday) - 6 (Saturday)
  const dailySchedule = storeAvailability.find(
    (slot) => slot.dayOfWeek === dayOfWeek
  );

  if (!dailySchedule || !dailySchedule.startTime || !dailySchedule.endTime) {
    return []; // Store is closed on this day or schedule is incomplete
  }

  const slots: string[] = [];
  const interval = 15; // Generate slots every 15 minutes

  const openTime = timeToMinutes(dailySchedule.startTime);
  const closeTime = timeToMinutes(dailySchedule.endTime);

  const lunchStart = dailySchedule.lunchBreakStartTime
    ? timeToMinutes(dailySchedule.lunchBreakStartTime)
    : -1;
  const lunchEnd = dailySchedule.lunchBreakEndTime
    ? timeToMinutes(dailySchedule.lunchBreakEndTime)
    : -1;

  for (
    let currentTime = openTime;
    currentTime <= closeTime - serviceDuration;
    currentTime += interval
  ) {
    const slotStartTime = currentTime;
    const slotEndTime = currentTime + serviceDuration;

    // Check if slot is within operating hours (redundant if loop condition is correct, but good for clarity)
    if (slotEndTime > closeTime) {
      continue;
    }

    // Check for overlap with lunch break
    const overlapsLunch =
      lunchStart !== -1 &&
      lunchEnd !== -1 &&
      Math.max(slotStartTime, lunchStart) < Math.min(slotEndTime, lunchEnd);

    if (overlapsLunch) {
      continue;
    }

    // Check for overlap with existing bookings
    const overlapsExistingBooking = existingBookings.some((booking) => {
      // Ensure booking.bookingDate is treated as a date string "YYYY-MM-DD"
      const bookingDateStr = typeof booking.bookingDate === 'string' 
        ? booking.bookingDate.split('T')[0] // Handle ISO string
        : format(parseISO(booking.bookingDate), 'yyyy-MM-dd'); // Handle Date object from Firestore Timestamp conversion

      if (bookingDateStr !== format(selectedDate, "yyyy-MM-dd")) {
        return false; // Booking is not for the selected date
      }
      const existingBookingStart = timeToMinutes(booking.bookingTime);
      const existingBookingEnd =
        existingBookingStart + booking.serviceDurationMinutes;
      return (
        Math.max(slotStartTime, existingBookingStart) <
        Math.min(slotEndTime, existingBookingEnd)
      );
    });

    if (overlapsExistingBooking) {
      continue;
    }

    slots.push(minutesToTime(slotStartTime));
  }
  return slots;
};

export function BookingForm({
  selectedService,
  storeId,
  storeName,
  storeAvailability,
  onOpenChange,
}: BookingFormProps) {
  const { user } = useAuth(); // Assuming useAuth provides the current user
  const { toast } = useToast();

  const [formState, formAction, isActionPending] = useActionState( // Renamed isPending to isActionPending
    createBookingAction,
    initialFormState
  );

  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [isLoadingExistingBookings, setIsLoadingExistingBookings] = useState(false);


  const form = useForm<BookingFormClientValues>({
    resolver: zodResolver(bookingFormClientSchema),
    defaultValues: {
      bookingDate: undefined,
      bookingTime: "",
      notes: "",
      storeId: storeId,
      serviceId: selectedService.id,
      userId: user?.id || undefined,
      userName: user?.name || undefined,
      userEmail: user?.email || undefined,
    },
  });

  const selectedDate = form.watch("bookingDate");

  // Fetch existing bookings when selectedDate changes
  useEffect(() => {
    if (selectedDate && storeId) {
      const fetchBookings = async () => {
        setIsLoadingExistingBookings(true);
        setAvailableTimeSlots([]); // Clear previous slots
        form.setValue("bookingTime", ""); // Reset selected time
        try {
          console.log(`Fetching bookings for store ${storeId} on date ${format(selectedDate, "yyyy-MM-dd")}`);
          const bookings = await getBookingsForStoreAndDate(
            storeId,
            format(selectedDate, "yyyy-MM-dd")
          );
          setExistingBookings(bookings);
          console.log("Fetched existing bookings:", bookings);
        } catch (error) {
          console.error("Error fetching existing bookings:", error);
          toast({
            title: "Σφάλμα Φόρτωσης Κρατήσεων",
            description:
              "Δεν ήταν δυνατή η φόρτωση των υπαρχουσών κρατήσεων. Παρακαλώ δοκιμάστε ξανά.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingExistingBookings(false);
        }
      };
      fetchBookings();
    } else {
      setExistingBookings([]); // Clear if no date selected
    }
  }, [selectedDate, storeId, toast, form]);

  // Generate available time slots when selectedDate, service, availability, or existingBookings change
   useEffect(() => {
    if (selectedDate && selectedService && storeAvailability.length > 0 && !isLoadingExistingBookings) {
      setIsLoadingSlots(true);
      console.log("Generating time slots with existing bookings:", existingBookings);
      const slots = generateTimeSlots(
        selectedDate,
        storeAvailability,
        selectedService.durationMinutes,
        existingBookings 
      );
      setAvailableTimeSlots(slots);
      setIsLoadingSlots(false);
      console.log("Generated available slots:", slots);
       if (slots.length > 0 && !form.getValues("bookingTime")) {
        // form.setValue("bookingTime", slots[0]); // Optionally auto-select first slot
      } else if (slots.length === 0) {
        form.setValue("bookingTime", ""); // Reset if no slots available
      }
    } else {
      setAvailableTimeSlots([]);
    }
  }, [selectedDate, selectedService, storeAvailability, existingBookings, isLoadingExistingBookings, form]);


  useEffect(() => {
    if (!isActionPending && formState.message) { // Check !isActionPending before showing toast
      if (formState.success) {
        toast({ title: "✅ Επιτυχία", description: formState.message });
        form.reset({
            bookingDate: undefined,
            bookingTime: "",
            notes: "",
            storeId: storeId,
            serviceId: selectedService.id,
            userId: user?.id || undefined,
            userName: user?.name || undefined,
            userEmail: user?.email || undefined,
        });
        onOpenChange(false); // Close dialog on success
      } else {
        toast({
          title: "❌ Σφάλμα Κράτησης",
          description: formState.message || "Παρουσιάστηκε ένα σφάλμα κατά τη δημιουργία της κράτησής σας.",
          variant: "destructive",
        });
      }
    }
  }, [formState, toast, form, onOpenChange, storeId, selectedService.id, user, isActionPending]);

  const isDayDisabled = useCallback(
    (date: Date): boolean => {
      if (isPast(date) && !format(date, 'yyyy-MM-dd').includes(format(new Date(), 'yyyy-MM-dd'))) {
        return true;
      }
      const day = getDay(date); // 0 (Sunday) - 6 (Saturday)
      return !storeAvailability.some((slot) => slot.dayOfWeek === day && slot.startTime && slot.endTime);
    },
    [storeAvailability]
  );

  const handleFormSubmit = async (payload: FormData) => {
    // Client-side validation before calling the action
    if (!user?.id || !user?.name || !user?.email) {
      toast({ title: "Σφάλμα", description: "Πρέπει να είστε συνδεδεμένος για να κάνετε κράτηση.", variant: "destructive" });
      return;
    }
    if (!storeId || !selectedService?.id || !form.getValues("bookingDate") || !form.getValues("bookingTime")) {
      toast({ title: "Ελλιπή Στοιχεία", description: "Παρακαλώ συμπληρώστε όλα τα απαραίτητα πεδία της φόρμας κράτησης.", variant: "destructive" });
      return;
    }

    // Add all necessary fields to FormData payload
    payload.set("storeId", storeId);
    payload.set("storeName", storeName); // Pass storeName
    payload.set("serviceId", selectedService.id);
    payload.set("serviceName", selectedService.name); // Pass serviceName
    payload.set("serviceDurationMinutes", String(selectedService.durationMinutes)); // Pass duration
    payload.set("servicePrice", String(selectedService.price)); // Pass price
    
    payload.set("userId", user.id);
    payload.set("userName", user.name);
    payload.set("userEmail", user.email);
    
    const bookingDateValue = form.getValues("bookingDate");
    if (bookingDateValue) {
        payload.set("bookingDate", format(bookingDateValue, "yyyy-MM-dd"));
    }
    payload.set("bookingTime", form.getValues("bookingTime"));
    payload.set("notes", form.getValues("notes") || "");


    console.log("🔥 Booking form submitted ")
    console.log("⏱ bookingTime:", payload.get('bookingTime'))
    console.log("📅 bookingDate:", payload.get('bookingDate'))
    
    for (const [key, value] of payload.entries()) {
      console.log(`📦 Payload field: ${key} = ${value}`);
    }

    startTransition(() => { // Wrap the call to formAction in startTransition
      formAction(payload);
    });
  };


  return (
    <Form {...form}>
      <form
        action={handleFormSubmit} // Use the custom handler
        className="space-y-6"
      >
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-2xl text-primary">
            Κράτηση για: {selectedService.name}
          </CardTitle>
          <CardDescription>
            Διάρκεια: {selectedService.durationMinutes} λεπτά | Τιμή:{" "}
            {selectedService.price.toLocaleString("el-GR", {
              style: "currency",
              currency: "EUR",
            })}
          </CardDescription>
        </CardHeader>

        <FormField
          control={form.control}
          name="bookingDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ημερομηνία</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={`w-full text-left font-normal ${ // Ensure font-normal
                        !field.value && "text-muted-foreground"
                      }`}
                    >
                      {field.value
                        ? format(field.value, "PPP", { locale: el })
                        : "Επιλέξτε ημερομηνία"}
                      <CalendarIcon className="ml-auto h-4 w-4" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                        field.onChange(date);
                        form.setValue("bookingTime", ""); // Reset time when date changes
                        setAvailableTimeSlots([]); // Clear old slots immediately
                    }}
                    disabled={isDayDisabled}
                    locale={el}
                    fromDate={new Date()} // Disable past dates
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
              <FormLabel>Ώρα</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={!selectedDate || isLoadingSlots || isLoadingExistingBookings || availableTimeSlots.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingSlots || isLoadingExistingBookings
                          ? "Φόρτωση διαθέσιμων ωρών..."
                          : availableTimeSlots.length === 0 && selectedDate
                          ? "Δεν υπάρχουν διαθέσιμες ώρες"
                          : "Επιλέξτε ώρα"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(isLoadingSlots || isLoadingExistingBookings) && (
                    <div className="flex items-center justify-center p-2 text-muted-foreground">
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Φόρτωση...
                    </div>
                  )}
                  {!isLoadingSlots && !isLoadingExistingBookings && availableTimeSlots.length === 0 && selectedDate && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                        Δεν υπάρχουν διαθέσιμες ώρες για αυτήν την ημερομηνία.
                    </div>
                  )}
                  {!isLoadingSlots && !isLoadingExistingBookings && availableTimeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Textarea placeholder="Οποιαδήποτε επιπλέον πληροφορία για την κράτησή σας..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isActionPending || isLoadingSlots || isLoadingExistingBookings || !form.formState.isValid || !form.getValues("bookingTime")}
        >
          {isActionPending ? (
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

