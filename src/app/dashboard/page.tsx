
"use client"; // Required because ProfileForm and useAuth are client-side

import { ProfileForm } from '@/components/auth/ProfileForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Metadata can't be dynamic in a client component this way. 
// If truly dynamic metadata based on user is needed, it'd be more complex.
// For now, static metadata or move to layout if applicable.
// export const metadata: Metadata = {
//   title: 'Dashboard | StoreSpot',
//   description: 'Manage your StoreSpot account and preferences.',
// };

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If still loading, wait. If not loading and no user, redirect to login.
    if (!isLoading && !user) {
      router.push('/login?redirect=/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by the redirect, but as a fallback:
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <h1 className="text-3xl font-bold text-primary mb-4">Access Denied</h1>
        <p className="text-md text-muted-foreground mb-6">
          You need to be logged in to view this page.
        </p>
        <Button asChild>
          <Link href="/login?redirect=/dashboard">Login</Link>
        </Button>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-primary">Welcome, {user.name}!</h1>
            <p className="text-muted-foreground">Here's your personalized dashboard.</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>Log Out</Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ProfileForm />
        </div>
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Account Overview</CardTitle>
                    <CardDescription>Quick summary of your account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Joined:</strong> (Simulated) January 1, 2023</p>
                    <Button variant="link" className="p-0 h-auto text-primary">View Order History (Example)</Button>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2">
                    <Button variant="outline" asChild><Link href="/">Browse Stores</Link></Button>
                    <Button variant="outline" disabled>My Saved Stores (Example)</Button>
                    <Button variant="outline" disabled>Support Center (Example)</Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
