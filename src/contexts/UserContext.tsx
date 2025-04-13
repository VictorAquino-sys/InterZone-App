// This file defines a context for managing user information in React application, 
// particularly in association with Firebase authentication. It ensures that user 
// details are available throughout the component tree without prop drilling.

// Import necessary hooks and functions from React and Firebase
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Import getDoc and doc
import { auth, db } from '../../src/config/firebase';
import * as RNLocalize from 'react-native-localize';

// Define Typescript interface for user data used in the app context
export interface User {
  uid: string;
  name: string;
  avatar?: string;
  country?: string;
  language?: string;
  description?: string;
  blocked?: string[];
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
}

// Define Typescript for context value.
interface UserContextType {
  user: User | null;
  loading: boolean; // Add loading state
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
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
  // Get the Firebase authentication object.
  // const auth = getAuth();

  // Effect hook to manage authentication state changes.
  useEffect(() => {
    // Listen for changes in the authentication state.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setLoading(true); // Set loading true when auth state changes
      if (firebaseUser) {
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
            language: RNLocalize.getLocales()[0].languageCode
          };
          console.log("User logged in with updated data:", updatedUser);
          setUser(updatedUser);
        } else {
          console.log("No user data available");
          setUser(null);
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
    setUser(prev => ({ ...prev!, ...updates }));
  };

  // Check for context existence and provide it to children.
  if (!UserContext) throw new Error('useUser must be used within a UserProvider');
  // Provide the user object and associated functions to children components.
  return (
    <UserContext.Provider value={{ user, loading, setUser, updateUserProfile }}>
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