import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useUser } from '@/contexts/UserContext';
import { useHistoryTrivia } from '@/contexts/HistoryTriviaContext';

const HistoryTrivia = ({ onTriviaComplete }: { onTriviaComplete: () => void }) => {
    const { user } = useUser();
    const [shouldFetch, setShouldFetch] = useState(false);

    useEffect(() => {
        if (user?.uid) {
            setShouldFetch(true);
        }
    }, [user]);

    const { trivia, loading, error } = useHistoryTrivia();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

    const handleAnswer = (answer: string) => {
        setSelectedAnswer(answer);
        setTimeout(() => {
            const isCorrect = answer === trivia[currentQuestionIndex].correct_answer;
            alert(isCorrect ? 'Correct!' : 'Wrong Answer!');

            const next = currentQuestionIndex + 1;
            if (next < trivia.length) {
                setCurrentQuestionIndex(next);
            } else {
                onTriviaComplete();
            }
            setSelectedAnswer(null);
        }, 500);
    };

    if (loading) return <ActivityIndicator />;
    if (error) return <Text style={styles.errorText}>{error}</Text>;
    if (!trivia.length) return <Text>No history trivia questions available</Text>;

    const question = trivia[currentQuestionIndex];

    return (
        <View style={styles.triviaContainer}>
            <Text style={styles.question}>{question.question}</Text>
            {question.options.map((option, index) => (
                <TouchableOpacity
                    key={index}
                    style={[
                        styles.answerButton,
                        option === selectedAnswer ? styles.selectedAnswer : null,
                    ]}
                    onPress={() => handleAnswer(option)}>
                    <Text style={styles.answerText}>{option}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

// Style definitions remain the same as your existing Trivia component
const styles = StyleSheet.create({
    triviaContainer: {
        padding: 20,
        alignItems: 'center',
    },
    question: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    answerButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DDD',
        marginVertical: 5,
        width: '100%',
        alignItems: 'center',
        borderRadius: 5,
    },
    selectedAnswer: {
        backgroundColor: '#f0f0f0', // Visual feedback for selected answer
    },
    answerText: {
        fontSize: 16,
        color: '#333',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
    },
});

export default HistoryTrivia;