
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
  name: z.string().min(2, { message: "Το όνομα πρέπει να περιέχει τουλάχιστον 2 χαρακτήρες." }),
  email: z.string().email({ message: "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email." }),
  avatarUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για τη φωτογραφία προφίλ σας." }).optional().or(z.literal('')),
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
    defaultValues: {
      name: "",
      email: "",
      avatarUrl: "", // Initialize with an empty string
      preferences: {
        darkMode: false,
        notifications: true, // Default to true as in AuthContext
      },
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        avatarUrl: user.avatarUrl || "",
        preferences: {
          darkMode: user.preferences?.darkMode || false,
          notifications: user.preferences?.notifications === undefined ? true : user.preferences.notifications,
        },
      });
    }
  }, [user, form.reset]);


  const {formState: {isSubmitting, dirtyFields}} = form;

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;

    // Only include fields that have actually changed to send for update
    const changedValues: { name?: string; avatarUrl?: string; preferences?: ProfileFormValues['preferences'] } = {};
    if (dirtyFields.name) changedValues.name = values.name;
    if (dirtyFields.avatarUrl || (dirtyFields.avatarUrl === undefined && values.avatarUrl === "")) { // handle case where avatarUrl becomes empty string
      changedValues.avatarUrl = values.avatarUrl;
    }
    if (dirtyFields.preferences) changedValues.preferences = values.preferences;


    if (Object.keys(changedValues).length === 0) {
        toast({
          title: "Καμία Αλλαγή",
          description: "Δεν έχετε κάνει αλλαγές στο προφίλ σας.",
        });
        return;
    }

    try {
      await contextUpdateUserProfile(changedValues);
      toast({
        title: "Το προφίλ ενημερώθηκε",
        description: "Οι πληροφορίες του προφίλ σας ενημερώθηκαν επιτυχώς.",
      });
      form.reset(values); // Reset form with new values to clear dirty state
    } catch (error: any) {
      toast({
        title: "Η ενημέρωση απέτυχε",
        description: error.message || "Δεν ήταν δυνατή η ενημέρωση του προφίλ. Παρακαλώ προσπαθήστε ξανά.",
        variant: "destructive",
      });
    }
  }

  if (isLoading) return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Το Προφίλ σας</CardTitle>
        <CardDescription>Διαχειριστείτε τις ρυθμίσεις και τις προτιμήσεις του λογαριασμού σας.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Φόρτωση προφίλ...</p>
      </CardContent>
    </Card>
  );

  if (!user) return (
     <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Προφίλ Μη Διαθέσιμο</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Παρακαλούμε συνδεθείτε για να δείτε το προφίλ σας.</p>
      </CardContent>
    </Card>
  );


  return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Το Προφίλ σας</CardTitle>
        <CardDescription>Διαχειριστείτε τις ρυθμίσεις και τις προτιμήσεις του λογαριασμού σας.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={form.watch("avatarUrl") || ""} alt={user.name || "User"} data-ai-hint="avatar"/>
                <AvatarFallback>{user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>URL Φωτογραφίας Προφίλ</FormLabel>
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
                  <FormLabel>Πλήρες Όνομα</FormLabel>
                  <FormControl>
                    <Input placeholder="Το πλήρες όνομά σας" {...field} />
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
                  <FormLabel>Διεύθυνση Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" {...field} disabled />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground pt-1">Το Email δεν μπορεί να αλλάξει.</p>
                </FormItem>
              )}
            />
            
            <div className="space-y-4 rounded-md border p-4">
              <h3 className="text-lg font-medium">Προτιμήσεις</h3>
               <FormField
                control={form.control}
                name="preferences.darkMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Σκοτεινή Λειτουργία</FormLabel>
                      <p className="text-xs text-muted-foreground">Ενεργοποίηση σκοτεινού θέματος για την εφαρμογή.</p>
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
                      <FormLabel>Ειδοποιήσεις μέσω Email</FormLabel>
                      <p className="text-xs text-muted-foreground">Λήψη ενημερώσεων και ενημερωτικών δελτίων μέσω email.</p>
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
              {isSubmitting ? "Αποθήκευση..." : "Αποθήκευση Αλλαγών"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

