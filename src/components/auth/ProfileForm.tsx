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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import React, { useEffect, useState, useRef } from "react";
import { UploadCloud, X } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Το όνομα πρέπει να περιέχει τουλάχιστον 2 χαρακτήρες." }),
  email: z.string().email({ message: "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email." }),
  // avatarUrl is kept in schema for form reset/initial display but not as a direct input field for URL anymore
  avatarUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL για τη φωτογραφία προφίλ σας." }).optional().or(z.literal('')),
  preferences: z.object({
    darkMode: z.boolean().optional(),
    notifications: z.boolean().optional(),
  }).optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

export function ProfileForm() {
  const { user, updateUserProfile, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      avatarUrl: "", 
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
        avatarUrl: user.avatarUrl || "",
        preferences: {
          darkMode: user.preferences?.darkMode || false,
          notifications: user.preferences?.notifications === undefined ? true : user.preferences.notifications,
        },
      });
      setAvatarPreview(null); // Clear preview when user data changes/resets
      setSelectedAvatarFile(null);
    }
  }, [user, form.reset]);

  const {formState: {isSubmitting, dirtyFields}} = form;

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Σφάλμα Φόρτωσης Εικόνας",
          description: "Το μέγεθος του αρχείου δεν πρέπει να υπερβαίνει τα 5MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      form.setValue('avatarUrl', URL.createObjectURL(file), { shouldDirty: true }); // Mark form as dirty
    }
  };

  const clearAvatarSelection = () => {
    setSelectedAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Reset avatarUrl field to original user avatarUrl or empty if none
    form.setValue('avatarUrl', user?.avatarUrl || "", { shouldDirty: true });
  };

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;

    const changedValues: { name?: string; preferences?: ProfileFormValues['preferences']; avatarFile?: File | null } = {};
    
    if (dirtyFields.name) changedValues.name = values.name;
    if (dirtyFields.preferences) changedValues.preferences = values.preferences;
    if (selectedAvatarFile) changedValues.avatarFile = selectedAvatarFile;

    // Check if there are any actual changes including file selection
    const hasFormChanges = dirtyFields.name || dirtyFields.preferences;
    if (!hasFormChanges && !selectedAvatarFile) {
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
      setSelectedAvatarFile(null); // Clear selected file after successful upload
      // form.reset will be called by useEffect due to user state change
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
            <div className="flex flex-col items-center space-y-4 mb-6">
              <Avatar className="h-32 w-32 border-2 border-primary shadow-md">
                <AvatarImage 
                  src={avatarPreview || user.avatarUrl || ""} 
                  alt={user.name || "User"} 
                  data-ai-hint="avatar"
                />
                <AvatarFallback className="text-4xl">{user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                ref={fileInputRef} 
                className="hidden" 
                id="avatarUpload"
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                  <UploadCloud className="mr-2 h-4 w-4" /> Αλλαγή Φωτογραφίας
                </Button>
                {avatarPreview && (
                  <Button type="button" variant="ghost" size="icon" onClick={clearAvatarSelection} title="Αφαίρεση επιλεγμένης εικόνας" disabled={isSubmitting}>
                    <X className="h-5 w-5 text-destructive" />
                  </Button>
                )}
              </div>
              {form.formState.errors.avatarUrl && <FormMessage>{form.formState.errors.avatarUrl.message}</FormMessage>}
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

            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || (!form.formState.isDirty && !selectedAvatarFile) }>
              {isSubmitting ? "Αποθήκευση..." : "Αποθήκευση Αλλαγών"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
