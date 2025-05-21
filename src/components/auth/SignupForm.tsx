
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { signupUser } from "@/app/auth/actions"; // Server action no longer used for signup

const formSchema = z.object({
  name: z.string().min(2, { message: "Το όνομα πρέπει να περιέχει τουλάχιστον 2 χαρακτήρες." }),
  email: z.string().email({ message: "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email." }),
  password: z.string().min(6, { message: "Ο κωδικός πρόσβασης πρέπει να περιέχει τουλάχιστον 6 χαρακτήρες." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Οι κωδικοί πρόσβασης δεν ταιριάζουν",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof formSchema>;

export function SignupForm() {
  const { toast } = useToast();
  const { signup } = useAuth();
  const router = useRouter();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const {formState: {isSubmitting}} = form;

  async function onSubmit(values: SignupFormValues) {
    try {
      await signup(values.name, values.email, values.password);
      toast({
        title: "Επιτυχής Εγγραφή!",
        description: "Καλώς ήρθατε στην Amaxakis! Είστε πλέον συνδεδεμένοι.",
      });
      router.push("/dashboard"); 
    } catch (error: any) {
      let errorMessage = "Δεν ήταν δυνατή η δημιουργία λογαριασμού. Παρακαλώ προσπαθήστε ξανά.";
       if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "Αυτή η διεύθυνση email χρησιμοποιείται ήδη.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email.";
            break;
          case 'auth/weak-password':
            errorMessage = "Ο κωδικός πρόσβασης είναι πολύ αδύναμος. Παρακαλώ επιλέξτε έναν ισχυρότερο κωδικό.";
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }
      toast({
        title: "Η Εγγραφή Απέτυχε",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Δημιουργία Λογαριασμού</CardTitle>
        <CardDescription>Εγγραφείτε στην Amaxakis σήμερα για να ανακαλύψετε καταπληκτικά καταστήματα.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Πλήρες Όνομα</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Κωδικός Πρόσβασης</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Επιβεβαίωση Κωδικού Πρόσβασης</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Δημιουργία λογαριασμού σε εξέλιξη..." : "Εγγραφή"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Έχετε ήδη λογαριασμό;{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Σύνδεση
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
