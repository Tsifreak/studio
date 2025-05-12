
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function StoreNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
      <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
      <h1 className="text-4xl font-bold text-foreground mb-2">Το Κέντρο Εξυπηρέτησης δεν Βρέθηκε</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Λυπούμαστε, δεν μπορέσαμε να βρούμε το κέντρο εξυπηρέτησης που αναζητούσατε.
      </p>
      <Button asChild>
        <Link href="/">Επιστροφή στην Αρχική Σελίδα</Link>
      </Button>
    </div>
  );
}

