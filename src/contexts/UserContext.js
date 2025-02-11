// USer context.js listens for Firebase Auth canges but does not save user details to firestore.

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth } from "firebase/auth";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(firebaseUser => {
      if (firebaseUser) {
        const updatedUser = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "Default Name",
          avatar: firebaseUser.photoURL || ""
        };
        setUser(updatedUser);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateUserProfile = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateUserProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);