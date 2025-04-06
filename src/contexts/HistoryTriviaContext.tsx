import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../../src/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useUser } from './UserContext'; // Ensure the correct path is used

export interface HistoryTriviaQuestion {
    id: string;
    question: string;
    options: string[];
    correct_answer: string;
    category: string;
}

interface HistoryTriviaContextType {
    trivia: HistoryTriviaQuestion[];
    loading: boolean;
    error: string | null;
}

const HistoryTriviaContext = createContext<HistoryTriviaContextType | undefined>(undefined);

interface HistoryTriviaProviderProps {
    children: ReactNode;
}

export const HistoryTriviaProvider = ({ children }: HistoryTriviaProviderProps) => {
    const [trivia, setTrivia] = useState<HistoryTriviaQuestion[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useUser(); // Use the useUser hook to get the current user

    const fetchTrivia = async () => {
        if (!user) {
            setError('User is not authenticated.');
            setLoading(false);
            return; // Exit if no user is authenticated
        }
        try {
            setLoading(true);
            setError(null);
            const q = query(collection(db, "history"), where("category", "==", "Historia Universal"));
            const querySnapshot = await getDocs(q);
            const loadedTrivia: HistoryTriviaQuestion[] = querySnapshot.docs.map(doc => ({
                ...doc.data() as HistoryTriviaQuestion,
                id: doc.id
            }));
            setTrivia(loadedTrivia);
            console.log("History Trivia Loaded!");
            setLoading(false);
        } catch (err: any) {
            console.error("Error fetching history trivia:", err); // More detailed console error
            setError(`Failed to fetch history trivia: ${err.message || err.toString()}`);
            setLoading(false); // Ensure loading is set to false both on success and error.
        }
    };

    useEffect(() => {
        fetchTrivia();
    }, [user]);

    return (
        <HistoryTriviaContext.Provider value={{ trivia, loading, error }}>
            {children}
        </HistoryTriviaContext.Provider>
    );
};

export const useHistoryTrivia = () => {
    const context = useContext(HistoryTriviaContext);
    if (context === undefined) {
        throw new Error('useHistoryTrivia must be used within a HistoryTriviaProvider');
    }
    return context;
};