// src/components/dashboard/DynamicFormRequestMessage.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, ControllerRenderProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DynamicFormField, FormRequestMessageContent, FormResponseMessageContent } from '@/lib/types';
import { cn } from '@/lib/utils';

// Props for this component
interface DynamicFormRequestMessageProps {
  formRequestContent: FormRequestMessageContent;
  chatId: string;
  senderId: string; // The ID of the owner who sent the form request
  onSendFormResponse: (
    chatId: string,
    senderId: string,
    senderName: string, // User's name
    formResponseContent: FormResponseMessageContent
  ) => Promise<void>;
  // The current user ID is needed to determine if *this* user needs to fill the form
  currentUserId: string;
  currentUserDisplayName: string; // The display name of the current user (filler)
  isFormAlreadyFilled: boolean; // Prop to indicate if this form instance has already been filled
}

export function DynamicFormRequestMessage({
  formRequestContent,
  chatId,
  senderId, // Owner's ID
  onSendFormResponse,
  currentUserId,
  currentUserDisplayName,
  isFormAlreadyFilled,
}: DynamicFormRequestMessageProps) {
  const { toast } = useToast();
  const [formSubmittedSuccessfully, setFormSubmittedSuccessfully] = useState(isFormAlreadyFilled);

  // Dynamically create Zod schema based on formFields
  const dynamicSchema = z.object(
    formRequestContent.formFields.reduce((acc, field) => {
      let schema: z.ZodTypeAny;

      if (field.type === 'number') {
        schema = z.union([z.number({ invalid_type_error: `Παρακαλώ εισάγετε έναν αριθμό για το ${field.label}` }), z.literal('')])
                  .transform(e => (e === "" ? undefined : e));
      } else {
        schema = z.string();
      }

      if (field.required) {
        if (field.type === 'number') {
            schema = (schema as z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodLiteral<"">]>, number | undefined, number | "">)
                       .refine(val => val !== undefined, { message: `Το πεδίο "${field.label}" είναι υποχρεωτικό.` });
        } else { // text, textarea, date types
            schema = (schema as z.ZodString).min(1, { message: `Το πεδίο "${field.label}" είναι υποχρεωτικό.` });
        }
      } else {
        schema = schema.optional();
      }

      return { ...acc, [field.id]: schema };
    }, {} as Record<string, z.ZodTypeAny>)
  );

  type DynamicFormValues = z.infer<typeof dynamicSchema>;

  const form = useForm<DynamicFormValues>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: formRequestContent.formFields.reduce((acc: Record<string, any>, field) => {
      acc[field.id] = field.type === 'number' ? '' : '';
      return acc;
    }, {} as DynamicFormValues),
    mode: "onChange",
  });

  const { formState: { isSubmitting, isValid } } = form;

  // Determine if the current user is the intended recipient of this form
  const isRecipient = currentUserId !== senderId;

  // Handle form submission
  const onSubmit = async (values: DynamicFormValues) => {
    if (!isRecipient || formSubmittedSuccessfully) return;

    const filledData = Object.entries(values).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as { [key: string]: string | number | undefined });

    const formResponseContent: FormResponseMessageContent = {
      formId: formRequestContent.formId,
      instanceId: formRequestContent.instanceId,
      formName: formRequestContent.formName,
      filledData: filledData,
    };

    try {
      await onSendFormResponse(
        chatId,
        currentUserId,
        currentUserDisplayName,
        formResponseContent
      );
      setFormSubmittedSuccessfully(true);
      toast({
        title: "Φόρμα Συμπληρώθηκε",
        description: "Οι απαντήσεις σας στάλθηκαν επιτυχώς.",
        duration: 3000,
      });

    } catch (error) {
      console.error("Failed to send form response:", error);
      toast({
        title: "Σφάλμα Συμπλήρωσης Φόρμας",
        description: "Παρουσιάστηκε σφάλμα κατά την αποστολή των απαντήσεών σας. Παρακαλώ προσπαθήστε ξανά.",
        variant: "destructive",
      });
    }
  };

  const formIsDisabled = !isRecipient || formSubmittedSuccessfully || isSubmitting;

  return (
    <Card className="max-w-md mx-auto my-4 bg-blue-50 border-blue-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-blue-800">{formRequestContent.formName}</CardTitle>
        {formRequestContent.formDescription && (
          <CardDescription className="text-sm text-blue-600">
            {formRequestContent.formDescription}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {formSubmittedSuccessfully && (
          <div className="flex items-center text-green-600 mb-4 font-semibold">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Η φόρμα συμπληρώθηκε!
          </div>
        )}
        {!isRecipient && ( // Message for the sender (owner)
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-3 mb-4 text-sm italic">
            Αυτή η φόρμα στάλθηκε στον χρήστη. Περιμένετε την απάντησή του.
          </div>
        )}
        {isRecipient && formSubmittedSuccessfully && ( // Message for recipient after they submit
             <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 mb-4 text-sm italic">
             Έχετε ήδη συμπληρώσει αυτή τη φόρμα.
           </div>
        )}
        {isRecipient && !formSubmittedSuccessfully && ( // Message for recipient if not yet submitted
             <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-4 text-sm italic">
             Παρακαλώ συμπληρώστε τα στοιχεία παρακάτω.
           </div>
        )}


        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formRequestContent.formFields.map((field) => (
              <FormField
                key={field.id}
                control={form.control}
                name={field.id as keyof DynamicFormValues} // Cast name to keyof DynamicFormValues
                render={({ field: formField }) => {
                  return (
                    <FormItem>
                      <FormLabel>
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </FormLabel>
                      <FormControl>
                        {(() => { // Use an IIFE for the switch to ensure a single element is returned directly
                          switch (field.type) {
                            case 'text':
                              return (
                                <Input
                                  type="text"
                                  placeholder={field.placeholder || ''}
                                  disabled={formIsDisabled}
                                  {...formField}
                                  className={cn({ "bg-gray-100": formIsDisabled })}
                                />
                              );
                            case 'number':
                              return (
                                <Input
                                  type="number"
                                  placeholder={field.placeholder || ''}
                                  disabled={formIsDisabled}
                                  {...formField}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    formField.onChange(value === '' ? '' : Number(value));
                                  }}
                                  value={formField.value === undefined ? '' : formField.value}
                                  className={cn({ "bg-gray-100": formIsDisabled })}
                                />
                              );
                            case 'textarea':
                              return (
                                <Textarea
                                  placeholder={field.placeholder || ''}
                                  disabled={formIsDisabled}
                                  {...formField}
                                  className={cn("min-h-[80px]", { "bg-gray-100": formIsDisabled })}
                                />
                              );
                            case 'date':
                              return (
                                <Input
                                  type="date"
                                  disabled={formIsDisabled}
                                  {...formField}
                                  className={cn({ "bg-gray-100": formIsDisabled })}
                                />
                              );
                            default:
                              return <Input disabled={formIsDisabled} {...formField} />;
                          }
                        })()}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            ))}
            {isRecipient && !formSubmittedSuccessfully && (
              <Button type="submit" className="w-full mt-4" disabled={isSubmitting || !isValid}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Αποστολή...
                  </>
                ) : (
                  "Υποβολή Φόρμας"
                )}
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}