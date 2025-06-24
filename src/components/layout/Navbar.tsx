// src/components/layout/Navbar.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaRegCircleUser } from "react-icons/fa6";
import { BsChatDots } from "react-icons/bs";
import { LuCalendarCheck } from "react-icons/lu";
import { LogOut, UserPlus, LogIn, ShieldCheck, Bell, Briefcase, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const unreadMessages = Number(user?.totalUnreadMessages) || 0;
  const pendingBookingsForOwner = Number(user?.pendingBookingsCount) || 0;
  const clientBookingUpdates = Number(user?.bookingStatusUpdatesCount) || 0;
  const showNotificationDot = unreadMessages > 0 || clientBookingUpdates > 0 || pendingBookingsForOwner > 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const landingPageLinks = [
    { href: "/#services", label: "Υπηρεσίες" },
    { href: "/#how-it-works", label: "Πώς Λειτουργεί" },
    { href: "/#why-us", label: "Γιατί Εμάς" }
  ];

  return (
    <div className="navbar-container-wrapper">
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <Logo iconSize={100} className="ml-2" />

          {/* Desktop navigation links */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {landingPageLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-base font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right section: auth/notifications/mobile menu */}
          <div className="flex items-center">
            <nav className="flex items-center gap-2 sm:gap-4">
              {!isClient || isLoading ? (
                <div className="h-10 w-24 animate-pulse rounded-md bg-muted"></div>
              ) : user ? (
                <>
                  {/* Notifications Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative rounded-full"
                        aria-label={`Notifications. Unread Messages: ${unreadMessages}, Pending Bookings (Owner): ${pendingBookingsForOwner}, Booking Updates (Client): ${clientBookingUpdates}`}
                      >
                        <Bell className="h-5 w-5" />
                        {showNotificationDot && (
                          <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 z-30" aria-hidden="true" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-72" align="end">
                      <DropdownMenuLabel>Ειδοποιήσεις</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {showNotificationDot ? (
                        <>
                          {unreadMessages > 0 && (
                            <DropdownMenuItem onClick={() => router.push('/dashboard/chats')}>
                              <BsChatDots className="mr-2 h-4 w-4 text-blue-500" />
                              <span>{unreadMessages} νέα μηνύματα</span>
                            </DropdownMenuItem>
                          )}
                          {clientBookingUpdates > 0 && (
                            <DropdownMenuItem onClick={() => router.push('/dashboard/my-bookings')}>
                              <LuCalendarCheck className="mr-2 h-4 w-4 text-green-500" />
                              <span>{clientBookingUpdates} ενημερώσεις κρατήσεων</span>
                            </DropdownMenuItem>
                          )}
                          {pendingBookingsForOwner > 0 && (
                            <DropdownMenuItem onClick={() => router.push('/dashboard/owner-bookings')}>
                              <Briefcase className="mr-2 h-4 w-4 text-orange-500" />
                              <span>{pendingBookingsForOwner} νέες κρατήσεις (Κέντρο)</span>
                            </DropdownMenuItem>
                          )}
                        </>
                      ) : (
                        <DropdownMenuItem disabled className="text-muted-foreground">
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Δεν υπάρχουν νέες ειδοποιήσεις
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* User Avatar Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                        <Avatar className="h-10 w-10">
                          <div className="absolute inset-0 rounded-full border-2 border-orange-500"></div>
                          <AvatarImage src={user.avatarUrl || '/placeholder-avatar.png'} alt={user.name || 'User Avatar'} />
                          <AvatarFallback>{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-60" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal p-0">
                        <div className="flex flex-col space-y-1 bg-[#E6EBF6] p-2 rounded-md">
                          <p className="text-sm font-medium leading-none">{user.name}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                        <FaRegCircleUser className="mr-2 h-4 w-4" />
                        Λογαριασμός
                        {pendingBookingsForOwner > 0 && (
                          <span className="ml-auto text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                            {pendingBookingsForOwner} νέα
                          </span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/dashboard/chats')}>
                        <BsChatDots className="mr-2 h-4 w-4" />
                        Συνομιλίες
                        {unreadMessages > 0 && (
                          <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/dashboard/my-bookings')}>
                        <LuCalendarCheck className="mr-2 h-4 w-4" />
                        Κρατήσεις
                        {clientBookingUpdates > 0 && (
                          <span className="ml-auto text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                            {clientBookingUpdates} νέα
                          </span>
                        )}
                      </DropdownMenuItem>
                      {user.isAdmin && (
                        <DropdownMenuItem onClick={() => router.push('/admin')}>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Διαχείριση
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Αποσύνδεση
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">
                      <span className="flex items-center">
                        <LogIn className="mr-2 h-4 w-4" /> Σύνδεση
                      </span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-[#ff9300] text-white hover:bg-[#e68300] focus:ring-2 focus:ring-[#ff9300] focus:ring-offset-2 font-semibold py-2 px-4 rounded-md shadow-md transition-all duration-150 ease-in-out"
                  >
                    <Link href="/signup">
                      <span className="flex items-center">
                        <UserPlus className="mr-2 h-4 w-4" /> Εγγραφή
                      </span>
                    </Link>
                  </Button>
                </>
              )}
            </nav>

            {/* Mobile menu toggle button */}
            <div className="md:hidden ml-2">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle main menu"
              >
                {isMobileMenuOpen ? (
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu dropdown content */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {landingPageLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!user && !isLoading && isClient && (
              <div className="border-t border-slate-200 my-2"></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
