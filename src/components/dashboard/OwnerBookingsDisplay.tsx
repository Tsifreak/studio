
"use client";

import type { Booking, BookingStatus, Store } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { ClipboardList, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
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
import React, { useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { updateBookingStatusAction } from '@/app/dashboard/actions';

interface OwnerBookingsDisplayProps {
  bookings: Booking[];
  storesOwned: Store[];
  onBookingUpdate: () => Promise<void>; 
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
        case 'confirmed': return 'Αποδεκτό';
        case 'completed': return 'Ολοκληρωμένο';
        case 'cancelled_by_user': return 'Ακυρώθηκε (Χρήστης)';
        case 'cancelled_by_store': return 'Απορρίφθηκε (Κατάστημα)';
        case 'no_show': return 'Δεν Εμφανίστηκε';
        default: return status;
    }
};

export function OwnerBookingsDisplay({ bookings, storesOwned, onBookingUpdate }: OwnerBookingsDisplayProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [bookingToManage, setBookingToManage] = useState<Booking | null>(null);
  const [managementAction, setManagementAction] = useState<'accept' | 'decline' | null>(null);

  const handleUpdateStatus = async (booking: Booking, newStatus: BookingStatus) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('bookingId', booking.id);
      formData.append('newStatus', newStatus);
      formData.append('bookingStoreId', booking.storeId);
      formData.append('clientUserId', booking.userId); // Ensure clientUserId is sent
      formData.append('originalStatus', booking.status); // Ensure originalStatus is sent
      
      console.log("[OwnerBookingsDisplay] Submitting FormData for status update:");
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      const result = await updateBookingStatusAction(null, formData);

      if (result.success) {
        toast({
          title: "Επιτυχία",
          description: result.message,
        });
        await onBookingUpdate(); 
      } else {
        toast({
          title: "Σφάλμα",
          description: result.message || "Παρουσιάστηκε ένα σφάλμα.",
          variant: "destructive",
        });
      }
      setBookingToManage(null); 
      setManagementAction(null);
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
                  {booking.bookingDate ? format(parseISO(booking.bookingDate), 'dd MMM yyyy', { locale: el }) : 'N/A'}
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
                                onClick={() => {
                                    setBookingToManage(booking); // Set booking to manage for pending state
                                    setManagementAction('accept'); // Set action type
                                    handleUpdateStatus(booking, 'confirmed');
                                }}
                                disabled={isPending && bookingToManage?.id === booking.id && managementAction === 'accept'}
                                className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                            >
                                {isPending && bookingToManage?.id === booking.id && managementAction === 'accept' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-2 h-4 w-4" />}
                                Αποδοχή
                            </Button>
                            <AlertDialog
                                open={bookingToManage?.id === booking.id && managementAction === 'decline'}
                                onOpenChange={(isOpen) => {
                                if (!isOpen && bookingToManage?.id === booking.id) {
                                    setBookingToManage(null);
                                    setManagementAction(null);
                                }
                                }}
                            >
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        onClick={() => {
                                            setBookingToManage(booking);
                                            setManagementAction('decline');
                                        }}
                                        disabled={isPending && bookingToManage?.id === booking.id && managementAction === 'decline'}
                                    >
                                        <ThumbsDown className="mr-2 h-4 w-4" />
                                        Απόρριψη
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Είστε σίγουροι για την απόρριψη;</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Αυτή η ενέργεια θα απορρίψει την κράτηση για τον πελάτη {bookingToManage?.userName} στην υπηρεσία "{bookingToManage?.serviceName}".
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => {setBookingToManage(null); setManagementAction(null);}} disabled={isPending}>Άκυρο</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={() => bookingToManage && handleUpdateStatus(bookingToManage, 'cancelled_by_store')} 
                                        className="bg-destructive hover:bg-destructive/90" 
                                        disabled={isPending}
                                    >
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Ναι, Απόρριψη"}
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
