
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getOwnerDashboardData } from '../actions';
import type { Booking, Store } from '@/lib/types';
import { OwnerBookingsDisplay } from '@/components/dashboard/OwnerBookingsDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, ShieldAlert, RefreshCw, ClipboardList } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function OwnerBookingsManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [ownerBookings, setOwnerBookings] = useState<Booking[]>([]);
  const [ownedStores, setOwnedStores] = useState<Store[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOwnerData = useCallback(async (showToast = false) => {
    if (user && user.id) {
      setIsLoadingData(true);
      setError(null);
      try {
        const data = await getOwnerDashboardData(user.id);
        setOwnedStores(data.storesOwned);
        setOwnerBookings(data.bookings);
        if (showToast) {
          toast({ title: "Επιτυχής Ανανέωση", description: "Τα δεδομένα κρατήσεων ανανεώθηκαν." });
        }
        if (data.storesOwned.length === 0 && !authLoading) {
           setError("Δεν βρέθηκαν καταστήματα που ανήκουν σε εσάς. Βεβαιωθείτε ότι το User ID του ιδιοκτήτη έχει οριστεί σωστά στα στοιχεία του καταστήματος.");
        }
      } catch (err) {
        console.error("[OwnerBookingsManagementPage] Failed to fetch owner dashboard data:", err);
        setError("Σφάλμα κατά τη φόρτωση δεδομένων ιδιοκτήτη.");
        if (showToast) {
          toast({ title: "Σφάλμα Ανανέωσης", description: "Δεν ήταν δυνατή η ανανέωση των δεδομένων.", variant: "destructive" });
        }
      } finally {
        setIsLoadingData(false);
      }
    } else if (!authLoading && !user) {
      setIsLoadingData(false);
      setError("Πρέπει να είστε συνδεδεμένοι για να δείτε αυτή τη σελίδα.");
    }
  }, [user, authLoading, toast]);

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

  if (!user) {
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="mr-2 h-5 w-5 text-primary" />
            Όλες οι Κρατήσεις ({ownerBookings.length})
          </CardTitle>
          <CardDescription>
            Διαχειριστείτε τις κρατήσεις για {ownedStores.length > 1 ? "τα κέντρα σας" : ownedStores.length === 1 ? `το κέντρο "${ownedStores[0].name}"` : "τα κέντρα σας"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OwnerBookingsDisplay
            bookings={ownerBookings}
            storesOwned={ownedStores}
            onBookingUpdate={() => fetchOwnerData(false)} // Pass false to avoid redundant toast on internal updates
          />
        </CardContent>
      </Card>
    </div>
  );
}

