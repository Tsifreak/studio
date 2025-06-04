
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserBookings } from '@/app/dashboard/actions';
import type { Booking } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isFuture, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { CalendarClock, Loader2, AlertTriangle, Info, ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const getStatusVariant = (status: Booking['status']): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'pending': return 'outline';
    case 'confirmed': return 'default';
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
        case 'cancelled_by_user': return 'Ακυρώθηκε (Εσείς)';
        case 'cancelled_by_store': return 'Ακυρώθηκε (Κατάστημα)';
        case 'no_show': return 'Δεν Εμφανιστήκατε';
        default: return status;
    }
};

export function ClientUpcomingBookings() {
  const { user, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.id && !authLoading) {
      setIsLoadingBookings(true);
      setError(null);
      getUserBookings(user.id)
        .then(fetchedBookings => {
          setBookings(fetchedBookings.filter(b =>
            (isFuture(parseISO(b.bookingDate)) || format(parseISO(b.bookingDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) &&
            !['completed', 'cancelled_by_user', 'cancelled_by_store', 'no_show'].includes(b.status)
          ));
        })
        .catch(err => {
          console.error("ClientUpcomingBookings: Error fetching user bookings:", err);
          setError("Δεν ήταν δυνατή η φόρτωση των προσεχών κρατήσεων.");
        })
        .finally(() => {
          setIsLoadingBookings(false);
        });
    } else if (!authLoading && !user) {
      setIsLoadingBookings(false);
      setError("Πρέπει να είστε συνδεδεμένοι για να δείτε τις κρατήσεις σας.");
    }
  }, [user, authLoading]);

  if (authLoading || isLoadingBookings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarClock className="mr-2 h-5 w-5 text-primary" />
            Προσεχείς Κρατήσεις
          </CardTitle>
          <CardDescription>Φόρτωση των επερχόμενων ραντεβού σας...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Σφάλμα
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarClock className="mr-2 h-5 w-5 text-primary" />
            Προσεχείς Κρατήσεις
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Δεν έχετε προσεχείς κρατήσεις.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarClock className="mr-2 h-5 w-5 text-primary" />
          Προσεχείς Κρατήσεις ({bookings.length})
        </CardTitle>
        <CardDescription>Τα επερχόμενα ραντεβού σας.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Κέντρο</TableHead>
              <TableHead>Υπηρεσία</TableHead>
              <TableHead>Ημερομηνία</TableHead>
              <TableHead>Ώρα</TableHead>
              <TableHead>Κατάσταση</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

