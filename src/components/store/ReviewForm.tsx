
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useActionState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { ReviewFormData } from "@/lib/types";
import { Star, Send } from "lucide-react";

interface ReviewFormProps {
  storeId: string;
  // The action prop will be bound with storeId and user details in the parent
  action: (prevState: any, formData: FormData) => Promise<{ success: boolean; message: string; errors?: any }>;
}

const reviewFormSchema = z.object({
  rating: z.coerce.number().min(1, { message: "Η βαθμολογία είναι υποχρεωτική." }).max(5),
  comment: z.string().min(10, { message: "Το σχόλιο πρέπει να είναι τουλάχιστον 10 χαρακτήρες." }).max(1000, { message: "Το σχόλιο δεν μπορεί να υπερβαίνει τους 1000 χαρακτήρες."}),
});

type ClientReviewFormValues = z.infer<typeof reviewFormSchema>;

const initialFormState: { success: boolean; message: string; errors?: any } = {
  success: false,
  message: "",
  errors: null,
};

export function ReviewForm({ storeId, action }: ReviewFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formState, formAction, isPending] = useActionState(action, initialFormState);

  const form = useForm<ClientReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0, // Default to 0, user must select
      comment: "",
    },
  });

  useEffect(() => {
    if (formState.message) {
      if (formState.success) {
        toast({
          title: "Επιτυχία",
          description: formState.message,
        });
        form.reset({ rating: 0, comment: "" }); // Reset form on success
      } else {
        toast({
          title: "Σφάλμα",
          description: formState.message || "Παρουσιάστηκε ένα σφάλμα.",
          variant: "destructive",
        });
        if (formState.errors) {
          Object.keys(formState.errors).forEach((key) => {
            const fieldKey = key as keyof ClientReviewFormValues;
            const message = formState.errors[fieldKey]?.[0];
            if (message) {
              form.setError(fieldKey, { type: 'server', message });
            }
          });
        }
      }
    }
  }, [formState, toast, form]);

  if (!user) {
    return (
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle>Υποβολή Κριτικής</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Πρέπει να είστε <a href="/login" className="text-primary hover:underline">συνδεδεμένος</a> για να υποβάλετε μια κριτική.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle>Γράψτε την Κριτική σας</CardTitle>
        <CardDescription>Μοιραστείτε την εμπειρία σας με αυτό το κέντρο.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={formAction} className="space-y-6">
            {/* Hidden fields for server action */}
            <input type="hidden" name="storeId" value={storeId} />
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="userName" value={user.name} />
            {user.avatarUrl && <input type="hidden" name="userAvatarUrl" value={user.avatarUrl} />}

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Βαθμολογία</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value > 0 ? String(field.value) : undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε βαθμολογία (1-5)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(num => (
                        <SelectItem key={num} value={String(num)}>
                          <div className="flex items-center">
                            {Array(num).fill(0).map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />)}
                            {Array(5-num).fill(0).map((_, i) => <Star key={i+num} className="w-4 h-4 text-muted-foreground mr-1" />)}
                            <span className="ml-2">({num})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Σχόλιο</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Περιγράψτε την εμπειρία σας..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Υποβολή..." : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Υποβολή Κριτικής
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
