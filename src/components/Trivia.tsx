// TriviaComponent.jsx
import React, {useState}  from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTrivia } from '@/contexts/TriviaContext'; // Make sure you have this hook

// Define the props type for the Trivia component
interface TriviaProps {
    onTriviaComplete: () => void; // Assumes onTriviaComplete is a function taking no arguments and returning void
}

const Trivia = ({ onTriviaComplete }: TriviaProps) => {
    const { trivia, loading, error } = useTrivia();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    const handleAnswer = (answer: string) => {
        setSelectedAnswer(answer);
        setIsAnswered(true);
        setTimeout(() => {
            // Logic to handle answer, check correctness, and move to next question
            if (answer === trivia[currentQuestionIndex].correct_answer.en) {
                alert('Correct!');
            } else {
                alert('Wrong Answer!');
            }
            const nextQuestionIndex = currentQuestionIndex + 1;
            if (nextQuestionIndex < trivia.length) {
                setCurrentQuestionIndex(nextQuestionIndex);
            } else {
                alert('Trivia completed!');
                onTriviaComplete(); // Call the callback when trivia is completed
                // Reset or end the trivia session
            }
            setIsAnswered(false);
            setSelectedAnswer(null);
        }, 500);
    };

    if (loading) return <ActivityIndicator />;
    if (error) return <Text style={styles.errorText}>{error}</Text>;
    if (!trivia.length) return <Text>No trivia questions available</Text>;

    const question = trivia[currentQuestionIndex];

    return (
        <View style={styles.triviaContainer}>
            <Text style={styles.question}>{question.question.en}</Text>
            {question.type === 'multiple' ? (
                [...question.incorrect_answers.map(a => a.en), question.correct_answer.en]
                .sort(() => Math.random() - 0.5) // Shuffle answers
                .map((answer, index) => (
                    <TouchableOpacity key={index} style={styles.answerButton} onPress={() => handleAnswer(answer)}>
                        <Text style={styles.answerText}>{answer}</Text>
                    </TouchableOpacity>
                ))
            ) : (
                ['True', 'False'].map((answer, index) => (
                    <TouchableOpacity key={index} style={styles.answerButton} onPress={() => handleAnswer(answer)}>
                        <Text style={styles.answerText}>{answer}</Text>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );
};

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
        shadowColor: "#000",
        padding: 10,
        marginVertical: 5,
        width: '100%',
        alignItems: 'center',
        borderRadius: 5,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        marginBottom: 10,  // Space between buttons
    },
    correctAnswer: {
        backgroundColor: '#D4EDDA',
    },
    incorrectAnswer: {
        backgroundColor: '#F8D7DA',
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

export default Trivia;
