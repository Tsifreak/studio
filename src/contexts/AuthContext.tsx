
"use client";

import type { UserProfile, Chat } from '@/lib/types'; // Added Chat
import { auth, storage } from '@/lib/firebase'; 
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail,
  type User as FirebaseUser 
} from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { ADMIN_EMAIL } from '@/lib/constants';
import { subscribeToUserChats } from '@/lib/chatService'; // Import chat subscription
import type { Unsubscribe } from 'firebase/firestore'; // Import Unsubscribe type

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updatedProfileData: { 
    name?: string; 
    avatarFile?: File | null; 
    preferences?: UserProfile['preferences']; 
  }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Adjusted to not include totalUnreadMessages directly, it will be updated by listener
const mapFirebaseUserToUserProfile = (firebaseUser: FirebaseUser, currentPreferences?: UserProfile['preferences']): UserProfile => {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    avatarUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
    isAdmin: firebaseUser.email === ADMIN_EMAIL,
    preferences: currentPreferences || { darkMode: false, notifications: true },
    totalUnreadMessages: 0, // Initialize, will be updated by listener
  };
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let chatUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Always clean up previous chat listener if it exists
      if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
      }

      if (firebaseUser) {
        const currentPrefs = user?.id === firebaseUser.uid ? user.preferences : undefined;
        const initialProfile = mapFirebaseUserToUserProfile(firebaseUser, currentPrefs);
        setUser(initialProfile); // Set initial user profile (totalUnreadMessages = 0)

        // Subscribe to chats for real-time unread count updates
        chatUnsubscribe = subscribeToUserChats(firebaseUser.uid, (updatedChats: Chat[]) => {
          const calculatedUnreadMessages = updatedChats.reduce((acc, chat) => {
            const count = firebaseUser.uid === chat.userId ? chat.userUnreadCount : chat.ownerUnreadCount;
            return acc + (Number(count) || 0); 
          }, 0);
          
          setUser(currentProfile => {
            // Ensure we are updating the profile for the *same* user and only if count changed
            if (currentProfile && currentProfile.id === firebaseUser.uid) {
              if (currentProfile.totalUnreadMessages !== calculatedUnreadMessages) {
                return { ...currentProfile, totalUnreadMessages: calculatedUnreadMessages };
              }
              return currentProfile; // No change in count, return same profile to avoid re-render
            }
            return currentProfile; 
          });
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (chatUnsubscribe) {
        chatUnsubscribe();
      }
    };
  }, []); // Empty dependency array: This effect runs once on mount.

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
      
      setUser(currentUserState => {
        if (!currentUserState) return null;
        return {
          ...currentUserState,
          ...(name && { name: name }),
          ...(newAvatarUrl && { avatarUrl: newAvatarUrl }),
          ...(preferences && { preferences: preferences }),
          isAdmin: currentUserAuth.email === ADMIN_EMAIL, 
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
