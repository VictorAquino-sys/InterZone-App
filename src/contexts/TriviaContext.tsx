import React, {createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useUser } from './UserContext'; // Ensure the correct path is used

export interface TriviaQuestion {
    id: string;
    category: string;
    type: string;
    difficulty: string;
    question: {
        en: string;
        es?: string;
    };
    correct_answer: {
        en: string;
        es: string;
    };
    incorrect_answers: Array<{
        en: string;
        es?: string;
    }>;
}

interface TriviaContextType {
    trivia: TriviaQuestion[];
    loading: boolean;
    error: string | null;
}

const TriviaContext = createContext<TriviaContextType | undefined>(undefined);

interface TriviaProviderProps {
    children: ReactNode;
}

export const TriviaProvider = ({ children }: TriviaProviderProps) => {
    const [trivia, setTrivia] = useState<TriviaQuestion[]>([]);
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
            const q = query(collection(db, "trivia"), where("category", "==", "Entertainment: Music"));
            const querySnapshot = await getDocs(q);
            const triviaData: TriviaQuestion[] = querySnapshot.docs.map(doc => ({
              ...doc.data() as TriviaQuestion,
              id: doc.id
            }));
            setTrivia(triviaData);
            setLoading(false);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrivia();
    }, [user]);
    
    return (
        <TriviaContext.Provider value={{ trivia, loading, error }}>
            { children }
        </TriviaContext.Provider>
    );
};

// Custom hook to use the Trivia context
export const useTrivia = (): TriviaContextType => {
    const context = useContext(TriviaContext);
    if (context === undefined) {
        throw new Error('useTrivia must be used within a TriviaProvider');
    }
    return context;
}