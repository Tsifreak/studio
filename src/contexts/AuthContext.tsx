"use client";

import type { UserProfile } from '@/lib/types';
import { auth, storage } from '@/lib/firebase'; // Import storage
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail,
  type User as FirebaseUser 
} from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'; // Firebase Storage imports
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { ADMIN_EMAIL } from '@/lib/constants';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updatedProfileData: { 
    name?: string; 
    avatarFile?: File | null; // Changed from avatarUrl to avatarFile
    preferences?: UserProfile['preferences']; 
  }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapFirebaseUserToUserProfile = (firebaseUser: FirebaseUser, currentPreferences?: UserProfile['preferences']): UserProfile => {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    avatarUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
    isAdmin: firebaseUser.email === ADMIN_EMAIL,
    preferences: currentPreferences || { darkMode: false, notifications: true },
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
      // After signup, the onAuthStateChanged listener will update the user state
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
  
  const updateUserProfile = useCallback(async (updatedProfileData: { 
    name?: string; 
    avatarFile?: File | null; 
    preferences?: UserProfile['preferences'] 
  }) => {
    const currentUserAuth = auth.currentUser;
    if (!currentUserAuth) {
      throw new Error("No user logged in to update profile.");
    }

    try {
      const { name, avatarFile, preferences } = updatedProfileData;
      const profileUpdatesForFirebaseAuth: { displayName?: string; photoURL?: string } = {};
      let newAvatarUrl: string | undefined = undefined;

      if (avatarFile) {
        const imagePath = `avatars/${currentUserAuth.uid}/${Date.now()}_${avatarFile.name}`;
        const fileStorageRef = storageRef(storage, imagePath);
        const uploadResult = await uploadBytes(fileStorageRef, avatarFile);
        newAvatarUrl = await getDownloadURL(uploadResult.ref);
        profileUpdatesForFirebaseAuth.photoURL = newAvatarUrl;
      }

      if (name) profileUpdatesForFirebaseAuth.displayName = name;
      
      if (Object.keys(profileUpdatesForFirebaseAuth).length > 0) {
        await firebaseUpdateProfile(currentUserAuth, profileUpdatesForFirebaseAuth);
      }
      
      // Update local user state
      setUser(currentUserState => {
        if (!currentUserState) return null;
        return {
          ...currentUserState,
          ...(name && { name: name }),
          ...(newAvatarUrl && { avatarUrl: newAvatarUrl }),
          ...(preferences && { preferences: preferences }),
          isAdmin: currentUserAuth.email === ADMIN_EMAIL, // Ensure isAdmin status is preserved
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
