
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserBookings } from '../actions';
import type { Booking } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isFuture, isPast, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { CalendarCheck, CalendarX, Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

const getStatusVariant = (status: Booking['status']): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'pending': return 'outline';
    case 'confirmed': return 'default'; // Consider a success/green variant if ShadCN theme supports it
    case 'completed': return 'secondary';
    case 'cancelled_by_user':
    case 'cancelled_by_store':
    case 'no_show': return 'destructive';
    default: return 'outline';
  }
};

const getStatusText = (status: Booking['status']): string => {
    switch (status) {
        case 'pending': return 'Εκκρεμεί';
        case 'confirmed': return 'Επιβεβαιωμένο';
        case 'completed': return 'Ολοκληρωμένο';
        case 'cancelled_by_user': return 'Ακυρώθηκε από Εσάς';
        case 'cancelled_by_store': return 'Ακυρώθηκε από το Κέντρο';
        case 'no_show': return 'Δεν Εμφανιστήκατε';
        default: return status;
    }
};

function BookingsTable({ bookings, title }: { bookings: Booking[], title: string }) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CalendarX className="mx-auto h-12 w-12 mb-4" />
        <p>Δεν υπάρχουν {title.toLowerCase()} κρατήσεις.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Κέντρο</TableHead>
            <TableHead>Υπηρεσία</TableHead>
            <TableHead>Ημερομηνία</TableHead>
            <TableHead>Ώρα</TableHead>
            <TableHead>Κατάσταση</TableHead>
            <TableHead>Σημειώσεις</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-medium">{booking.storeName}</TableCell>
              <TableCell>{booking.serviceName}</TableCell>
              <TableCell>{format(parseISO(booking.bookingDate), 'dd MMM yyyy', { locale: el })}</TableCell>
              <TableCell>{booking.bookingTime}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(booking.status)} className="capitalize">
                  {getStatusText(booking.status)}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={booking.notes || undefined}>
                {booking.notes || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function MyBookingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.id) {
      setIsLoadingBookings(true);
      setError(null);
      getUserBookings(user.id)
        .then(fetchedBookings => {
          setBookings(fetchedBookings);
        })
        .catch(err => {
          console.error("Error fetching user bookings:", err);
          setError("Δεν ήταν δυνατή η φόρτωση των κρατήσεών σας. Παρακαλώ δοκιμάστε ξανά.");
        })
        .finally(() => {
          setIsLoadingBookings(false);
        });
    } else if (!authLoading && !user) {
      setIsLoadingBookings(false);
      setError("Πρέπει να είστε συνδεδεμένοι για να δείτε αυτή τη σελίδα.");
    }
  }, [user, authLoading]);

  if (authLoading || isLoadingBookings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-full" /> {/* For TabsList */}
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
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
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Πίσω στον Πίνακα Ελέγχου
          </Link>
        </Button>
      </div>
    );
  }

  if (!user) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
        <ShieldAlert className="w-16 h-16 text-primary mb-6" />
        <h1 className="text-2xl font-bold text-primary mb-4">Απαιτείται Σύνδεση</h1>
        <p className="text-md text-muted-foreground mb-6">
          Πρέπει να είστε συνδεδεμένοι για να δείτε τις κρατήσεις σας.
        </p>
        <Button asChild>
          <Link href="/login?redirect=/dashboard/my-bookings">Σύνδεση</Link>
        </Button>
      </div>
    );
  }

  const upcomingBookings = bookings.filter(b => isFuture(parseISO(b.bookingDate)) || format(parseISO(b.bookingDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && !['completed', 'cancelled_by_user', 'cancelled_by_store', 'no_show'].includes(b.status));
  const pastBookings = bookings.filter(b => isPast(parseISO(b.bookingDate)) && format(parseISO(b.bookingDate), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd') || ['completed', 'cancelled_by_user', 'cancelled_by_store', 'no_show'].includes(b.status));


  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Πίσω στον Πίνακα Ελέγχου</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-primary">Οι Κρατήσεις μου</h1>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">
            <CalendarCheck className="mr-2 h-5 w-5" />
            Προσεχείς ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            <CalendarX className="mr-2 h-5 w-5" />
            Ιστορικό ({pastBookings.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Προσεχείς Κρατήσεις</CardTitle>
              <CardDescription>Οι επερχόμενες κρατήσεις σας.</CardDescription>
            </CardHeader>
            <CardContent>
              <BookingsTable bookings={upcomingBookings} title="Προσεχείς" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="past">
          <Card>
            <CardHeader>
              <CardTitle>Ιστορικό Κρατήσεων</CardTitle>
              <CardDescription>Οι προηγούμενες κρατήσεις σας.</CardDescription>
            </CardHeader>
            <CardContent>
              <BookingsTable bookings={pastBookings} title="Προηγούμενες" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
