
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { QueryFormData } from "@/lib/types";
import { Send } from "lucide-react"; 
import { useAuth } from "@/hooks/useAuth"; 

interface ContactFormProps {
  storeId: string;
  onSubmitAction: (data: QueryFormData) => Promise<{ success: boolean; message: string }>;
}

const formSchema = z.object({
  name: z.string().min(2, { message: "Το όνομα πρέπει να είναι τουλάχιστον 2 χαρακτήρες." }),
  email: z.string().email({ message: "Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email." }),
  subject: z.string().min(5, { message: "Το θέμα πρέπει να είναι τουλάχιστον 5 χαρακτήρες." }),
  message: z.string().min(10, { message: "Το μήνυμα πρέπει να είναι τουλάχιστον 10 χαρακτήρες." }).max(500, { message: "Το μήνυμα δεν μπορεί να υπερβαίνει τους 500 χαρακτήρες." }),
});

type ContactFormValues = z.infer<typeof formSchema>;

export function ContactForm({ storeId, onSubmitAction }: ContactFormProps) {
  const { toast } = useToast();
  const { user } = useAuth(); 

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "", 
      email: user?.email || "", 
      subject: "",
      message: "",
    },
  });

  const {formState: {isSubmitting}} = form;

  async function onSubmit(values: ContactFormValues) {
    try {
      const queryData: QueryFormData = { 
        ...values, 
        storeId,
        ...(user && { 
            userId: user.id,
            userName: user.name, // Pass userName
            userAvatarUrl: user.avatarUrl // Pass userAvatarUrl
        }) 
      };
      
      const result = await onSubmitAction(queryData);

      if (result.success) {
        toast({
          title: "Το μήνυμα εστάλη!",
          description: result.message || "Το μήνυμά σας εστάλη επιτυχώς.",
        });
        form.reset( user ? {name: user.name || "", email: user.email || "", subject: "", message: ""} : { name: "", email: "", subject: "", message: ""});
      } else {
        toast({
          title: "Σφάλμα αποστολής μηνύματος",
          description: result.message || "Παρουσιάστηκε πρόβλημα κατά την αποστολή του μηνύματός σας. Παρακαλώ προσπαθήστε ξανά.",
          variant: "destructive",
        });
      }
    } catch (error) {
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ονοματεπώνυμο</FormLabel>
              <FormControl>
                <Input placeholder="Γιάννης Παπαδόπουλος" {...field} />
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Αποστολή..." : (
            <>
              <Send className="mr-2 h-4 w-4" /> Αποστολή Μηνύματος
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
