import React, { useState, useContext, useEffect, FunctionComponent } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from "firebase/auth";
import i18n from '@/i18n'; 
import { db } from '../src/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { RootStackParamList } from '../src/navigationTypes';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useUser } from '@/contexts/UserContext';
import { CommonActions } from '@react-navigation/native';

type NameInputScreenProps = NativeStackScreenProps<RootStackParamList, 'NameInputScreen'>;

const NameInputScreen: FunctionComponent<NameInputScreenProps> = ({ navigation }) => {
    const [name, setName] = useState<string>('');
    const [checking, setChecking] = useState<boolean>(true); // Prevent double redirects

    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    const { user, updateUserProfile } = useUser();


    console.log("Verify userId: ", userId);

    // Check if the name is already set
    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return; // Ensure userId is available

            try {
                // Check if name exists in Firestore
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);
                // Check AsyncStorage
                const storedName = await AsyncStorage.getItem('userName' + userId);

                if (userSnap.exists() && userSnap.data().name || storedName) {
                    console.log("Name already set, redirecting...");
                    // navigation.navigate('BottomTabs');

                }
            } catch (error) {
                console.error("Error checking name:", error);
            } finally {
                setChecking(false); // Stop checking to prevent loops
            }
        };

        fetchData();
    }, [userId]); // Only run when `userId` changes

    const handleSaveName = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Name cannot be empty.");
            return;
        }

        if (!userId) {
            Alert.alert('Missing user information.');
            return;
        }

        try {
            // Save name in Firestore
            const userRef = doc(db, "users", userId);
            await setDoc(userRef, { name: name }, { merge: true });

            updateUserProfile({ name });
            // Save name in AsyncStorage
            await AsyncStorage.setItem('userName' +  userId!, name); // Simplify this for demo purposes

            console.log("Saved name:", name); // Debug: Check if the name is logged correctly
            navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'BottomTabs' }],
                })
              );            
        } catch (error) {
            // Alert.alert(i18n.t('error'), i18n.t('saveError'));
            console.error('Failed to save name', error);
            Alert.alert("Failed to save name. Please try again.");
        }
    };

    if (checking) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
        <View style={styles.container}>
            <TextInput
                placeholder={i18n.t('nameInputPrompt')}
                value={name}
                onChangeText={setName}
                style={styles.input}
                autoFocus
            />
            <Button title={i18n.t('saveName')} onPress={handleSaveName} />
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
