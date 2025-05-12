
"use client";

import type { UserProfile } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail,
  type User as FirebaseUser 
} from 'firebase/auth';
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updatedProfileData: { name?: string; avatarUrl?: string; preferences?: UserProfile['preferences'] }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to map Firebase User to our UserProfile type
const mapFirebaseUserToUserProfile = (firebaseUser: FirebaseUser, currentPreferences?: UserProfile['preferences']): UserProfile => {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    avatarUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
    preferences: currentPreferences || { darkMode: false, notifications: true }, // Preserve or default preferences
  };
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Preserve existing preferences if user object already exists (e.g., from a previous state in the same session)
        // This is a simple way, a more robust solution might involve Firestore for preferences.
        const existingPreferences = user?.id === firebaseUser.uid ? user.preferences : undefined;
        setUser(mapFirebaseUserToUserProfile(firebaseUser, existingPreferences));
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [user]); // Add user to dependency array to re-evaluate mapping if preferences logic changes based on existing user state

  const login = useCallback(async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting the user state
    } catch (error) {
      console.error("Firebase login error:", error);
      throw error; // Re-throw to be caught by the calling component
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, pass: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await firebaseUpdateProfile(userCredential.user, {
        displayName: name,
        photoURL: `https://picsum.photos/seed/${userCredential.user.uid}/100/100` // Default avatar
      });
      // onAuthStateChanged will update the user state, including displayName
      // For immediate update of local state if needed, though onAuthStateChanged should be quick:
      setUser(mapFirebaseUserToUserProfile(userCredential.user, { darkMode: false, notifications: true }));
    } catch (error) {
      console.error("Firebase signup error:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting user to null
    } catch (error) {
      console.error("Firebase logout error:", error);
      throw error;
    }
  }, []);
  
  const updateUserProfile = useCallback(async (updatedProfileData: { name?: string; avatarUrl?: string; preferences?: UserProfile['preferences'] }) => {
    if (!auth.currentUser) {
      throw new Error("No user logged in to update profile.");
    }
    try {
      const { name, avatarUrl, preferences } = updatedProfileData;
      const profileUpdates: { displayName?: string; photoURL?: string } = {};
      if (name) profileUpdates.displayName = name;
      if (avatarUrl) profileUpdates.photoURL = avatarUrl;

      if (Object.keys(profileUpdates).length > 0) {
        await firebaseUpdateProfile(auth.currentUser, profileUpdates);
      }
      
      // Update local state for preferences immediately as they are not part of Firebase User object
      // and for displayName/photoURL to reflect changes potentially before onAuthStateChanged fires.
      setUser(currentUser => {
        if (!currentUser) return null;
        return {
          ...currentUser,
          ...(name && { name }),
          ...(avatarUrl && { avatarUrl }),
          ...(preferences && { preferences }),
        };
      });
      // onAuthStateChanged will also pick up displayName and photoURL changes from Firebase.

    } catch (error) {
      console.error("Firebase profile update error:", error);
      throw error;
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Firebase password reset error:", error);
      throw error;
    }
  }, []);

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    login,
    signup,
    logout,
    updateUserProfile,
    sendPasswordReset,
  }), [user, isLoading, login, signup, logout, updateUserProfile, sendPasswordReset]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
