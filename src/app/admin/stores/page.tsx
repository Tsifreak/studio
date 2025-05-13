
"use client"; 

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit3, Trash2, Eye, ShieldAlert, Home } from 'lucide-react';
import { getAllStores } from '@/lib/placeholder-data'; // This now fetches from DB
import type { Store, StoreCategory } from '@/lib/types';
import { StoreCategories, TranslatedStoreCategories } from '@/lib/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { deleteStoreAction, updateStoreCategoryAction } from '../actions'; 
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const fetchStores = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedStores = await getAllStores();
      setStores(fetchedStores);
    } catch (err) {
      console.error("Failed to fetch stores for admin:", err);
      setError("Δεν ήταν δυνατή η φόρτωση των κέντρων. Παρακαλώ δοκιμάστε ξανά.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleDelete = async () => {
    if (!storeToDelete) return;

    startTransition(async () => {
        const result = await deleteStoreAction(storeToDelete.id);
        if (result.success) {
          toast({
              title: "Επιτυχής Διαγραφή",
              description: result.message,
          });
          // Refetch stores to update the list from DB
          await fetchStores();
        } else {
          toast({
              title: "Σφάλμα Διαγραφής",
              description: result.message,
              variant: "destructive",
          });
        }
        setStoreToDelete(null);
    });
  };

  const handleCategoryChange = async (storeId: string, newCategory: StoreCategory) => {
    startTransition(async () => {
        const result = await updateStoreCategoryAction(storeId, newCategory);
        if (result.success && result.store) {
            toast({
                title: "Επιτυχής Ενημέρωση Κατηγορίας",
                description: result.message,
            });
            // Refetch stores to update the list from DB
            await fetchStores();
        } else {
            toast({
                title: "Σφάλμα Ενημέρωσης Κατηγορίας",
                description: result.message || "Άγνωστο σφάλμα.",
                variant: "destructive",
            });
             // Optionally, refetch even on error to ensure UI consistency if backend state changed partially
            await fetchStores();
        }
    });
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
         <Card>
            <CardHeader>
                 <Skeleton className="h-8 w-1/4" />
                 <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-2 border-b">
                            <Skeleton className="h-6 w-1/4" />
                            <Skeleton className="h-6 w-1/5" />
                            <Skeleton className="h-6 w-1/4" />
                            <div className="flex gap-2">
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 text-center py-10">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold text-destructive">Σφάλμα Φόρτωσης Δεδομένων</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchStores} disabled={isPending || isLoading}>
          {isPending || isLoading ? "Επαναφόρτωση..." : "Προσπαθήστε Ξανά"}
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-primary">Διαχείριση Κέντρων Εξυπηρέτησης</h1>
            <p className="text-muted-foreground">Προβολή, επεξεργασία και προσθήκη νέων κέντρων.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin">
              <Home className="mr-2 h-4 w-4" /> Πίνακας Διαχείρισης
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/stores/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Προσθήκη Νέου Κέντρου
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Λίστα Κέντρων ({stores.length})</CardTitle>
          <CardDescription>Τα τρέχοντα κέντρα εξυπηρέτησης στην πλατφόρμα. Η κατηγορία μπορεί να αλλάξει απευθείας από αυτή τη λίστα.</CardDescription>
        </CardHeader>
        <CardContent>
          {stores.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Όνομα Κέντρου</TableHead>
                  <TableHead className="w-[250px]">Κατηγορία</TableHead>
                  <TableHead className="text-right">Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>
                      <Select
                        value={store.category}
                        onValueChange={(newCategory) => handleCategoryChange(store.id, newCategory as StoreCategory)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder="Επιλέξτε κατηγορία" />
                        </SelectTrigger>
                        <SelectContent>
                          {StoreCategories.map((cat, index) => (
                            <SelectItem key={cat} value={cat}>
                              {TranslatedStoreCategories[index]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild title="Προβολή">
                        <Link href={`/stores/${store.id}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Επεξεργασία Λοιπών Στοιχείων">
                        <Link href={`/admin/stores/edit/${store.id}`}>
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog
                        open={storeToDelete?.id === store.id}
                        onOpenChange={(isOpen) => {
                          if (!isOpen && storeToDelete?.id === store.id) {
                             setStoreToDelete(null);
                          }
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Διαγραφή" onClick={() => setStoreToDelete(store)} disabled={isPending}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                          <AlertDialogTitle>Είστε σίγουροι για τη διαγραφή;</AlertDialogTitle>
                          <AlertDialogDescription>
                              Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Αυτό θα διαγράψει οριστικά το κέντρο "{storeToDelete?.name}"
                              και όλα τα σχετικά δεδομένα από τους διακομιστές μας.
                          </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setStoreToDelete(null)} disabled={isPending}>Άκυρο</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                                {isPending ? "Διαγραφή..." : "Διαγραφή"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Δεν Βρέθηκαν Κέντρα</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Δεν υπάρχουν ακόμη καταχωρημένα κέντρα. Ξεκινήστε προσθέτοντας ένα νέο.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
