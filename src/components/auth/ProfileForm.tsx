
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
// Avatar imports are removed as it's no longer part of this form
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import React, { useEffect, useState, useRef } from "react";
// UploadCloud, X, Camera icons are removed as avatar editing is moved
import { Save } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Το όνομα πρέπει να περιέχει τουλάχιστον 2 χαρακτήρες." }),
  email: z.string().email({ message: "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email." }),
  // avatarUrl is removed as it's handled by the main dashboard avatar now
  preferences: z.object({
    darkMode: z.boolean().optional(),
    notifications: z.boolean().optional(),
  }).optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

export function ProfileForm() {
  const { user, updateUserProfile, isLoading } = useAuth();
  const { toast } = useToast();
  // selectedAvatarFile, avatarPreview, fileInputRef are removed

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      // avatarUrl default removed
      preferences: {
        darkMode: false,
        notifications: true,
      },
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        // avatarUrl reset removed
        preferences: {
          darkMode: user.preferences?.darkMode || false,
          notifications: user.preferences?.notifications === undefined ? true : user.preferences.notifications,
        },
      });
    }
  }, [user, form.reset]);

  const {formState: {isSubmitting, dirtyFields}} = form;

  // handleAvatarChange and clearAvatarSelection are removed

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;

    const changedValues: { name?: string; preferences?: ProfileFormValues['preferences']; avatarFile?: File | null } = {};
    
    if (dirtyFields.name) changedValues.name = values.name;
    if (dirtyFields.preferences) changedValues.preferences = values.preferences;
    // Avatar file handling removed from here

    const hasFormChanges = dirtyFields.name || dirtyFields.preferences;
    if (!hasFormChanges) { // Check only for form field changes
        toast({
          title: "Καμία Αλλαγή",
          description: "Δεν έχετε κάνει αλλαγές στα στοιχεία του προφίλ σας.",
        });
        return;
    }

    try {
      await updateUserProfile(changedValues); // Only pass name/preferences
      toast({
        title: "Το προφίλ ενημερώθηκε",
        description: "Οι πληροφορίες του προφίλ σας ενημερώθηκαν επιτυχώς.",
      });
      // setSelectedAvatarFile(null) removed;
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
    <Card className="w-full max-w-2xl shadow-lg"> {/* Adjusted max-width if needed */}
      <CardHeader>
        <CardTitle className="text-2xl">Επεξεργασία Προφίλ</CardTitle>
        <CardDescription>Ενημερώστε τα στοιχεία και τις προτιμήσεις του λογαριασμού σας.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          {/* Form layout changed: removed outer grid, fields stack vertically */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Section removed */}
            
            {/* Form Fields Section */}
            <div className="space-y-6"> {/* Fields stack vertically */}
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

              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !form.formState.isDirty }>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Αποθήκευση..." : "Αποθήκευση Αλλαγών"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
