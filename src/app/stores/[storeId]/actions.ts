
"use server";

import type { QueryFormData } from '@/lib/types';

// Placeholder for actual rate limiting logic
const submissionAttempts = new Map<string, { count: number, lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const COOLDOWN_PERIOD = 60 * 1000; // 1 minute

export async function submitStoreQuery(formData: QueryFormData): Promise<{ success: boolean; message: string }> {
  console.log("Received query for store:", formData.storeId, formData);

  // Basic rate limiting (example - in-memory, would need a persistent store in production)
  const userIdentifier = formData.email; // Or IP address if available
  const now = Date.now();
  const attemptRecord = submissionAttempts.get(userIdentifier);

  if (attemptRecord && now - attemptRecord.lastAttempt < COOLDOWN_PERIOD && attemptRecord.count >= MAX_ATTEMPTS) {
    console.warn(`Rate limit exceeded for ${userIdentifier}`);
    return { success: false, message: "You've submitted too many requests. Please try again later." };
  }

  if (attemptRecord && now - attemptRecord.lastAttempt < COOLDOWN_PERIOD) {
    submissionAttempts.set(userIdentifier, { count: attemptRecord.count + 1, lastAttempt: now });
  } else {
    submissionAttempts.set(userIdentifier, { count: 1, lastAttempt: now });
  }
  
  // Simulate sending the query to the store's webhook/API
  // In a real application, you would make an HTTP request here.
  // e.g., await fetch(`https://store-api.example.com/${formData.storeId}/contact`, { method: 'POST', body: JSON.stringify(formData) });
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  // For now, we'll just log it and return success
  console.log(`Query for store ${formData.storeId} by ${formData.email} with subject "${formData.subject}" has been "sent".`);
  
  // Clear attempts after a while to free memory, or use a proper cache with TTL
  setTimeout(() => {
    submissionAttempts.delete(userIdentifier);
  }, COOLDOWN_PERIOD * 5);

  return { success: true, message: "Your query has been successfully submitted to the store." };
}
