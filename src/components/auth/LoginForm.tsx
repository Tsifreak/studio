
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation"; // Added useSearchParams
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { loginUser } from "@/app/auth/actions"; // Server action no longer used for login

const formSchema = z.object({
  email: z.string().email({ message: "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email." }),
  password: z.string().min(1, { message: "Ο κωδικός πρόσβασης είναι υποχρεωτικός." }), 
  rememberMe: z.boolean().default(false).optional(), // Firebase handles persistence, this is more for UI
});

type LoginFormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const { toast } = useToast();
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || "/dashboard";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const {formState: {isSubmitting}} = form;

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values.email, values.password);
      toast({
        title: "Επιτυχής Σύνδεση!",
        description: "Καλώς ήρθατε ξανά!",
      });
      router.push(redirectPath);
    } catch (error: any) {
      let errorMessage = "Παρουσιάστηκε ένα μη αναμενόμενο σφάλμα. Παρακαλώ προσπαθήστε ξανά αργότερα.";
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Μη έγκυρο email ή κωδικός πρόσβασης.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email.";
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }
      toast({
        title: "Η Σύνδεση Απέτυχε",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Καλώς Ορίσατε Ξανά!</CardTitle>
        <CardDescription>Συνδεθείτε για πρόσβαση στον λογαριασμό σας Amaxakis.</CardDescription>
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
            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Να με θυμάσαι
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <Link href="/forgot-password" legacyBehavior>
                <a className="text-sm text-primary hover:underline">
                  Ξεχάσατε τον κωδικό;
                </a>
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Σύνδεση σε εξέλιξη..." : "Σύνδεση"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Δεν έχετε λογαριασμό;{" "}
          <Link href="/signup" legacyBehavior>
            <a className="font-medium text-primary hover:underline">Εγγραφείτε</a>
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
