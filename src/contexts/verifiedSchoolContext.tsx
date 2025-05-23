import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

// Define school info shape
export type SchoolInfo = {
  universityId: string;
  universityName: string;
};

// Define context structure
interface VerifiedSchoolContextType {
  school: SchoolInfo | null;
  setSchool: (info: SchoolInfo | null) => void;
  loading: boolean;
  setLoading: (val: boolean) => void;
}

// Create context with default values
const VerifiedSchoolContext = createContext<VerifiedSchoolContextType | undefined>(undefined);

// Provider props type
interface VerifiedSchoolProviderProps {
  children: ReactNode;
}

// Provider component
export const VerifiedSchoolProvider = ({ children }: VerifiedSchoolProviderProps) => {
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Load school from storage
  const loadSchool = async () => {
    try {
      const stored = await AsyncStorage.getItem('verifiedSchool');
      if (stored) {
        setSchool(JSON.parse(stored));
      } else {
        setSchool(null);
      }
    } catch (e) {
      console.warn('Failed to load verified school from AsyncStorage:', e);
    } finally {
      setLoading(false);
    }
  };

  // On mount or deep link
  useEffect(() => {
    loadSchool();

    const subscription = Linking.addEventListener('url', async ({ url }: { url: string }) => {
      if (url === 'interzone://verify') {
        console.log('[VerifiedSchoolContext] Deep link received, refreshing school...');
        await loadSchool();
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <VerifiedSchoolContext.Provider value={{ school, setSchool, loading, setLoading }}>
      {children}
    </VerifiedSchoolContext.Provider>
  );
};

// Custom hook to consume the context
export const useVerifiedSchool = (): VerifiedSchoolContextType => {
  const context = useContext(VerifiedSchoolContext);
  if (!context) {
    throw new Error('useVerifiedSchool must be used within a VerifiedSchoolProvider');
  }
  return context;
};
