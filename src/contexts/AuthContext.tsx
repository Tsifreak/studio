
"use client";

import type { UserProfile, Chat, UserPreferences, UserProfileFirestoreData } from '@/lib/types';
import { auth, storage, db } from '@/lib/firebase'; 
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
import { subscribeToUserChats } from '@/lib/chatService';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  getDoc,
  type Unsubscribe,
  type DocumentSnapshot
} from 'firebase/firestore';

const USER_PROFILES_COLLECTION = 'userProfiles';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updatedProfileData: { 
    name?: string; 
    avatarFile?: File | null; 
    preferences?: UserPreferences; 
  }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapFirebaseUserToUserProfile = (
  firebaseUser: FirebaseUser,
  firestoreProfileData?: UserProfileFirestoreData
): UserProfile => {
  const defaultPreferences: UserPreferences = { darkMode: false, notifications: true };
  return {
    id: firebaseUser.uid,
    name: firestoreProfileData?.name || firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    avatarUrl: firestoreProfileData?.avatarUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png`,
    isAdmin: firebaseUser.email === ADMIN_EMAIL,
    preferences: firestoreProfileData?.preferences || defaultPreferences,
    totalUnreadMessages: firestoreProfileData?.totalUnreadMessages || 0,
    pendingBookingsCount: firestoreProfileData?.pendingBookingsCount || 0,
    bookingStatusUpdatesCount: firestoreProfileData?.bookingStatusUpdatesCount || 0,
  };
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let chatListenerUnsubscribe: Unsubscribe | null = null;
    let userProfileListenerUnsubscribe: Unsubscribe | null = null;
  
    const authUnsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser) => {
      if (chatListenerUnsubscribe) chatListenerUnsubscribe();
      if (userProfileListenerUnsubscribe) userProfileListenerUnsubscribe();
      chatListenerUnsubscribe = null;
      userProfileListenerUnsubscribe = null;
  
      if (currentFirebaseUser) {
        setFirebaseUser(currentFirebaseUser); 
  
        const userProfileRef = doc(db, USER_PROFILES_COLLECTION, currentFirebaseUser.uid);
  
        userProfileListenerUnsubscribe = onSnapshot(userProfileRef, (docSnap: DocumentSnapshot<UserProfileFirestoreData>) => {
          let firestoreData: UserProfileFirestoreData | undefined = undefined;
          if (docSnap.exists()) {
            firestoreData = docSnap.data();
          } else {
            const defaultProfile: UserProfileFirestoreData = {
              name: currentFirebaseUser.displayName || 'User',
              email: currentFirebaseUser.email || '',
              avatarUrl: currentFirebaseUser.photoURL || `https://placehold.co/100x100.png`,
              preferences: { darkMode: false, notifications: true },
              totalUnreadMessages: 0,
              pendingBookingsCount: 0,
              bookingStatusUpdatesCount: 0,
              createdAt: serverTimestamp() as any,
              lastSeen: serverTimestamp() as any,
            };
            setDoc(userProfileRef, defaultProfile).catch(e => console.error("Error creating default user profile:", e));
            firestoreData = defaultProfile;
          }
          setUser(mapFirebaseUserToUserProfile(currentFirebaseUser, firestoreData));
        });
  
        chatListenerUnsubscribe = subscribeToUserChats(currentFirebaseUser.uid, async (updatedChats: Chat[]) => {
          const calculatedUnreadMessages = updatedChats.reduce((acc, chat) => {
            const count = currentFirebaseUser.uid === chat.userId ? chat.userUnreadCount : chat.ownerUnreadCount;
            return acc + (Number(count) || 0); 
          }, 0);
  
          setUser(currentProfile => {
            if (currentProfile && currentProfile.id === currentFirebaseUser.uid && currentProfile.totalUnreadMessages !== calculatedUnreadMessages) {
              return { ...currentProfile, totalUnreadMessages: calculatedUnreadMessages };
            }
            return currentProfile;
          });
  
          try {
            const userProfileDoc = await getDoc(userProfileRef);
            if (userProfileDoc.exists()) {
              if (userProfileDoc.data()?.totalUnreadMessages !== calculatedUnreadMessages) {
                await updateDoc(userProfileRef, { totalUnreadMessages: calculatedUnreadMessages });
              }
            }
          } catch (error) {
            console.error("Error updating unread messages in Firestore profile:", error);
          }
        });
  
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
  
      setIsLoading(false);
    });
  
    return () => {
      authUnsubscribe();
      if (chatListenerUnsubscribe) chatListenerUnsubscribe();
      if (userProfileListenerUnsubscribe) userProfileListenerUnsubscribe();
    };
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
      const newFirebaseUser = userCredential.user; // Renamed to avoid conflict
      await firebaseUpdateProfile(newFirebaseUser, {
        displayName: name,
        photoURL: `https://placehold.co/100x100.png` 
      });
      const userProfileRef = doc(db, USER_PROFILES_COLLECTION, newFirebaseUser.uid);
      const initialProfileData: UserProfileFirestoreData = {
        name: name,
        email: email,
        avatarUrl: newFirebaseUser.photoURL || `https://placehold.co/100x100.png`,
        preferences: { darkMode: false, notifications: true },
        totalUnreadMessages: 0,
        pendingBookingsCount: 0,
        bookingStatusUpdatesCount: 0,
        createdAt: serverTimestamp() as any,
        lastSeen: serverTimestamp() as any,
      };
      await setDoc(userProfileRef, initialProfileData);
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
    preferences?: UserPreferences;
  }) => {
    const currentUserAuth = auth.currentUser;
    if (!currentUserAuth) {
      throw new Error("No user logged in to update profile.");
    }

    try {
      const { name, avatarFile, preferences } = updatedProfileData;
      const profileUpdatesForFirebaseAuth: { displayName?: string; photoURL?: string } = {};
      const firestoreUpdates: Partial<UserProfileFirestoreData> = { lastSeen: serverTimestamp() as any };
      let newAvatarUrl: string | undefined = undefined;

      if (avatarFile) {
        const imagePath = `avatars/${currentUserAuth.uid}/${Date.now()}_${avatarFile.name}`;
        const fileStorageRef = storageRef(storage, imagePath);
        const uploadResult = await uploadBytes(fileStorageRef, avatarFile);
        newAvatarUrl = await getDownloadURL(uploadResult.ref);
        profileUpdatesForFirebaseAuth.photoURL = newAvatarUrl;
        firestoreUpdates.avatarUrl = newAvatarUrl;
      }

      if (name) {
        profileUpdatesForFirebaseAuth.displayName = name;
        firestoreUpdates.name = name;
      }
      if (preferences) {
        firestoreUpdates.preferences = preferences;
      }
      
      if (Object.keys(profileUpdatesForFirebaseAuth).length > 0) {
        await firebaseUpdateProfile(currentUserAuth, profileUpdatesForFirebaseAuth);
      }
      
      const userProfileRef = doc(db, USER_PROFILES_COLLECTION, currentUserAuth.uid);
      await updateDoc(userProfileRef, firestoreUpdates);

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
    firebaseUser,
    isLoading,
    login,
    signup,
    logout,
    updateUserProfile,
    sendPasswordReset,
  }), [user, firebaseUser, isLoading, login, signup, logout, updateUserProfile, sendPasswordReset]); // Added firebaseUser

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
