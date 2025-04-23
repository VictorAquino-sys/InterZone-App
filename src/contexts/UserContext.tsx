// This file defines a context for managing user information in React application, 
// particularly in association with Firebase authentication. It ensures that user 
// details are available throughout the component tree without prop drilling.

// Import necessary hooks and functions from React and Firebase
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Import getDoc and doc
import { auth, db } from '../../src/config/firebase';
import * as RNLocalize from 'react-native-localize';
import { setUserProps } from '@/utils/analytics';
import { recordHandledError } from '@/utils/crashlytics';

// Define Typescript interface for user data used in the app context
export interface User {
  uid: string;
  name: string;
  avatar?: string;
  country?: string;
  language?: string;
  description?: string;
  blocked?: string[];
  termsAccepted?: boolean;
}

// Define a separate interface for the full Firestore user document
export interface UserData {
  uid: string;
  name?: string;
  email?: string;
  avatar?: string;
  createdAt?: string;
  country?: string;
  blocked?: string[];
  termsAccepted?: boolean;
}

// Define Typescript for context value.
interface UserContextType {
  user: User | null;
  loading: boolean; // Add loading state
  // termsAccepted: boolean;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  // setTermsAccepted: React.Dispatch<React.SetStateAction<boolean>>;
  updateUserProfile: (updates: Partial<User>) => void;
}

// Create a context with a default undefined value (to be defined in provider).
export const UserContext = createContext<UserContextType | undefined>(undefined);

// Define TypeScript interface for provider props.
interface UserProviderProps {
  children: ReactNode;
}

// Define the provider component with type annotation.
export const UserProvider = ({ children }: UserProviderProps ) => {
  // State hook to manage user data, with TypeScript types.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Initialize loading as true
  // const [termsAccepted, setTermsAccepted] = useState(false);
  // Get the Firebase authentication object.
  // const auth = getAuth();

  // Effect hook to manage authentication state changes.
  useEffect(() => {
    // Listen for changes in the authentication state.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setLoading(true); // Set loading true when auth state changes

      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          const locale = RNLocalize.getLocales()[0].languageCode;
          console.log("Locale from RNLocalize:", locale); // Check what RNLocalize returns

          if(userSnap.exists()) {
            const userData = userSnap.data() as UserData;
            // If a user is authenticated, format and set user data in state.
            const updatedUser: User = {
              uid: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || "Default Name",
              avatar: userData.avatar || firebaseUser.photoURL || "",
              country: userData.country || "Unknown",
              language: RNLocalize.getLocales()[0].languageCode,
              termsAccepted: userData.termsAccepted || false, // 👈 Include termsAccepted
            };
            console.log("User logged in with updated data:", updatedUser);
            setUser(updatedUser);
            // ✅ Set analytics user context
            await setUserProps(updatedUser.uid, {
              language: updatedUser.language || 'en',
              country: updatedUser.country || 'unknown',
            });
          } else {
            console.log("No user data available");
            setUser(null);
          }
        } catch (error: any) {
          console.warn("❌ Error fetching user data in auth state:", error);
          await recordHandledError(error);
        }
      } else {
        console.log("User logged out");
        setUser(null);
      }
      setLoading(false); // Set loading false once user data is fetched
    });

    // Cleanup function to unsubscribe from the auth listener on component unmount.
    return () => unsubscribe();
  }, []);

  // Function to update user profile details, accepting partial user info.
  const updateUserProfile = (updates: Partial<User>) => {
    setUser(prev => {
      const updated = { ...prev!, ...updates };
  
      return updated;
    });
  };

  const refreshUser = async () => {
    const firebaseUser = auth.currentUser;
  
    if (firebaseUser) {
      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
    
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserData;
    
          const updatedUser: User = {
            uid: firebaseUser.uid,
            name: userData.name || firebaseUser.displayName || "Default Name",
            avatar: userData.avatar || firebaseUser.photoURL || "",
            country: userData.country || "Unknown",
            language: RNLocalize.getLocales()[0].languageCode,
            termsAccepted: userData.termsAccepted ?? false,
          };

          console.log("🔄 User manually refreshed:", updatedUser);
          setUser(updatedUser);
        }
      } catch (error: any) {
        console.warn("❌ Error fetching user data in auth state:", error);
        await recordHandledError(error);
      }
    }
  };

  // Check for context existence and provide it to children.
  if (!UserContext) throw new Error('useUser must be used within a UserProvider');
  // Provide the user object and associated functions to children components.
  return (
    <UserContext.Provider value={{ user, loading, setUser, updateUserProfile, refreshUser}}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext more easily within components.
// export const useUser = () => useContext(UserContext);

// Custom hook to use the UserContext more easily within components.
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}