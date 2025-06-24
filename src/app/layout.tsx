import type { Metadata } from 'next';
import { Comfortaa } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppWrapper } from '@/components/layout/AppWrapper';
import { NextAuthProvider } from '@/components/auth/NextAuthProvider';

const comfortaa = Comfortaa({
  subsets: ['latin', 'greek'],
  variable: '--font-comfortaa',
  weight: ['400', '500', '700'],
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
        <NextAuthProvider>
          <AuthProvider>
            <AppWrapper>
              {children}
            </AppWrapper>
          </AuthProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}