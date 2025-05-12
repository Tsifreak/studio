
"use server";

import type { UserProfile } from '@/lib/types';
import { z } from 'zod';

// Simulate a database or user service
const mockUsersStorage: Record<string, UserProfile> = {}; // email: UserProfile

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6), // Basic password validation
});

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
  // preferences can be more detailed
});


export async function loginUser(data: z.infer<typeof loginSchema>): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  try {
    loginSchema.parse(data);
  } catch (error) {
    return { success: false, message: "Invalid input data." };
  }

  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

  // This is a mock implementation. In a real app, you'd check credentials against a database.
  // For this example, let's assume if a user exists in mockUsersStorage, login is successful.
  const existingUser = Object.values(mockUsersStorage).find(u => u.email === data.email);
  
  if (existingUser) {
    // Password check would happen here in a real app.
    // For mock, let's just return the user.
    return { success: true, message: "Login successful!", user: existingUser };
  }

  return { success: false, message: "Invalid email or password." };
}

export async function signupUser(data: z.infer<typeof signupSchema>): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  try {
    signupSchema.parse(data);
  } catch (error) {
    return { success: false, message: "Invalid input data." };
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));

  if (mockUsersStorage[data.email]) {
    return { success: false, message: "User with this email already exists." };
  }

  const newUser: UserProfile = {
    id: `user_${Date.now()}`,
    name: data.name,
    email: data.email,
    avatarUrl: `https://picsum.photos/seed/${data.email}/100/100`, // Placeholder avatar
    preferences: { darkMode: false, notifications: true },
  };
  mockUsersStorage[data.email] = newUser; // Store user (mock)

  return { success: true, message: "Signup successful!", user: newUser };
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  if (!z.string().email().safeParse(email).success) {
     return { success: false, message: "Invalid email format." };
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  // Simulate sending a password reset link
  console.log(`Password reset link sent to ${email} (simulated).`);
  return { success: true, message: "If an account exists for this email, a password reset link has been sent." };
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  try {
    // Validate only provided fields against a partial schema
    // This is a simplified validation, real app might need more robust partial validation
    if (data.name) z.string().min(2).parse(data.name);
    if (data.avatarUrl) z.string().url().parse(data.avatarUrl);
  } catch (error) {
    return { success: false, message: "Invalid input data for profile update." };
  }

  await new Promise(resolve => setTimeout(resolve, 500));
  
  const userToUpdate = Object.values(mockUsersStorage).find(u => u.id === userId);

  if (!userToUpdate) {
    return { success: false, message: "User not found." };
  }

  const updatedUser = { ...userToUpdate, ...data };
  mockUsersStorage[userToUpdate.email] = updatedUser; // Update user (mock)

  return { success: true, message: "Profile updated successfully!", user: updatedUser };
}
