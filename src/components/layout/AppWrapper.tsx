
"use client";

import React, { useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/hooks/useAuth';

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Effect to apply theme based on AuthContext user preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      const userPref = user?.preferences?.darkMode;

      if (typeof userPref === 'boolean') { // Only act if preference is explicitly set
        if (userPref) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        localStorage.setItem('darkMode', JSON.stringify(userPref));
      }
    }
  }, [user]); // Re-run when the user object changes

  // Effect to apply theme from localStorage on initial client-side load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedDarkMode = localStorage.getItem('darkMode');
      const root = window.document.documentElement;
      if (storedDarkMode !== null) {
        if (JSON.parse(storedDarkMode)) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col w-full max-w-screen-xl mx-auto shadow-lg bg-background">
      <Navbar />
      <main className="flex-grow"> {/* Removed container and py-8 */}
        {children}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
