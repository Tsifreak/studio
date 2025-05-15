
"use client";

import type { Booking, Store } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { CalendarDays, Info, Users, Tag, Clock, ClipboardList } from 'lucide-react';

interface OwnerBookingsDisplayProps {
  bookings: Booking[];
  storesOwned: Store[];
}

const getStatusVariant = (status: Booking['status']): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'pending':
      return 'outline'; // Yellow-ish or neutral
    case 'confirmed':
      return 'default'; // Green or primary
    case 'completed':
      return 'secondary'; // Blue or lighter primary
    case 'cancelled_by_user':
    case 'cancelled_by_store':
      return 'destructive'; // Red
    case 'no_show':
      return 'destructive'; // Darker red or different destructive
    default:
      return 'outline';
  }
};

const getStatusText = (status: Booking['status']): string => {
    switch (status) {
        case 'pending': return 'Εκκρεμεί';
        case 'confirmed': return 'Επιβεβαιωμένο';
        case 'completed': return 'Ολοκληρωμένο';
        case 'cancelled_by_user': return 'Ακυρώθηκε (Χρήστης)';
        case 'cancelled_by_store': return 'Ακυρώθηκε (Κατάστημα)';
        case 'no_show': return 'Δεν Εμφανίστηκε';
        default: return status;
    }
};

export function OwnerBookingsDisplay({ bookings, storesOwned }: OwnerBookingsDisplayProps) {
  if (storesOwned.length === 0) {
    // This component shouldn't be rendered if the user owns no stores,
    // but as a fallback:
    return (
        <CardDescription>Δεν είστε ιδιοκτήτης κάποιου καταχωρημένου κέντρου.</CardDescription>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <ClipboardList className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold text-foreground">Δεν υπάρχουν Κρατήσεις</p>
        <p className="text-muted-foreground">Δεν υπάρχουν κρατήσεις για τα κέντρα σας αυτή τη στιγμή.</p>
      </div>
    );
  }

  const showStoreNameColumn = storesOwned.length > 1;

  return (
    <div className="overflow-x-auto">
        <Table>
        <TableHeader>
            <TableRow>
            {showStoreNameColumn && <TableHead>Κέντρο</TableHead>}
            <TableHead>Υπηρεσία</TableHead>
            <TableHead>Πελάτης</TableHead>
            <TableHead>Ημερομηνία</TableHead>
            <TableHead>Ώρα</TableHead>
            <TableHead>Κατάσταση</TableHead>
            <TableHead>Σημειώσεις</TableHead>
            {/* Add Actions column later if needed */}
            </TableRow>
        </TableHeader>
        <TableBody>
            {bookings.map((booking) => (
            <TableRow key={booking.id}>
                {showStoreNameColumn && <TableCell className="font-medium">{booking.storeName}</TableCell>}
                <TableCell>{booking.serviceName}</TableCell>
                <TableCell>{booking.userName} ({booking.userEmail})</TableCell>
                <TableCell>
                {format(new Date(booking.bookingDate), 'dd MMM yyyy', { locale: el })}
                </TableCell>
                <TableCell>{booking.bookingTime}</TableCell>
                <TableCell>
                    <Badge variant={getStatusVariant(booking.status)} className="capitalize">
                        {getStatusText(booking.status)}
                    </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={booking.notes}>
                    {booking.notes || '-'}
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
        </Table>
    </div>
  );
}
