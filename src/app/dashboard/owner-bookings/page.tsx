
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getOwnerDashboardData } from '../actions';
import type { Booking, Store } from '@/lib/types';
import { format } from 'date-fns';
import { OwnerBookingsDisplay } from '@/components/dashboard/OwnerBookingsDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, RefreshCw, ClipboardList } from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { addDays } from 'date-fns/addDays';
import { DateRange } from 'react-day-picker';
export default function OwnerBookingsManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [ownerBookings, setOwnerBookings] = useState<Booking[]>([]);
  const [ownedStores, setOwnedStores] = useState<Store[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [filterType, setFilterType] = useState<'day' | 'upcoming' | 'range' | 'all'>('day');
  const [error, setError] = useState<string | null>(null);

  const fetchOwnerData = useCallback(async (showToast = false) => {
    if (user && user.id) {
      setIsLoadingData(true);
      setError(null);
      try {
        const data = await getOwnerDashboardData(user.id);
        setOwnedStores(data.storesOwned);
        setOwnerBookings(data.bookings);

        // Check if there are any owned stores after fetching data
        if (data.storesOwned.length === 0) {
          setError(
            'Δεν βρέθηκαν καταστήματα που ανήκουν σε εσάς. Βεβαιωθείτε ότι το User ID του ιδιοκτήτη έχει οριστεί σωστά στα στοιχεία του καταστήματος.'
          );
        } else if (showToast) {
          toast({ title: 'Επιτυχής Ανανέωση', description: 'Τα δεδομένα κρατήσεων ανανεώθηκαν.' });
        }
        if (data.storesOwned.length === 0 && !authLoading) {
           setError("Δεν βρέθηκαν καταστήματα που ανήκουν σε εσάς. Βεβαιωθείτε ότι το User ID του ιδιοκτήτη έχει οριστεί σωστά στα στοιχεία του καταστήματος.");
        }
      } catch (err) {
        console.error("[OwnerBookingsManagementPage] Failed to fetch owner dashboard data:", err);
        setError("Σφάλμα κατά τη φόρτωση δεδομένων ιδιοκτήτη.");
        if (showToast) {
          toast({
            title: 'Σφάλμα Ανανέωσης',
            description: 'Δεν ήταν δυνατή η ανανέωση των δεδομένων.',
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoadingData(false);
      }
    } else if (!authLoading && !user) {
      setIsLoadingData(false);
      setError("Πρέπει να είστε συνδεδεμένοι για να δείτε αυτή τη σελίδα.");
    }
  }, [user, authLoading, toast]);

  // Filter bookings based on the selected date
  const bookingsForSelectedDay = filterType === 'day' && selectedDate
    ? ownerBookings.filter((booking) =>
        format(new Date(booking.bookingDate), 'yyyy-MM-dd') ===
        format(selectedDate, 'yyyy-MM-dd')
      )
    : [];

  // Filter upcoming bookings (greater than or equal to current date)
  const upcomingBookings = ownerBookings.filter((booking) => {
    const bookingDate = new Date(`${booking.bookingDate}T${booking.bookingTime}`);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
    return bookingDate >= today;
  });
 
  // Filter upcoming bookings for the next 5 days
  const next5DaysBookings = upcomingBookings.filter((booking) => {
    const bookingDate = new Date(`${booking.bookingDate}T${booking.bookingTime}`);
    const today = new Date();
    const fiveDaysFromNow = addDays(today, 5);
    return bookingDate >= today && bookingDate <= fiveDaysFromNow;
  });

  // Filter bookings based on date range
  const bookingsForDateRange = filterType === 'range' && dateRange?.from && dateRange?.to
    ? ownerBookings.filter((booking) => {
        const bookingDate = new Date(`${booking.bookingDate}T${booking.bookingTime}`);
        return bookingDate >= dateRange.from! && bookingDate <= dateRange.to!;
    })
    : ownerBookings.filter((booking) => { // Default to showing all upcoming if range not selected
        const bookingDate = new Date(`${booking.bookingDate}T${booking.bookingTime}`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return bookingDate >= today;
    });

  const allBookings = ownerBookings;
    const isFetchingByRange = filterType === 'range' && (dateRange?.from || dateRange?.to);
  useEffect(() => {
    fetchOwnerData();
  }, [fetchOwnerData]);

  if (authLoading || isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-8 w-72" />
        </div>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <Skeleton className="h-7 w-1/2" />
                <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <Skeleton className="h-4 w-3/4" />
         </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-6" />
        <h1 className="text-2xl font-bold text-destructive mb-4">Σφάλμα Φόρτωσης</h1>
        <p className="text-md text-muted-foreground mb-6">{error}</p>
        <div className="flex gap-2">
            <Button onClick={() => fetchOwnerData(true)} variant="outline" disabled={isLoadingData}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingData ? "animate-spin": ""}`} />
                Προσπαθήστε Ξανά
            </Button>
            <Button asChild variant="default">
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Πίσω στον Πίνακα Ελέγχου
                </Link>
            </Button>
        </div>
      </div>
    );
  }

  if (!user && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
        <ShieldAlert className="w-16 h-16 text-primary mb-6" />
        <h1 className="text-2xl font-bold text-primary mb-4">Απαιτείται Σύνδεση</h1>
        <p className="text-md text-muted-foreground mb-6">
          Πρέπει να είστε συνδεδεμένοι για να διαχειριστείτε τις κρατήσεις του καταστήματός σας.
        </p>
        <Button asChild>
         <Link href="/login?redirect=/dashboard/owner-bookings">Σύνδεση</Link>
       </Button>
     </div>
   );
 }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
             <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Πίσω στον Πίνακα Ελέγχου</span>
             </Link>
            </Button>
            <h1 className="text-3xl font-bold text-primary">Διαχείριση Κρατήσεων Καταστήματος</h1>
        </div>
        <Button onClick={() => fetchOwnerData(true)} variant="outline" disabled={isLoadingData}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingData ? "animate-spin": ""}`} />
            Ανανέωση
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-xl font-semibold">Επιλέξτε Ημερομηνία για Φιλτράρισμα:</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className="w-auto justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Επιλέξτε ημερομηνία</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                      setSelectedDate(date);
                      setFilterType('day');
                  }}
                  initialFocus
              />
          </PopoverContent>
        </Popover>
      </div>

      {selectedDate && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClipboardList className="mr-2 h-5 w-5 text-primary" />
              Ραντεβού για {format(selectedDate, 'dd/MM/yyyy')} (
              {bookingsForSelectedDay.length})
            </CardTitle>
            <CardDescription>
              Εμφανίζονται οι κρατήσεις για την επιλεγμένη ημερομηνία.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OwnerBookingsDisplay
              bookings={bookingsForSelectedDay}
              storesOwned={ownedStores}
              onBookingUpdate={() => fetchOwnerData(false)} // Pass false to avoid redundant toast on internal updates
            />
          </CardContent>
        </Card>
      )}

        <Card className="shadow-lg mt-4">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClipboardList className="mr-2 h-5 w-5 text-primary" />
 Επόμενες 5 μέρες ({next5DaysBookings.length})
             </CardTitle>
            <CardDescription>
              Εμφανίζονται όλες οι επικείμενες κρατήσεις.
 </CardDescription>
          </CardHeader>
          <CardContent>
            <OwnerBookingsDisplay
 bookings={next5DaysBookings}
               storesOwned={ownedStores}
               onBookingUpdate={() => fetchOwnerData(false)}
             />
           </CardContent>
         </Card>

       <div className="mt-8">
         <h2 className="text-xl font-semibold mb-4">Φιλτράρισμα Όλων των Κρατήσεων ανά Περίοδο:</h2>
         <Popover>
           <PopoverTrigger asChild>
             <Button
               id="date"
               variant={"outline"}
               className="w-auto justify-start text-left font-normal"
             >
               <CalendarIcon className="mr-2 h-4 w-4" />
               {dateRange?.from ? (
                 dateRange.to ? (
                   `${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}`
                 ) : (
                   format(dateRange.from, "PPP")
                 )
               ) : (
                 <span>Επιλέξτε ημερομηνίες</span>
               )}
             </Button>
           </PopoverTrigger>
           <PopoverContent className="w-auto p-0" align="start">
             <Calendar
               mode="range"
               selected={dateRange}
               onSelect={(range) => {
                   setDateRange(range);
                   setFilterType('range');
               }}
               numberOfMonths={2}
             />
           </PopoverContent>
         </Popover>
           <Button onClick={() => setFilterType('all')} variant={filterType === 'all' ? 'default' : 'outline'} className="ml-4">
               Εμφάνιση Όλων
           </Button>
       </div>

         <Card className="shadow-lg mt-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="mr-2 h-5 w-5 text-primary" />
            Όλες οι Κρατήσεις ({allBookings.length})
          </CardTitle>
          <CardDescription>
            Διαχειριστείτε όλες τις κρατήσεις για τα κέντρα σας. Χρησιμοποιήστε το ημερολόγιο για φιλτράρισμα.
             </CardDescription>
        </CardHeader>
        <CardContent>
          <OwnerBookingsDisplay
            bookings={filterType === 'range' ? bookingsForDateRange : upcomingBookings}
            storesOwned={ownedStores}

            onBookingUpdate={() => fetchOwnerData(false)} // Pass false to avoid redundant toast on internal updates
          />
        </CardContent>
      </Card>
    </div>
  );
}

