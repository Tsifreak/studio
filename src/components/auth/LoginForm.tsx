"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useAuth } from "@/hooks/useAuth"; // Your custom Firebase AuthContext hook
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn as nextAuthSignIn } from "next-auth/react"; // Import NextAuth's signIn function

const formSchema = z.object({
  email: z.string().email({ message: "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email." }),
  password: z.string().min(1, { message: "Ο κωδικός πρόσβασης είναι υποχρεωτικός." }),
  rememberMe: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const { toast } = useToast();
  const { login } = useAuth(); // Your Firebase client-side login function
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || "/";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const { formState: { isSubmitting } } = form;

  async function onSubmit(values: LoginFormValues) {
    try {
      // 1. Perform Firebase client-side authentication
      // The 'login' function from useAuth should handle signInWithEmailAndPassword
      await login(values.email, values.password);

      // 2. IMPORTANT: After successful Firebase login, tell NextAuth.js to sign in.
      //    This will trigger the authorize callback in your route.ts.
      const nextAuthSignInResult = await nextAuthSignIn("credentials", {
        email: values.email,
        password: values.password, // Pass credentials to NextAuth for re-verification in authorize
        redirect: false, // Prevents NextAuth from doing its own redirect
      });

      if (nextAuthSignInResult?.error) {
        console.log("NextAuth SignIn successful! Session should now be active.");
        console.error("NextAuth SignIn error:", nextAuthSignInResult.error);
        toast({
          title: "Σφάλμα Σύνδεσης NextAuth",
          description: "Προέκυψε σφάλμα στη διαδικασία σύνδεσης. Παρακαλώ δοκιμάστε ξανά.", // Generic message or parse nextAuthSignInResult.error
          variant: "destructive",
        });
        return; // Stop execution if NextAuth sign-in failed
      }

      // If both Firebase and NextAuth.js sign-in are successful
      toast({
        title: "Επιτυχής Σύνδεση!",
        description: "Καλώς ήρθατε ξανά!",
      });

      // Redirect after successful login
      router.push(redirectPath);

      // Optional: If session data needs to be refreshed immediately after redirect
      // router.refresh();

    } catch (error: any) {
      // This catch block handles errors specifically from your `login` function (Firebase errors)
      let errorMessage = "Παρουσιάστηκε ένα μη αναμενόμενο σφάλμα. Παρακαλώ προσπαθήστε ξανά αργότερα.";
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential': // Modern Firebase often uses this for wrong password/email
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
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Ξεχάσατε τον κωδικό;
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
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Εγγραφείτε
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}