
"use client";

import type { Booking, BookingStatus, Store } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { ClipboardList, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import React, { useActionState, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { updateBookingStatusAction } from '@/app/dashboard/actions'; // Assuming this is the correct path

interface OwnerBookingsDisplayProps {
  bookings: Booking[];
  storesOwned: Store[];
  onBookingUpdate: () => Promise<void>; // Callback to refresh data
}

const getStatusVariant = (status: Booking['status']): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'pending':
      return 'outline';
    case 'confirmed':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'cancelled_by_user':
    case 'cancelled_by_store':
    case 'no_show':
      return 'destructive';
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

const initialFormState: { success: boolean; message: string; errors?: any; } = { 
  success: false, 
  message: "", 
  errors: null
};

export function OwnerBookingsDisplay({ bookings, storesOwned, onBookingUpdate }: OwnerBookingsDisplayProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  // We don't need useActionState here as we are directly calling the action
  // and handling its response manually.

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus, storeId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('bookingId', bookingId);
      formData.append('newStatus', newStatus);
      formData.append('bookingStoreId', storeId); // Pass storeId for potential future authorization

      // Directly call the server action.
      // Note: server actions called this way don't return the state like useActionState.
      // They return the promise of the action's result.
      const result = await updateBookingStatusAction(null, formData);

      if (result.success) {
        toast({
          title: "Επιτυχία",
          description: result.message,
        });
        await onBookingUpdate(); // Refresh bookings list
      } else {
        toast({
          title: "Σφάλμα",
          description: result.message || "Παρουσιάστηκε ένα σφάλμα.",
          variant: "destructive",
        });
      }
      if (newStatus === 'cancelled_by_store') {
        setBookingToCancel(null); // Close dialog after action
      }
    });
  };


  if (storesOwned.length === 0) {
    return (
        <p className="text-muted-foreground">Δεν είστε ιδιοκτήτης κάποιου καταχωρημένου κέντρου.</p>
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
            <TableHead className="text-right">Ενέργειες</TableHead>
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
                <TableCell className="max-w-[150px] truncate" title={booking.notes}>
                    {booking.notes || '-'}
                </TableCell>
                <TableCell className="text-right">
                    {booking.status === 'pending' && (
                        <div className="flex gap-2 justify-end">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleUpdateStatus(booking.id, 'confirmed', booking.storeId)}
                                disabled={isPending}
                            >
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Επιβεβαίωση
                            </Button>
                            <AlertDialog
                                open={bookingToCancel?.id === booking.id}
                                onOpenChange={(isOpen) => {
                                if (!isOpen && bookingToCancel?.id === booking.id) {
                                    setBookingToCancel(null);
                                }
                                }}
                            >
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        onClick={() => setBookingToCancel(booking)}
                                        disabled={isPending}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Ακύρωση
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Είστε σίγουροι για την ακύρωση;</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Αυτή η ενέργεια θα ακυρώσει την κράτηση για τον πελάτη {bookingToCancel?.userName} στην υπηρεσία "{bookingToCancel?.serviceName}".
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setBookingToCancel(null)} disabled={isPending}>Άκυρο</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={() => bookingToCancel && handleUpdateStatus(bookingToCancel.id, 'cancelled_by_store', bookingToCancel.storeId)} 
                                        className="bg-destructive hover:bg-destructive/90" 
                                        disabled={isPending}
                                    >
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Ναι, Ακύρωση"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                     {booking.status !== 'pending' && <span className="text-xs text-muted-foreground">-</span>}
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
        </Table>
    </div>
  );
}
