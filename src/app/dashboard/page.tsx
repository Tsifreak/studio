
"use client";

import { ProfileForm } from '@/components/auth/ProfileForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Metadata } from 'next'; // For potential future use if moving to RSC with dynamic metadata

// export const metadata: Metadata = { // Cannot be used in client component like this
//   title: 'Dashboard | Amaxakis',
//   description: 'Manage your Amaxakis account and preferences.',
// };

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoading && !user) {
      // Construct the redirect query parameter correctly
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
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
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <h1 className="text-3xl font-bold text-primary mb-4">Access Denied</h1>
        <p className="text-md text-muted-foreground mb-6">
          You need to be logged in to view this page. Redirecting to login...
        </p>
        {/* Button can be a fallback if redirect fails or for manual navigation */}
         <Button asChild>
          <Link href="/login?redirect=/dashboard">Login</Link>
        </Button>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/'); // Redirect to home after logout
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-primary">Welcome, {user.name}!</h1>
            <p className="text-muted-foreground">Here's your personalized Amaxakis dashboard.</p>
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
                    {/* Firebase User object does not have a join date directly. This could be stored in Firestore. */}
                    {/* <p><strong>Joined:</strong> (Simulated) January 1, 2023</p> */} 
                    <Button variant="link" className="p-0 h-auto text-primary" disabled>View Service History (Example)</Button>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2">
                    <Button variant="outline" asChild><Link href="/">Browse Service Centers</Link></Button>
                    <Button variant="outline" disabled>My Favorite Services (Example)</Button>
                    <Button variant="outline" disabled>Support Center (Example)</Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

