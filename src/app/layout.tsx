
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google'; // Assuming Geist is a placeholder for a chosen font.
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppWrapper } from '@/components/layout/AppWrapper';

const geistSans = Geist({ // If Geist is specific, ensure it's correctly configured or replace.
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({ // Same as above for Geist_Mono.
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Amaxakis - Η Αξιόπιστη Υπηρεσία Επισκευής Αυτοκινήτων Σας',
  description: 'Η Amaxakis παρέχει αξιόπιστες υπηρεσίες επισκευής και συντήρησης αυτοκινήτων. Βρείτε έμπειρους μηχανικούς και κλείστε το ραντεβού σας.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <AppWrapper>
            {children}
          </AppWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}

