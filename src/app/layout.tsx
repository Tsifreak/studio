
import type { Metadata } from 'next';
import { Comfortaa } from 'next/font/google'; // Changed from Fredoka
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppWrapper } from '@/components/layout/AppWrapper';

const comfortaa = Comfortaa({ // Changed from Fredoka
  subsets: ['latin', 'greek'], // Ensure Greek subset is included
  variable: '--font-comfortaa', // New CSS variable
  weight: ['400', '500', '700'] // Common weights, adjust as needed
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
      <body className={`${comfortaa.variable} font-sans antialiased`}>
        <AuthProvider>
          <AppWrapper>
            {children}
          </AppWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
