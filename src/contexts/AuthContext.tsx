
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
import { ADMIN_EMAIL } from '@/lib/constants'; // Import admin email

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
    isAdmin: firebaseUser.email === ADMIN_EMAIL, // Set isAdmin based on email
    preferences: currentPreferences || { darkMode: false, notifications: true }, // Preserve or default preferences
  };
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(currentUserState => {
          const preferencesToUse = (currentUserState && currentUserState.id === firebaseUser.uid)
            ? currentUserState.preferences
            : { darkMode: false, notifications: true }; 
          return mapFirebaseUserToUserProfile(firebaseUser, preferencesToUse);
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []); 

  const login = useCallback(async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Firebase login error:", error);
      throw error; 
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, pass: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await firebaseUpdateProfile(userCredential.user, {
        displayName: name,
        photoURL: `https://picsum.photos/seed/${userCredential.user.uid}/100/100` 
      });
    } catch (error) {
      console.error("Firebase signup error:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
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
      if (avatarUrl) profileUpdates.avatarUrl = avatarUrl; // Corrected to use avatarUrl

      if (Object.keys(profileUpdates).length > 0) {
        await firebaseUpdateProfile(auth.currentUser, profileUpdates);
      }
      
      setUser(currentUser => {
        if (!currentUser) return null;
        // Ensure isAdmin status is preserved during profile updates
        const isAdmin = currentUser.isAdmin; 
        return {
          ...currentUser,
          ...(name && { name: name }), 
          ...(avatarUrl && { avatarUrl: avatarUrl }), 
          ...(preferences && { preferences: preferences }),
          isAdmin, // Preserve admin status
        };
      });

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
