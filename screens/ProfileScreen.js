// ProfileScreen.js updates Firebase Auth (using updateProfile(auth.currentUser, { ...}))

import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, Button, Image, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, signOut, updateProfile } from "firebase/auth";
import * as ImagePicker from 'expo-image-picker';
import { UserContext } from '../src/contexts/UserContext';
import Avatar from '../src/components/Avatar';
import { db } from '../src/config/firebase';
import { Alert } from 'react-native';
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import Ionicons from 'react-native-vector-icons/Ionicons';  // Make sure Ionicons is installed
import i18n from './../src/i18n'; 

const ProfileScreen = () => {
    const navigation = useNavigation();
    const auth = getAuth();
    const authUser = auth.currentUser;
    // const db = getFirestore(); // Initialize Firestore
    // const defaultImage = 'https://via.placeholder.com/150';

    // States for user details
    const [newName, setNewName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    // const [profilePic, setProfilePic] = useState(defaultImage);
    const [profilePic, setProfilePic] = useState(null);
    const { user, setUser } = useContext(UserContext);
    
    // console.log("Profile Screen");

    useEffect(() => {
        navigation.setOptions({
            headerShown: false,
            Title: '',
        });
        requestMediaLibraryPermissions();
    }, []);

    useFocusEffect(
        useCallback(() => {
            const fetchProfile = async () => {
                try {// Ensure you have a valid user before proceeding
                    if (authUser) {
                        const userRef = doc(db, "users", authUser.uid);
                        const docSnap = await getDoc(userRef);

                        if (docSnap.exists()) {
                            const userData = docSnap.data();
                            setNewName(userData.name || 'Default Name');
                            setProfilePic(userData.avatar || '');
                        }
                        // const userId = authUser.uid;
                        // const storedName = await AsyncStorage.getItem('userName' + userId);
                        // const storedPic = await AsyncStorage.getItem('profilePic' + userId);
                        // console.log("Fetched name and pic for user ID:", userId, storedName, storedPic);
                        // setName(storedName || 'Default Name');
                        // setProfilePic(storedPic);
                    // } else {
                        // console.log("No user logged in, using default profile settings.");
                        // setName('Default Name');
                        // setProfilePic(defaultImage);
                    }
                } catch (error) {
                    console.error("Failed to fetch profile data:", error);
                }
            };
            fetchProfile();
        }, [authUser])
    );

    const requestMediaLibraryPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted'){
            alert('Sorry, we need camera roll permissions to make this work!');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth); // Sign out the user
            setUser(null); // Clear user state in context
            await AsyncStorage.clear(); // Clear all AsyncStorage items
            // Navigate to Login screen before signing out
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }], // Ensure this matches the name in your navigator
            });
            console.log('User has logged out.');
        } catch (error) {
        // An error happened.
            console.error("Logout Error:", error);
            Alert.alert("Error", "There was an error logging out. Please try again.");
        }
    };

    const handleUpdateProfile = async () => {
        try {
            if (!authUser) return;

            // Reference to the Firestore document
            const userRef = doc(db, "users", authUser.uid);
            const docSnap = await getDoc(userRef);

            let updatedUserData = { name: newName, avatar: profilePic };

            // Check if the user document exists
            if (!docSnap.exists()) {
                console.log("User document does not exist. Creating a new one...");
                await setDoc(userRef, updatedUserData, { merge: true });  // Merge to prevent data loss            } else {
            } else {    
                console.log("Updating existing user profile...");
                await updateDoc(userRef, updatedUserData);
            }

            // Update Firebase Auth displayName & photoURL
            await updateProfile(auth.currentUser, { displayName: newName, photoURL: profilePic });
            alert('Profile Updated Successfully');

            console.log("Updated Firebase Auth displayName:", auth.currentUser.displayName);

            // Fetch the latest user data from Firestore (to ensure UI is updated)
            const updatedSnap = await getDoc(userRef);
            if (updatedSnap.exists()) {
                updatedUserData = updatedSnap.data();
            }

            // Update user context
            setUser((prevUser) => ({
                ...prevUser,
                name: updatedUserData.name,
                avatar: updatedUserData.avatar,
            }));
            
            // Update AsyncStorage
            await AsyncStorage.setItem('userName' + authUser.uid, newName);

            // Only save profilePic if it's NOT null
            if (profilePic) {
                await AsyncStorage.setItem('profilePic' + authUser.uid, profilePic);
            } else {
                await AsyncStorage.removeItem('profilePic' + authUser.uid); // Remove instead
            }
        
            console.log("Profile updated successfully:", updatedUserData);
            alert('Profile Updated Successfully');
            // Set editing to false here to switch back to non-edit mode
            setIsEditing(false);

        } catch (error) {
            console.error("Error updating profile:", error);
            alert('Error updating profile: ' + error.message);
        }
    };

    const toggleEdit = () => {
        setIsEditing(!isEditing);
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Sorry, we need camera roll permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
             // Access the first item in the assets array
            console.log("New image URI:", uri);  // Check what URI is being set
            const uri = result.assets[0].uri;
            setProfilePic(uri);
            setUser({ ...user, avatar: uri });
            AsyncStorage.setItem('profilePic' + authUser.uid, uri); // Save the new profile picture
            console.log("Saving new profile picture.");
        } else {
            console.log('Image picker was canceled or no image was selected');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{i18n.t('profileTitle')}</Text>
            <TouchableOpacity onPress={pickImage}>
            <Avatar key={profilePic} name={newName} imageUri={profilePic} size={150}/>
            </TouchableOpacity>
            <View style={styles.nameContainer}>
                {isEditing ? (
                    <TextInput
                        value={newName}
                        onChangeText={setNewName}
                        style={styles.input}
                        autoFocus={true}
                        onBlur={() => setIsEditing(false)}  // Optionally stop editing when input is blurred
                    />
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.newName}>{newName}</Text>
                        <TouchableOpacity onPress={toggleEdit}>
                            <Ionicons name="pencil" size={24} color="gray" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            {isEditing && (
                <Button title={i18n.t('updateProfileButton')} onPress={handleUpdateProfile} />
            )}
            <Button title={i18n.t('logoutButton')} onPress={handleLogout} />
        </View>
    );
};

export default ProfileScreen;

const styles = StyleSheet.create({
    container:{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    profilePic: {
        width: 150,
        height: 150,
        borderRadius: 75, // Makes image round
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd' // Optional: adds a border for better visibility
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,   // Corrected from 'marginButtom'
    },
    nameContainer: {
        marginBottom: 20,
    },
    newName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginRight: 10,
    },
    input: {
        fontSize: 18,
        marginBottom: 20,
        borderWidth: 1,
        padding: 10,
        width: '100%',
    },
});