
"use client";

import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar'; // Assuming you might want the main navbar
import { Footer } from '@/components/layout/Footer'; // Or a specific admin footer
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      router.push('/login?redirect=/admin'); // Redirect to login or a 'not authorized' page
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow container py-8 flex justify-center items-center">
          <p className="text-lg text-muted-foreground">Φόρτωση σελίδας διαχειριστή...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow container py-8 flex flex-col items-center justify-center text-center">
           <ShieldAlert className="w-16 h-16 text-destructive mb-6" />
          <h1 className="text-3xl font-bold text-primary mb-4">Μη εξουσιοδοτημένη πρόσβαση</h1>
          <p className="text-md text-muted-foreground mb-6">
            Δεν έχετε δικαιώματα διαχειριστή για την προβολή αυτής της σελίδας.
          </p>
          <Button asChild>
            <Link href="/">Επιστροφή στην Αρχική</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* <Navbar /> // You might have a different Navbar for admin or reuse */}
      <main className="flex-grow container py-8">
        {/* Optional: Add Admin specific sidebar or header here */}
        {children}
      </main>
      {/* <Footer /> */}
    </div>
  );
}
