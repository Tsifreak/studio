
// src/components/layout/navbar.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Assuming you have this
import { Logo } from '@/components/shared/Logo'; // Assuming you have this
import { useAuth } from '@/hooks/useAuth'; // Assuming you have this
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Assuming
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Assuming
import { LayoutDashboard, LogOut, UserPlus, LogIn, ShieldCheck, Bell, MessageSquare, ListOrdered } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // <-- ADDED for mobile menu

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

  const toggleMobileMenu = () => { // <-- ADDED for mobile menu
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const landingPageLinks = [ // <-- ADDED landing page links
    { href: "/#services", label: "Υπηρεσίες" },
    { href: "/#how-it-works", label: "Πώς Λειτουργεί" },
    { href: "/#why-us", label: "Γιατί Εμάς" }
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container flex h-16 items-center justify-between">
        <Logo iconSize={100} className="ml-2" />

        {/* ===== START: Desktop Landing Page Links ===== */}
        <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
          {landingPageLinks.map((link) => (
            <Link key={link.label} href={link.href} legacyBehavior>
              <a className="text-base font-medium text-muted-foreground hover:text-primary transition-colors">
                {link.label}
              </a>
            </Link>
          ))}
        </div>
        {/* ===== END: Desktop Landing Page Links ===== */}

        <div className="flex items-center"> {/* Wrapper for auth nav and mobile menu button */}
          <nav className="flex items-center gap-2 sm:gap-4">
            {!isClient || isLoading ? (
              <div className="h-10 w-24 animate-pulse rounded-md bg-muted"></div>
            ) : user ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-full"
                  onClick={() => {
                    if (pendingBookingsForOwner > 0) router.push('/dashboard');
                    else if (clientBookingUpdates > 0) router.push('/dashboard/my-bookings');
                    else if (unreadMessages > 0) router.push('/dashboard/chats');
                    else router.push('/dashboard');
                  }}
                  aria-label={`Notifications. Unread Messages: ${unreadMessages}, Pending Bookings (Owner): ${pendingBookingsForOwner}, Booking Updates (Client): ${clientBookingUpdates}`}
                >
                  <Bell className="h-5 w-5" />
                  {showNotificationDot && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 z-30" aria-hidden="true" />
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl || ''} alt={user.name || 'User Avatar'} />
                        <AvatarFallback>{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-60" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Πίνακας Ελέγχου
                      {pendingBookingsForOwner > 0 && (
                           <span className="ml-auto text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                            {pendingBookingsForOwner} εκκρεμείς
                           </span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/chats')}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Συνομιλίες
                      {unreadMessages > 0 && (
                        <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/my-bookings')}>
                      <ListOrdered className="mr-2 h-4 w-4" />
                      Οι Κρατήσεις μου (Πελάτης)
                        {clientBookingUpdates > 0 && (
                            <span className="ml-auto text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                            {clientBookingUpdates} ενημερώσεις
                            </span>
                        )}
                    </DropdownMenuItem>
                    {user.isAdmin && (
                      <DropdownMenuItem onClick={() => router.push('/admin')}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Πίνακας Διαχείρισης
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
                    <LogIn className="mr-2 h-4 w-4" /> Σύνδεση
                  </Link>
                </Button>
                <Button
                  asChild
                  className="bg-[#FFA500] text-white hover:bg-[#FFB733] focus:ring-2 focus:ring-[#FFA500] focus:ring-offset-2 font-semibold py-2 px-4 rounded-md shadow-md transition-all duration-150 ease-in-out"
                >
                  <Link href="/signup">
                    <UserPlus className="mr-2 h-4 w-4" /> Εγγραφή
                  </Link>
                </Button>
              </>
            )}
          </nav>

          {/* ===== START: Mobile Menu Button (Hamburger) ===== */}
          <div className="md:hidden ml-2"> {/* Added ml-2 for spacing from auth buttons if they are visible */}
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle main menu"
            >
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
              )}
            </button>
          </div>
          {/* ===== END: Mobile Menu Button ===== */}
        </div> {/* End of flex items-center justify-between */}
      </div> {/* End of container div */}

      {/* ===== START: Mobile Menu Dropdown ===== */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {landingPageLinks.map((link) => (
              <Link key={link.label} href={link.href} legacyBehavior>
                <a
                  className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
                >
                  {link.label}
                </a>
              </Link>
            ))}
            {/* Divider for visual separation before auth links on mobile, if user is not logged in */}
            {!user && !isLoading && isClient && (
                 <div className="border-t border-slate-200 my-2"></div>
            )}
            {/* Optional: You can also include simplified login/signup here from your existing logic if needed */}
            {/* Or keep the mobile menu focused on section links and let the main auth buttons (if they become visible on mobile) handle auth */}
          </div>
        </div>
      )}
      {/* ===== END: Mobile Menu Dropdown ===== */}
    </header>
  );
}
