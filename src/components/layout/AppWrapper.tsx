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
      const isDarkMode = user?.preferences?.darkMode;

      if (isDarkMode) {
        root.classList.add('dark');
      } else {
        // Only remove 'dark' if explicitly false, not if undefined (during initial load)
        // The initial load effect below handles the undefined case based on localStorage
        if (isDarkMode === false) {
          root.classList.remove('dark');
        }
      }

      // Persist to localStorage when the user object is available and has a preference
      if (typeof user?.preferences?.darkMode !== 'undefined') {
          localStorage.setItem('darkMode', JSON.stringify(user.preferences.darkMode));
      }
    }
  }, [user?.preferences?.darkMode]);

  // Effect to apply theme from localStorage on initial client-side load
  // This runs once and helps prevent FOUC.
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
      // else, if nothing in localStorage, it defaults to light theme (no 'dark' class)
      // until the AuthContext provides the user preference.
    }
  }, []); // Empty dependency array: runs only once on mount

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-grow container py-8">
        {children}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
