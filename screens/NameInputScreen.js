import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from "firebase/auth";
import i18n from './../src/i18n'; 
import { db } from '../src/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const NameInputScreen = ({ route, navigation }) => {
    const auth = getAuth();
    const authUser = auth.currentUser;
    const [name, setName] = useState('');
    const [checking, setChecking] = useState(true); // Prevent double redirects
    // const { userId } = route.params || {}; // Safely destructure with default empty object
    
    const userId = authUser ? authUser.uid : null; // Always get the correct user ID
    console.log("Verify userId: ", userId);

    // Check if the name is already set
    useEffect(() => {
        const checkName = async () => {
            if (!userId) return; // Ensure userId is available

             try {
                // Check if name exists in Firestore
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists() && userSnap.data().name) {
                    console.log("Name already set, redirecting...");
                    navigation.replace('BottomTabs'); 
                    return;
                }

                // Check AsyncStorage
                const storedName = await AsyncStorage.getItem('userName' + userId);
                if (storedName) {
                    console.log("Name already set in AsyncStorage, redirecting...");
                    navigation.replace('BottomTabs');
                }
            } catch (error) {
                console.error("Error checking name:", error);
            } finally {
                setChecking(false); // Stop checking to prevent loops
            }
        };

        checkName();
    }, [userId]); // Only run when `userId` changes

    const saveName = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Name cannot be empty.");
            return;
        }
        try {
            if (!userId) {
                console.error("Error: No user ID available");
                return;
            }

            // Save name in FIrestore
            const userRef = doc(db, "users", userId);
            await setDoc(userRef, { name }, { merge: true });

            // Save name in AsyncStorage
            await AsyncStorage.setItem('userName' +  userId, name); // Simplify this for demo purposes

            console.log("Saved name:", name); // Debug: Check if the name is logged correctly
            navigation.replace('BottomTabs');  // Navigate to Home after saving / prevent going back to NameInputScreen
        } catch (error) {
            console.error('Failed to save name', error);
        }
    };

    if (checking) return null; // Prevent rendering if still checking

    return (
        <View style={styles.container}>
            <TextInput
                placeholder={i18n.t('nameInputPrompt')}
                value={name}
                onChangeText={setName}
                style={styles.input}
            />
            <Button title={i18n.t('saveName')} onPress={saveName} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    input: {
        width: '100%',
        height: 40,
        marginVertical: 10,
        borderWidth: 1,
        padding: 10,
    },
});

export default NameInputScreen;
