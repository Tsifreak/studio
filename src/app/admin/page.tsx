
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, PlusCircle, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Πίνακας Διαχείρισης | Amaxakis Admin',
  description: 'Διαχειριστείτε τα κέντρα εξυπηρέτησης και τις ρυθμίσεις της εφαρμογής.',
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Πίνακας Διαχείρισης Amaxakis</h1>
        {/* Placeholder for potential future actions like "App Settings" */}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Διαχείριση Κέντρων</CardTitle>
            <ListChecks className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Κέντρα Εξυπηρέτησης</div>
            <p className="text-xs text-muted-foreground pt-1">
              Προβολή, επεξεργασία ή διαγραφή υπαρχόντων κέντρων.
            </p>
            <Button asChild className="mt-4 w-full">
              <Link href="/admin/stores">Διαχείριση Κέντρων</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Προσθήκη Νέου Κέντρου</CardTitle>
            <PlusCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Νέο Κέντρο</div>
            <p className="text-xs text-muted-foreground pt-1">
              Προσθήκη ενός νέου κέντρου εξυπηρέτησης στην πλατφόρμα.
            </p>
            <Button asChild className="mt-4 w-full">
              <Link href="/admin/stores/add">Προσθήκη Κέντρου</Link>
            </Button>
          </CardContent>
        </Card>
        
        {/* Placeholder for future admin features like User Management */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow opacity-50 cursor-not-allowed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Διαχείριση Χρηστών</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Χρήστες</div>
            <p className="text-xs text-muted-foreground pt-1">
              (Προσεχώς) Προβολή και διαχείριση λογαριασμών χρηστών.
            </p>
            <Button disabled className="mt-4 w-full">Διαχείριση Χρηστών</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
