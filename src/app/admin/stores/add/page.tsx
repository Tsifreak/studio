
import { StoreForm } from '@/components/admin/StoreForm';
import { addStoreAction } from '../../actions';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Προσθήκη Νέου Κέντρου | Amaxakis Admin',
  description: 'Προσθέστε ένα νέο κέντρο εξυπηρέτησης στην πλατφόρμα Amaxakis.',
};

export default function AddStorePage() {
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" asChild>
                <Link href="/admin/stores">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Πίσω στα Κέντρα</span>
                </Link>
            </Button>
            <h1 className="text-2xl font-semibold">Προσθήκη Νέου Κέντρου</h1>
        </div>
      <StoreForm action={addStoreAction} />
    </div>
  );
}
