// HistoryTrivia.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useHistoryTrivia } from '@/contexts/HistoryTriviaContext'; // This would be your new or adapted context for history trivia
import { useUser } from '@/contexts/UserContext'; // Context that provides user data

const HistoryTrivia = ({ onTriviaComplete }: { onTriviaComplete: () => void }) => {
    const { trivia, loading, error } = useHistoryTrivia();
    const { user } = useUser();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isPermitted, setIsPermitted] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

    useEffect(() => {
        // Check if the user's country is Peru
        if (user?.country === 'Peru') {
            setIsPermitted(true);
        }
    }, [user]);

    const handleAnswer = (answer: string) => {
        setSelectedAnswer(answer); // Set selected answer for UI feedback
        setTimeout(() => {
            if (answer === trivia[currentQuestionIndex].correct_answer) {
                alert('Correct!');
            } else {
                alert('Wrong Answer!');
            }

            const nextQuestionIndex = currentQuestionIndex + 1;
            if (nextQuestionIndex < trivia.length) {
                setCurrentQuestionIndex(nextQuestionIndex);
            } else {
                onTriviaComplete();
            }
            setSelectedAnswer(null); // Reset selected answer
        }, 500);
    };

    // if (!isPermitted) return <Text>History Trivia is not available in your location.</Text>;
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