
"use client";

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
import { LayoutDashboard, LogOut, UserCircle, LogIn, UserPlus, ShieldCheck, Bell, MessageSquare, CalendarCheck, ListOrdered } from 'lucide-react'; 
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react'; 

export function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false); 
  
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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Logo iconSize={40} className="ml-2" />
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
                  // Prioritize: Owner pending bookings > Client booking updates > Chats
                  if (pendingBookingsForOwner > 0) router.push('/dashboard'); // Owner dashboard to see their bookings
                  else if (clientBookingUpdates > 0) router.push('/dashboard/my-bookings'); // Client bookings
                  else if (unreadMessages > 0) router.push('/dashboard/chats'); // Chats
                  else router.push('/dashboard'); // Default to dashboard
                }}
                aria-label={`Notifications. Unread Messages: ${unreadMessages}, Pending Bookings (Owner): ${pendingBookingsForOwner}, Booking Updates (Client): ${clientBookingUpdates}`}
              >
                <Bell className="h-5 w-5" />
                {showNotificationDot && (
                  <span
                    className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 z-30" 
                    aria-hidden="true"
                  />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0"> 
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl || ''} alt={user.name || 'User Avatar'} data-ai-hint="avatar" />
                      <AvatarFallback>{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
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
              <Button asChild>
                <Link href="/signup">
                 <UserPlus className="mr-2 h-4 w-4" /> Εγγραφή
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
