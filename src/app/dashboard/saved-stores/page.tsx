"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react'; // For checking user authentication
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { StoreCard } from '@/components/store/StoreCard'; // Assuming your StoreCard component path
import type { Store } from '@/lib/types'; // Import your Store type
import { getSavedStoresForUser } from '@/lib/storeService'; // Import the new function from your service

export default function SavedStoresPage() {
  const { data: session, status } = useSession(); // Get the user session
  const userId = session?.user?.id; // Extract the user ID from the session

  const [savedStores, setSavedStores] = useState<Store[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserSavedStores = async () => {
      if (status === 'loading') {
        // Still loading session, do nothing yet
        return;
      }
      if (!userId) {
        // User is not logged in
        setIsLoading(false);
        setError("Δεν είστε συνδεδεμένοι. Παρακαλώ συνδεθείτε για να δείτε τα αποθηκευμένα κέντρα.");
        return;
      }

      setIsLoading(true);
      setError(null); // Clear previous errors
      try {
        const fetchedStores = await getSavedStoresForUser(userId); // Call the service function
        setSavedStores(fetchedStores);
      } catch (err) {
        console.error("Failed to fetch saved stores:", err);
        setError("Δεν ήταν δυνατή η φόρτωση των αποθηκευμένων κέντρων.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserSavedStores();
    // Re-run this effect when userId or session status changes
  }, [userId, status]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Display multiple skeleton cards while loading */}
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-xl mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Σφάλμα</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!savedStores || savedStores.length === 0) {
    return (
      <Alert className="max-w-xl mx-auto">
        <Info className="h-4 w-4" />
        <AlertTitle>Δεν βρέθηκαν αποθηκευμένα κέντρα</AlertTitle>
        <AlertDescription>
          Δεν έχετε αποθηκεύσει ακόμη κανένα κέντρο. Αποθηκεύστε τα αγαπημένα σας κέντρα από τις σελίδες τους!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Αποθηκευμένα Κέντρα</CardTitle>
          <CardDescription>Όλα τα κέντρα που έχετε αποθηκεύσει.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Map through the fetched saved stores and render a StoreCard for each */}
          {savedStores.map(store => (
            <StoreCard key={store.id} store={store} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}