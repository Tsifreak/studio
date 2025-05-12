
"use client";

import type { UserProfile } from '@/lib/types';
import { mockUser } from '@/lib/placeholder-data';
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>; // Simplified login
  signup: (name: string, email: string, pass: string) => Promise<void>; // Simplified signup
  logout: () => Promise<void>;
  updateProfile: (updatedProfileData: Partial<UserProfile>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'storespot_user';

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
      // If parsing fails or localStorage is unavailable, ensure user is null
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, _pass: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    // In a real app, you'd validate credentials against a backend
    // For demo, if email matches mockUser's email, log in as mockUser
    if (email === mockUser.email) {
      const loggedInUser = { ...mockUser };
      setUser(loggedInUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
    } else {
      // Simulate incorrect credentials
      throw new Error("Invalid email or password");
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, _pass: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newUser: UserProfile = { 
      id: `user_${Date.now()}`, 
      name, 
      email, 
      avatarUrl: `https://picsum.photos/seed/${email}/100/100`,
      preferences: { darkMode: false, notifications: true }
    };
    setUser(newUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
  }, []);

  const logout = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);
  
  const updateProfile = useCallback(async (updatedProfileData: Partial<UserProfile>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(prevUser => {
      if (!prevUser) return null;
      const newUser = { ...prevUser, ...updatedProfileData };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    login,
    signup,
    logout,
    updateProfile,
  }), [user, isLoading, login, signup, logout, updateProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
