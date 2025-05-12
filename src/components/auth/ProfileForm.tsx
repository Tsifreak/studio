
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
// import type { UserProfile } from "@/lib/types"; // Not strictly needed here now
// import { updateUserProfile as serverUpdateUserProfile } from "@/app/auth/actions"; // Server action no longer used
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  avatarUrl: z.string().url({ message: "Please enter a valid URL for your avatar." }).optional().or(z.literal('')),
  preferences: z.object({
    darkMode: z.boolean().optional(),
    notifications: z.boolean().optional(),
  }).optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

export function ProfileForm() {
  const { user, updateUserProfile: contextUpdateUserProfile, isLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    // Default values will be set by useEffect or reset below
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        avatarUrl: user.avatarUrl || "",
        preferences: {
          darkMode: user.preferences?.darkMode || false,
          notifications: user.preferences?.notifications || true,
        },
      });
    }
  }, [user, form]);


  const {formState: {isSubmitting, dirtyFields}} = form;

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;

    // Only include fields that have actually changed to send for update
    const changedValues: { name?: string; avatarUrl?: string; preferences?: ProfileFormValues['preferences'] } = {};
    if (dirtyFields.name) changedValues.name = values.name;
    if (dirtyFields.avatarUrl) changedValues.avatarUrl = values.avatarUrl;
    if (dirtyFields.preferences) changedValues.preferences = values.preferences;


    if (Object.keys(changedValues).length === 0) {
        toast({
          title: "No Changes",
          description: "You haven't made any changes to your profile.",
        });
        return;
    }

    try {
      await contextUpdateUserProfile(changedValues);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
      form.reset(values); // Reset form with new values to clear dirty state
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Could not update profile. Please try again.",
        variant: "destructive",
      });
    }
  }

  if (isLoading) return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Your Profile</CardTitle>
        <CardDescription>Manage your account settings and preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Loading profile...</p>
      </CardContent>
    </Card>
  );

  if (!user) return (
     <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Profile Not Available</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Please log in to view your profile.</p>
      </CardContent>
    </Card>
  );


  return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Your Profile</CardTitle>
        <CardDescription>Manage your account settings and preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={form.watch("avatarUrl") || user.avatarUrl || ""} alt={user.name || "User"} data-ai-hint="avatar"/>
                <AvatarFallback>{user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>Avatar URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/avatar.png" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" {...field} disabled />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground pt-1">Email cannot be changed.</p>
                </FormItem>
              )}
            />
            
            <div className="space-y-4 rounded-md border p-4">
              <h3 className="text-lg font-medium">Preferences</h3>
               <FormField
                control={form.control}
                name="preferences.darkMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Dark Mode</FormLabel>
                      <p className="text-xs text-muted-foreground">Enable dark theme for the application.</p>
                    </div>
                    <FormControl>
                       <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="preferences.notifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Email Notifications</FormLabel>
                      <p className="text-xs text-muted-foreground">Receive updates and newsletters via email.</p>
                    </div>
                    <FormControl>
                       <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !form.formState.isDirty}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
