
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
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
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth"; // Using AuthContext

const formSchema = z.object({
  email: z.string().email({ message: "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email." }),
});

type ForgotPasswordFormValues = z.infer<typeof formSchema>;

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const { sendPasswordReset } = useAuth(); // Get method from context
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const {formState: {isSubmitting}} = form;

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await sendPasswordReset(values.email);
      toast({
        title: "Email Επαναφοράς Κωδικού Εστάλη",
        description: "Εάν υπάρχει λογαριασμός για αυτό το email, έχει σταλεί ένας σύνδεσμος επαναφοράς κωδικού πρόσβασης.",
      });
      form.reset();
    } catch (error: any) {
      let errorMessage = "Δεν ήταν δυνατή η επεξεργασία του αιτήματος. Παρακαλώ προσπαθήστε ξανά.";
       if (error.code) {
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email.";
            break;
          case 'auth/user-not-found':
             // Don't reveal if user exists for security, message is fine as is.
            errorMessage = "Εάν υπάρχει λογαριασμός για αυτό το email, έχει σταλεί ένας σύνδεσμος επαναφοράς κωδικού πρόσβασης.";
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }
      toast({
        title: "Το Αίτημα Απέτυχε",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Ξεχάσατε τον Κωδικό σας;</CardTitle>
        <CardDescription>Εισαγάγετε τη διεύθυνση email σας και θα σας στείλουμε έναν σύνδεσμο για την επαναφορά του κωδικού σας.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Διεύθυνση Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Αποστολή σε εξέλιξη..." : "Αποστολή Συνδέσμου Επαναφοράς"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Θυμηθήκατε τον κωδικό σας;{" "}
          <Link href="/login" legacyBehavior>
            <a className="font-medium text-primary hover:underline">Σύνδεση</a>
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

