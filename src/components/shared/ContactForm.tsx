// src/components/shared/ContactForm.tsx
"use client"; // This ensures the component runs on the client side

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast"; // Make sure this path is correct for your toast setup
import type { QueryFormData } from "@/lib/types"; // Your custom types for form data
import { Send } from "lucide-react"; // Icon for the submit button
import { useAuth } from "@/hooks/useAuth"; // Assuming you have a custom authentication hook
import { useRouter } from 'next/navigation'; // Next.js router for navigation

// --- Interface for ContactForm's Props ---
interface ContactFormProps {
  storeId: string; // The ID of the store the form is being submitted for
  // Defines the expected signature of the onSubmitAction function.
  // It takes QueryFormData and returns a promise with success, message, and optional conversationId.
  onSubmitAction: (data: QueryFormData) => Promise<{ success: boolean; message: string; conversationId?: string }>;
}

// --- Zod Schema for Form Validation ---
// This schema defines the structure and validation rules for your form fields.
const formSchema = z.object({
  name: z.string().min(2, { message: "Το όνομα πρέπει να είναι τουλάχιστον 2 χαρακτήρες." }),
  email: z.string().email({ message: "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email." }),
  subject: z.string().min(5, { message: "Το θέμα πρέπει να είναι τουλάχιστον 5 χαρακτήρες." }),
  message: z.string().min(10, { message: "Το μήνυμα πρέπει να είναι τουλάχιστον 10 χαρακτήρες." }).max(500, { message: "Το μήνυμα δεν μπορεί να υπερβαίνει τους 500 χαρακτήρες." }),
});

// Infer the TypeScript type from the Zod schema for type safety
type ContactFormValues = z.infer<typeof formSchema>;

// --- ContactForm Component ---
export function ContactForm({ storeId, onSubmitAction }: ContactFormProps) {
  const { toast } = useToast(); // Hook to display toast notifications
  const { user } = useAuth(); // Hook to get current user's authentication status and details
  const router = useRouter(); // Initialize the Next.js router

  // Initialize the form with zodResolver for validation
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "", // Pre-fill name if user is logged in
      email: user?.email || "", // Pre-fill email if user is logged in
      subject: "",
      message: "",
    },
  });

  // Extract isSubmitting from formState to manage button loading state
  const {formState: {isSubmitting}} = form;

  // --- Form Submission Handler ---
  async function onSubmit(values: ContactFormValues) {
    try {
      // Construct the queryData object, ensuring all required fields are explicitly set.
      // This resolves the TypeScript error related to optional properties.
      const queryData: QueryFormData = {
        name: values.name,
        email: values.email,
        subject: values.subject,
        message: values.message,
        storeId: storeId, // Pass the storeId from props

        // Conditionally add user details only if the user is logged in
        ...(user && {
          userId: user.id,
          userName: user.name,
          userAvatarUrl: user.avatarUrl
        })
      };

      // Call the passed onSubmitAction (e.g., your submitStoreQuery function)
      const result = await onSubmitAction(queryData);

      if (result.success) {
        // Show success toast
        toast({
          title: "Το μήνυμα εστάλη!",
          description: result.message || "Το μήνυμά σας εστάλη επιτυχώς.",
        });
        // Reset the form, optionally pre-filling user data if logged in
        form.reset( user ? {name: user.name || "", email: user.email || "", subject: "", message: ""} : { name: "", email: "", subject: "", message: ""});

        // --- Redirection Logic ---
        // Option 1 (Default): Redirect to a generic chat page
        router.push('/dashboard/chats');

        // Option 2: Redirect to a chat page specifically for this store
        // If your chat route can handle a storeId (e.g., /chat?storeId=abc)
        // Uncomment the line below if you want this behavior:
        // router.push(`/chat?storeId=${storeId}`);

        // Option 3: Redirect to a specific conversation if your action returns a conversationId
        // Uncomment the lines below if your `onSubmitAction` provides `result.conversationId`:
        // if (result.conversationId) {
        //   router.push(`/chat/${result.conversationId}`);
        // } else {
        //   router.push('/chat'); // Fallback if no specific conversation ID
        // }
        // --- End Redirection Logic ---

      } else {
        // Show error toast if submission was not successful
        toast({
          title: "Σφάλμα αποστολής μηνύματος",
          description: result.message || "Παρουσιάστηκε πρόβλημα κατά την αποστολή του μηνύματός σας. Παρακαλώ προσπαθήστε ξανά.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Catch any unexpected errors during the submission process
      console.error("Contact form submission error:", error);
      toast({
        title: "Σφάλμα Υποβολής",
        description: "Παρουσιάστηκε ένα μη αναμενόμενο σφάλμα. Παρακαλώ προσπαθήστε ξανά αργότερα.",
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6 border rounded-lg bg-card shadow-lg">
        {/* Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ονοματεπώνυμο</FormLabel>
              <FormControl>
                <Input placeholder="Γιάννης Παπαδόπουλος" {...field} />
              </FormControl>
              <FormMessage /> {/* Displays validation errors for this field */}
            </FormItem>
          )}
        />
        {/* Email Field */}
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
        {/* Subject Field */}
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Θέμα</FormLabel>
              <FormControl>
                <Input placeholder="Σχετικά με την υπηρεσία σας..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Message Textarea */}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Μήνυμα</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Το αναλυτικό σας ερώτημα ή αίτημα..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Αποστολή..." : ( // Show loading text and icon when submitting
            <>
              <Send className="mr-2 h-4 w-4" /> Αποστολή Μηνύματος
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}