
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
import { UploadCloud, X, Camera } from "lucide-react";

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
      setAvatarPreview(null);
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
      form.setValue('avatarUrl', URL.createObjectURL(file), { shouldDirty: true });
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
    form.setValue('avatarUrl', user?.avatarUrl || "", { shouldDirty: true });
  };

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;

    const changedValues: { name?: string; preferences?: ProfileFormValues['preferences']; avatarFile?: File | null } = {};
    
    if (dirtyFields.name) changedValues.name = values.name;
    if (dirtyFields.preferences) changedValues.preferences = values.preferences;
    if (selectedAvatarFile) changedValues.avatarFile = selectedAvatarFile;

    const hasFormChanges = dirtyFields.name || dirtyFields.preferences;
    if (!hasFormChanges && !selectedAvatarFile) {
        toast({
          title: "Καμία Αλλαγή",
          description: "Δεν έχετε κάνει αλλαγές στο προφίλ σας.",
        });
        return;
    }

    try {
      await updateUserProfile(changedValues);
      toast({
        title: "Το προφίλ ενημερώθηκε",
        description: "Οι πληροφορίες του προφίλ σας ενημερώθηκαν επιτυχώς.",
      });
      setSelectedAvatarFile(null);
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
    <Card className="w-full max-w-4xl shadow-lg"> {/* Increased max-w for horizontal layout */}
      <CardHeader>
        <CardTitle className="text-2xl">Το Προφίλ σας</CardTitle>
        <CardDescription>Διαχειριστείτε τις ρυθμίσεις και τις προτιμήσεις του λογαριασμού σας.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            
            {/* Avatar Section - Column 1 on md and up */}
            <div className="md:col-span-1 flex flex-col items-center space-y-4 pt-2">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-2 border-primary shadow-md">
                  <AvatarImage 
                    src={avatarPreview || user.avatarUrl || ""} 
                    alt={user.name || "User"} 
                    data-ai-hint="avatar"
                  />
                  <AvatarFallback className="text-4xl">{user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-0 flex items-center justify-center w-full h-full bg-black/30 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  aria-label="Change profile picture"
                >
                  <Camera className="h-8 w-8" />
                </Button>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                ref={fileInputRef} 
                className="hidden" 
                id="avatarUpload"
              />
              {avatarPreview && (
                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Επιλεγμένη εικόνα.</p>
                    <Button type="button" variant="link" size="sm" className="text-destructive hover:text-destructive/80" onClick={clearAvatarSelection} title="Αφαίρεση επιλεγμένης εικόνας" disabled={isSubmitting}>
                        <X className="mr-1 h-4 w-4" /> Κατάργηση
                    </Button>
                </div>
              )}
              {form.formState.errors.avatarUrl && <FormMessage>{form.formState.errors.avatarUrl.message}</FormMessage>}
            </div>

            {/* Form Fields Section - Column 2 & 3 on md and up */}
            <div className="md:col-span-2 space-y-8">
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
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

