import { useState, useEffect } from 'react';
import { collection, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '@/config/firebase';

type TriviaQuestion = {
    question: string;
    options: string[];
    correct_answer: string;
  };

export const useHistoryTrivia = (shouldFetch = true) => {
    const [trivia, setTrivia] = useState<TriviaQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!shouldFetch) return;

        const fetchTrivia = async () => {
        setLoading(true);
        try {
            const ref = collection(db, 'trivia');
            const snapshot = await getDocs(ref);
            const data: TriviaQuestion[] = snapshot.docs.map(doc => doc.data() as TriviaQuestion);
            setTrivia(data);
        } catch (err: any) {
            console.error('Error fetching history trivia:', err);
            setError(err.message || 'Failed to load trivia');
        } finally {
            setLoading(false);
        }
        };

        fetchTrivia();
    }, [shouldFetch]);

    return { trivia, loading, error };
};