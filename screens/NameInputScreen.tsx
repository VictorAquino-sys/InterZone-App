import React, { useState, useContext, useEffect, FunctionComponent } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
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
            Alert.alert(i18n.t('error'), i18n.t('nameEmptyError'));
            return;
        }

        if (!userId) {
            Alert.alert(i18n.t('error'), i18n.t('missingUserInfo'));
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
            Alert.alert(i18n.t('error'), i18n.t('saveError'));
        }
    };

    if (checking) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#26c6da" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{i18n.t('nameInputTitle')}</Text>
            <TextInput
                placeholder={i18n.t('nameInputPrompt')}
                value={name}
                onChangeText={setName}
                style={styles.input}
                autoFocus
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveName}>
                <Text style={styles.saveButtonText}>{i18n.t('saveName')}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8'
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        height: 50,
        marginVertical: 15,
        padding: 15,
        borderWidth: 1,
        borderRadius: 8,
        borderColor: '#ccc',
        fontSize: 16,
        backgroundColor: '#fff',
    },
    saveButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#007aff',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    saveButtonText: {
        fontSize: 18,
        color: '#fff',
        fontWeight: '600',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    }
});

export default NameInputScreen;