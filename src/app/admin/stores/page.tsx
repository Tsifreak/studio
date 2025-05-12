
"use client"; // This page involves client-side interactions (confirm dialog, router)

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit3, Trash2, Eye, ShieldAlert, Home } from 'lucide-react';
import { getAllStores } from '@/lib/placeholder-data';
import type { Store } from '@/lib/types';
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
import { useToast } from '@/hooks/use-toast';
import { deleteStoreAction } from '../actions'; // Server action for delete
import { Skeleton } from '@/components/ui/skeleton';

// No metadata export for client components in app router

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching data
    setIsLoading(true);
    const fetchedStores = getAllStores();
    setStores(fetchedStores);
    setIsLoading(false);
  }, []);

  const handleDelete = async () => {
    if (!storeToDelete) return;

    const result = await deleteStoreAction(storeToDelete.id);
    if (result.success) {
      toast({
        title: "Επιτυχής Διαγραφή",
        description: result.message,
      });
      setStores(prevStores => prevStores.filter(s => s.id !== storeToDelete!.id));
    } else {
      toast({
        title: "Σφάλμα Διαγραφής",
        description: result.message,
        variant: "destructive",
      });
    }
    setStoreToDelete(null); // Close dialog
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
          <CardDescription>Τα τρέχοντα κέντρα εξυπηρέτησης στην πλατφόρμα.</CardDescription>
        </CardHeader>
        <CardContent>
          {stores.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Όνομα Κέντρου</TableHead>
                  <TableHead>Κατηγορία</TableHead>
                  <TableHead className="text-right">Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>{store.category || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild title="Προβολή">
                        <Link href={`/stores/${store.id}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Επεξεργασία">
                        <Link href={`/admin/stores/edit/${store.id}`}>
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog
                        open={storeToDelete?.id === store.id}
                        onOpenChange={(isOpen) => {
                          if (isOpen) {
                            setStoreToDelete(store);
                          } else {
                            // Only nullify if this specific dialog was the one being closed
                            if (storeToDelete?.id === store.id) {
                              setStoreToDelete(null);
                            }
                          }
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Διαγραφή" onClick={() => setStoreToDelete(store)}>
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
                            <AlertDialogCancel>Άκυρο</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                Διαγραφή
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
