"use client";

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare, ListOrdered, Heart, ClipboardList, LogOut, Loader2, User, AlertTriangle, RefreshCw, CalendarClock, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getOwnerDashboardData, getUserBookings } from './actions'; 
import type { Booking, Store } from '@/lib/types';
import { OwnerBookingsDisplay } from '@/components/dashboard/OwnerBookingsDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatCard } from '@/components/dashboard/StatCard';
import { ClientUpcomingBookings } from '@/components/dashboard/ClientUpcomingBookings';
import { Badge } from '@/components/ui/badge';
import { format, isFuture, parseISO } from 'date-fns';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { useToast } from '@/hooks/use-toast';
import { getSavedStoresForUser } from '@/lib/storeService'; // NEW: Import the function to get saved stores

export default function DashboardPage() {
  const { user, isLoading: authLoading, logout, updateUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [ownerBookings, setOwnerBookings] = useState<Booking[]>([]);
  const [ownedStores, setOwnedStores] = useState<Store[]>([]);
  const [isLoadingOwnerData, setIsLoadingOwnerData] = useState(false);
  const [ownerDataError, setOwnerDataError] = useState<string | null>(null);
  const [activeUpcomingOwnerBookingsCount, setActiveUpcomingOwnerBookingsCount] = useState(0);
  const [isLoadingActiveOwnerBookings, setIsLoadingActiveOwnerBookings] = useState(true);

  const [clientUpcomingBookingsCount, setClientUpcomingBookingsCount] = useState(0);
  const [isLoadingClientBookings, setIsLoadingClientBookings] = useState(true); // This will also cover saved stores loading

  const [savedStoresCount, setSavedStoresCount] = useState(0); // NEW: State for saved stores count

  const fetchOwnerData = useCallback(async () => {
    if (user && user.id && user.email === 'tsifrikas.a@gmail.com') {
      setIsLoadingOwnerData(true);
      setIsLoadingActiveOwnerBookings(true);
      setOwnerDataError(null);
      try {
        const data = await getOwnerDashboardData(user.id);
        setOwnedStores(data.storesOwned);
        setOwnerBookings(data.bookings);

        const activeUpcomingOwner = data.bookings.filter(b =>
          (isFuture(parseISO(b.bookingDate)) || format(parseISO(b.bookingDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) &&
          (b.status === 'pending' || b.status === 'confirmed')
        );
        setActiveUpcomingOwnerBookingsCount(activeUpcomingOwner.length);

        if (data.storesOwned.length === 0) {
          console.warn(`[DashboardPage] User ${user.email} identified as potential owner, but no stores found for ownerId: ${user.id}.`);
          setOwnerDataError("Δεν βρέθηκαν καταστήματα που ανήκουν σε εσάς. Βεβαιωθείτε ότι το 'Owner User ID' έχει ρυθμιστεί σωστά.");
        }
      } catch (error) {
        console.error("[DashboardPage] Failed to fetch owner dashboard data:", error);
        setOwnerDataError("Σφάλμα κατά τη φόρτωση δεδομένων ιδιοκτήτη.");
      } finally {
        setIsLoadingOwnerData(false);
        setIsLoadingActiveOwnerBookings(false);
      }
    } else {
        setIsLoadingActiveOwnerBookings(false);
        setActiveUpcomingOwnerBookingsCount(0);
    }
  }, [user]);

  // RENAMED: This function will now fetch both client bookings and saved stores
  const fetchClientRelatedData = useCallback(async () => { 
    if (user && user.id) {
      setIsLoadingClientBookings(true);
      // setIsLoadingSavedStores(true); // No separate loading state needed if combined
      try {
        // Fetch client bookings
        const fetchedBookings = await getUserBookings(user.id);
        const upcomingAndActive = fetchedBookings.filter(b =>
          (isFuture(parseISO(b.bookingDate)) || format(parseISO(b.bookingDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) &&
          (b.status === 'pending' || b.status === 'confirmed')
        );
        setClientUpcomingBookingsCount(upcomingAndActive.length);

        // NEW: Fetch saved stores count
        const fetchedSavedStores = await getSavedStoresForUser(user.id);
        setSavedStoresCount(fetchedSavedStores.length);
      } catch (error) {
        console.error("DashboardPage: Failed to fetch client-related data (bookings or saved stores):", error);
        // Consider setting specific errors if needed
      } finally {
        setIsLoadingClientBookings(false);
        // setIsLoadingSavedStores(false); // No separate loading state
      }
    } else {
      setIsLoadingClientBookings(false);
      setClientUpcomingBookingsCount(0);
      setSavedStoresCount(0); // Reset count if no user
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !authLoading && !user) {
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }

    if (!authLoading && user && user.id) {
      fetchOwnerData();
      fetchClientRelatedData(); // CALL THE RENAMED FUNCTION
    }
  }, [user, authLoading, router, fetchOwnerData, fetchClientRelatedData]); // Update dependencies

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDashboardAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && user) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Σφάλμα Φόρτωσης Εικόνας",
          description: "Το μέγεθος του αρχείου δεν πρέπει να υπερβαίνει τα 5MB.",
          variant: "destructive",
        });
        return;
      }
      try {
        toast({ title: "Επεξεργασία...", description: "Η φωτογραφία σας ανεβαίνει." });
        await updateUserProfile({ avatarFile: file });
        toast({
          title: "Επιτυχία!",
          description: "Η φωτογραφία προφίλ ενημερώθηκε.",
        });
      } catch (error: any) {
        toast({
          title: "Αποτυχία Ενημέρωσης",
          description: error.message || "Δεν ήταν δυνατή η ενημέρωση της φωτογραφίας προφίλ.",
          variant: "destructive",
        });
      }
    }
    // Reset file input to allow re-selection of the same file if needed
    if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = "";
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-8 pt-8">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardHeader className="items-center text-center">
                <Skeleton className="h-24 w-24 rounded-full" />
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <Skeleton className="h-6 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-full mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
                <Skeleton className="h-10 w-3/4 mx-auto mt-4" />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="shadow-lg h-40"><CardContent className="pt-6"><Skeleton className="w-full h-full" /></CardContent></Card>
            ))}
          </div>
        </div>
        <Card className="shadow-lg min-h-[300px]"><CardContent className="pt-6"><Skeleton className="w-full h-full" /></CardContent></Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <ShieldTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Άρνηση Πρόσβασης</h1>
        <p className="text-md text-muted-foreground">Πρέπει να είστε συνδεδεμένοι για να δείτε αυτή τη σελίδα.</p>
        <Button asChild className="mt-6">
          <Link href={`/login?redirect=/dashboard`}>Σύνδεση</Link>
        </Button>
      </div>
    );
  }

  const isOwner = ownedStores.length > 0;

  return (
    <div className="space-y-8 pt-8">
      <h1 className="text-3xl font-bold text-primary">Ο Λογαριασμός μου</h1>
      <input type="file" accept="image/*" ref={avatarFileInputRef} onChange={handleDashboardAvatarChange} className="hidden" id="mainAvatarUpload"/>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 xl:col-span-3">
          <Card className="shadow-lg">
            <CardHeader 
              className="items-center text-center pt-6 cursor-pointer group relative"
              onClick={() => avatarFileInputRef.current?.click()}
              title="Αλλαγή φωτογραφίας προφίλ"
            >
              <Avatar className="h-24 w-24 border-2 border-primary shadow-md mb-3">
                <AvatarImage src={user.avatarUrl || ''} alt={user.name || 'User Avatar'} data-ai-hint="avatar"/>
                <AvatarFallback className="text-3xl">{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30 rounded-t-lg">
                  <Camera className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <CardDescription className="text-sm">{user.email}</CardDescription>
               {user.isAdmin && <Badge variant="destructive" className="mt-1">Διαχειριστής</Badge>}
               {isOwner && !user.isAdmin && <Badge variant="secondary" className="mt-1">Ιδιοκτήτης Κέντρου</Badge>}
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" onClick={handleLogout} className="w-full max-w-xs mx-auto">
                <LogOut className="mr-2 h-4 w-4" /> Αποσύνδεση
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            title="Συνομιλίες"
            value={user.totalUnreadMessages || 0}
            icon={MessageSquare}
            linkHref="/dashboard/chats"
            colorClass="bg-blue-600 text-white"
            description={user.totalUnreadMessages > 0 ? `${user.totalUnreadMessages} νέα μηνύματα` : "Καμία νέα συνομιλία"}
          />
          <StatCard
            title="Οι Κρατήσεις μου"
            value={isLoadingClientBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : clientUpcomingBookingsCount}
            icon={ListOrdered}
            linkHref="/dashboard/my-bookings"
            colorClass="bg-[#0088f3] text-white"
            description={
              isLoadingClientBookings ? "Φόρτωση..." :
              clientUpcomingBookingsCount > 0 ? `${clientUpcomingBookingsCount} προσεχείς` : "Καμία προσεχής κράτηση"
            }
          />
          {isOwner && (
            <StatCard
              title="Κρατήσεις Κέντρου"
              value={isLoadingActiveOwnerBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : activeUpcomingOwnerBookingsCount}
              icon={ClipboardList}
              linkHref="/dashboard/owner-bookings"
              colorClass="bg-primary text-white"
              description={
                isLoadingActiveOwnerBookings ? "Φόρτωση..." :
                activeUpcomingOwnerBookingsCount > 0 ? `${activeUpcomingOwnerBookingsCount} ενεργές/εκκρεμείς` : "Καμία ενεργή/εκκρεμής"
              }
              additionalInfo="(Για το Κέντρο σας)"
            />
          )}
          <StatCard
            title="Αποθηκευμένα Κέντρα"
            value={isLoadingClientBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : savedStoresCount} 
            icon={Heart}
            linkHref="/dashboard/saved-stores" 
            colorClass="bg-saved-card text-saved-card-foreground"
            description={isLoadingClientBookings ? "Φόρτωση..." : `${savedStoresCount} κέντρα`}
          />
        </div>
      </div>
      
      <div id="profile-form-section" className="mt-8">
        <ProfileForm />
      </div>

      <div id="dashboard-main-content" className="mt-8">
        {isOwner ? (
          <>
            {isLoadingOwnerData && (
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center">
                        <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                        Οι Κρατήσεις των Κέντρων μου
                    </CardTitle>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                   <CardDescription>Διαχειριστείτε τις κρατήσεις για τα κέντρα εξυπηρέτησης που σας ανήκουν.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            )}
            {!isLoadingOwnerData && ownerDataError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Σφάλμα Φόρτωσης Δεδομένων Ιδιοκτήτη</AlertTitle>
                <AlertDescription>{ownerDataError}</AlertDescription>
              </Alert>
            )}
            {!isLoadingOwnerData && !ownerDataError && (
              <Card id="owner-bookings" className="shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center">
                            <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                            Οι Κρατήσεις των Κέντρων μου ({ownerBookings.length})
                        </CardTitle>
                        <Button variant="outline" size="icon" onClick={fetchOwnerData} disabled={isLoadingOwnerData} title="Ανανέωση Κρατήσεων">
                            <RefreshCw className={`h-4 w-4 ${isLoadingOwnerData ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    <CardDescription>Διαχειριστείτε τις κρατήσεις για τα κέντρα εξυπηρέτησης που σας ανήκουν.</CardDescription>
                </CardHeader>
                <CardContent>
                    <OwnerBookingsDisplay
                        bookings={ownerBookings}
                        storesOwned={ownedStores}
                        onBookingUpdate={fetchOwnerData}
                    />
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <ClientUpcomingBookings />
        )}
      </div>
    </div>
  );
}

// Helper Icon for missing ShieldTriangle
const ShieldTriangle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 7v10M22 7v10M12 12L2 7M12 12l10-5M12 12v10"/>
  </svg>
);