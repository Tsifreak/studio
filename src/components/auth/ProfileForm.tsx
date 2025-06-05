
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import React, { useEffect } from "react";
import { Save } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Το όνομα πρέπει να περιέχει τουλάχιστον 2 χαρακτήρες." }),
  email: z.string().email({ message: "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email." }),
  preferences: z.object({
    darkMode: z.boolean().optional(),
    notifications: z.boolean().optional(),
  }).optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

export function ProfileForm() {
  const { user, updateUserProfile, isLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
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

    const changedValues: { name?: string; preferences?: ProfileFormValues['preferences']; avatarFile?: File | null } = {};
    
    if (dirtyFields.name) changedValues.name = values.name;
    if (dirtyFields.preferences) changedValues.preferences = values.preferences;

    const hasFormChanges = dirtyFields.name || dirtyFields.preferences;
    if (!hasFormChanges) { 
        toast({
          title: "Καμία Αλλαγή",
          description: "Δεν έχετε κάνει αλλαγές στα στοιχεία του προφίλ σας.",
        });
        return;
    }

    try {
      await updateUserProfile(changedValues);
      toast({
        title: "Το προφίλ ενημερώθηκε",
        description: "Οι πληροφορίες του προφίλ σας ενημερώθηκαν επιτυχώς.",
      });
    } catch (error: any) {
      toast({
        title: "Η ενημέρωση απέτυχε",
        description: error.message || "Δεν ήταν δυνατή η ενημέρωση του προφίλ. Παρακαλώ προσπαθήστε ξανά.",
        variant: "destructive",
      });
    }
  }

  if (isLoading) return (
    <Card className="w-full max-w-4xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Επεξεργασία Προφίλ</CardTitle>
        <CardDescription>Ενημερώστε τα στοιχεία και τις προτιμήσεις του λογαριασμού σας.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Φόρτωση προφίλ...</p>
      </CardContent>
    </Card>
  );

  if (!user) return (
     <Card className="w-full max-w-4xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Προφίλ Μη Διαθέσιμο</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Παρακαλούμε συνδεθείτε για να δείτε το προφίλ σας.</p>
      </CardContent>
    </Card>
  );

  return (
    <Card className="w-full max-w-4xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Επεξεργασία Προφίλ</CardTitle>
        <CardDescription>Ενημερώστε τα στοιχεία και τις προτιμήσεις του λογαριασμού σας.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid md:grid-cols-2 md:gap-x-8 space-y-6 md:space-y-0"
          >
            {/* Column 1: Name and Email */}
            <div className="space-y-6">
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
            </div>

            {/* Column 2: Preferences and Save Button */}
            <div className="space-y-6 flex flex-col">
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
              <div className="mt-auto md:pt-6 flex justify-end"> {/* Ensures button is at the bottom of this column */}
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !form.formState.isDirty}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Αποθήκευση..." : "Αποθήκευση Αλλαγών"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
