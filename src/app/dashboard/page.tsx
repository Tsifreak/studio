
"use client";

import { ProfileForm } from '@/components/auth/ProfileForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react'; // Added React, useCallback
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare, Home, ShoppingBag, CalendarCheck, Loader2, RefreshCw } from 'lucide-react'; 
import { getOwnerDashboardData } from './actions'; 
import type { Booking, Store } from '@/lib/types';
import { OwnerBookingsDisplay } from '@/components/dashboard/OwnerBookingsDisplay';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const [ownerBookings, setOwnerBookings] = useState<Booking[]>([]);
  const [ownedStores, setOwnedStores] = useState<Store[]>([]);
  const [isLoadingOwnerData, setIsLoadingOwnerData] = useState(false); // Renamed for clarity

  const fetchOwnerData = useCallback(async () => {
    if (user && user.id) {
      setIsLoadingOwnerData(true);
      try {
        const data = await getOwnerDashboardData(user.id);
        setOwnedStores(data.storesOwned);
        setOwnerBookings(data.bookings);
      } catch (error) {
        console.error("Failed to fetch owner dashboard data:", error);
        // Optionally set an error state here
      } finally {
        setIsLoadingOwnerData(false);
      }
    }
  }, [user]); // Added user to dependency array

  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoading && !user) {
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }

    fetchOwnerData(); // Call fetchOwnerData directly
  }, [user, isLoading, router, fetchOwnerData]); // Added fetchOwnerData to dependencies

  if (isLoading) { // This is auth loading
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground ml-3">Φόρτωση πίνακα ελέγχου...</p>
      </div>
    );
  }

  if (!user) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <h1 className="text-3xl font-bold text-primary mb-4">Άρνηση Πρόσβασης</h1>
        <p className="text-md text-muted-foreground mb-6">
          Πρέπει να είστε συνδεδεμένοι για να δείτε αυτή τη σελίδα. Ανακατεύθυνση στη σελίδα σύνδεσης...
        </p>
         <Button asChild>
          <Link href="/login?redirect=/dashboard">Σύνδεση</Link>
        </Button>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/'); 
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-primary">Καλώς ήρθες, {user.name}!</h1>
            <p className="text-muted-foreground">Αυτός είναι ο εξατομικευμένος πίνακας ελέγχου σας στην Amaxakis.</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>Αποσύνδεση</Button>
      </div>
      
      {ownedStores.length > 0 && (
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center">
                        <ShoppingBag className="mr-2 h-5 w-5 text-primary" />
                        Οι Κρατήσεις των Κέντρων μου ({ownerBookings.length})
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={fetchOwnerData} disabled={isLoadingOwnerData} title="Ανανέωση Κρατήσεων">
                        <RefreshCw className={`h-4 w-4 ${isLoadingOwnerData ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                <CardDescription>Διαχειριστείτε τις κρατήσεις για τα κέντρα εξυπηρέτησης που σας ανήκουν.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingOwnerData ? (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <OwnerBookingsDisplay 
                        bookings={ownerBookings} 
                        storesOwned={ownedStores}
                        onBookingUpdate={fetchOwnerData} // Pass callback to refresh data
                    />
                )}
            </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ProfileForm />
        </div>
        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Επισκόπηση Λογαριασμού</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p><strong>Όνομα:</strong> {user.name}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    {user.isAdmin && <p className="text-sm font-semibold text-destructive">Ρόλος: Διαχειριστής</p>}
                    {ownedStores.length > 0 && !user.isAdmin && <p className="text-sm font-semibold text-green-600">Ρόλος: Ιδιοκτήτης Κέντρου</p>}

                    <Button asChild variant="link" className="p-0 h-auto text-primary">
                        <Link href="/dashboard/my-bookings">Οι Κρατήσεις μου (Ως Πελάτης)</Link>
                    </Button>
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                      Οι Συνομιλίες μου
                    </CardTitle>
                    <CardDescription>Δείτε και απαντήστε στις συνομιλίες σας.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/dashboard/chats">Προβολή Συνομιλιών ({user.totalUnreadMessages || 0})</Link>
                    </Button>
                </CardContent>
            </Card>
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Γρήγοροι Σύνδεσμοι</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2">
                    <Button variant="outline" asChild><Link href="/"><Home className="mr-2"/>Αρχική Σελίδα</Link></Button>
                     {user.isAdmin && (
                        <Button variant="outline" asChild>
                            <Link href="/admin"><CalendarCheck className="mr-2"/>Πίνακας Διαχείρισης</Link>
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
