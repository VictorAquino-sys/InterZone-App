// TriviaComponent.jsx
import React, {useState}  from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { TriviaQuestion, useTrivia } from '@/contexts/TriviaContext'; // Make sure you have this hook

// Define the props type for the Trivia component
interface TriviaProps {
    triviaData: TriviaQuestion[];
    language: 'en' | 'es';
    onTriviaComplete: () => void; // Assumes onTriviaComplete is a function taking no arguments and returning void
}

const Trivia = ({ triviaData, language, onTriviaComplete }: TriviaProps) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isAnswered, setIsAnswered] = useState(false);

    const handleAnswer = (answer: string) => {
        setIsAnswered(true);
        const question = triviaData[currentQuestionIndex];
        const correctAnswer = question.correct_answer[language];
        const isCorrect = answer === correctAnswer;
        const message = isCorrect ? 'Correct!' : 'Wrong Answer!';

        setTimeout(() => {
            alert(message);
            if (currentQuestionIndex + 1 < triviaData.length) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
            } else {
                alert("Trivia completed!");
                onTriviaComplete();
            }
            setIsAnswered(false);
        }, 500);
    };

    if (!triviaData.length) return <Text>No trivia questions available</Text>;

    const question = triviaData[currentQuestionIndex];

    return (
        <View style={styles.triviaContainer}>
            <Text style={styles.question}>{question.question[language]}</Text>
            {question.type === 'multiple' ? (
                [question.correct_answer[language], ...question.incorrect_answers.map(a => a[language])]
                .sort(() => Math.random() - 0.5) // Shuffle answers
                .filter(answer => answer !== undefined) // Filter out undefined answers
                .map((answer, index) => (
                    <TouchableOpacity key={index} style={styles.answerButton} onPress={() => handleAnswer(answer as string)}>
                        <Text style={styles.answerText}>{answer}</Text>
                    </TouchableOpacity>
                ))
            ) : (
                ['True', 'False'].map((answer, index) => (
                    <TouchableOpacity key={index} style={styles.answerButton} onPress={() => handleAnswer(question.correct_answer[language] === 'True' ? 'True' : 'False')}>
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
