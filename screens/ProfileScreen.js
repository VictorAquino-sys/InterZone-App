import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Button, Image, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, signOut, updateProfile } from "firebase/auth";
import * as ImagePicker from 'expo-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';  // Make sure Ionicons is installed

const ProfileScreen = () => {
    const navigation = useNavigation();
    const auth = getAuth();
    const user = auth.currentUser;
    const defaultImage = 'https://via.placeholder.com/150';
    // States for user details
    const [name, setName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [profilePic, setProfilePic] = useState(defaultImage);

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
                try {
                    const userId = user ? user.uid : 'default';
                    const storedName = await AsyncStorage.getItem('userName' + userId);
                    const storedPic = await AsyncStorage.getItem('profilePic' + userId);
                    console.log("Fetched name and pic:", storedName, storedPic);
                    setName(storedName || 'Default Name');
                    setProfilePic(storedPic || defaultImage);
                } catch (error) {
                    console.error("Failed to fetch profile data:", error);
                }
            };
            fetchProfile();
        }, [user])
    );

    const requestMediaLibraryPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted'){
            alert('Sorry, we need camera roll permissions to make this work!');
        }
    };

    const handleLogout = () => {
        signOut(auth).then(() => {
            // After signing out, clear any stored user data from AsyncStorage
            AsyncStorage.removeItem('user').then(() => {
            // sign-out successful. No need to navigate here. The App.js logic
            // will automatically switch to the login screen.
                navigation.navigate('Login');
            }).catch((error) => {
        // An error happened.
            console.error("Logout Error:", error);
            });
        });
    };

    const handleUpdateProfile = async () => {
        try {
            await updateProfile(auth.currentUser, { displayName: name, photoURL: profilePic });
            alert('Profile Updated Successfully');
            // Set editing to false here to switch back to non-edit mode
            setIsEditing(false);
            AsyncStorage.setItem('userName' + user.uid, name);
            AsyncStorage.setItem('profilePic' + user.uid, profilePic);
        } catch (error) {
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
            const uri = result.assets[0].uri;
            setProfilePic(uri);
            AsyncStorage.setItem('profilePic' + user.uid, uri); // Save the new profile picture
        } else {
            console.log('Image picker was canceled or no image was selected');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity onPress={pickImage}>
                <Image source={{ uri: profilePic }} style={styles.profilePic} />
            </TouchableOpacity>
            <View style={styles.nameContainer}>
                {isEditing ? (
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                        autoFocus={true}
                        onBlur={() => setIsEditing(false)}  // Optionally stop editing when input is blurred
                    />
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.name}>{name}</Text>
                        <TouchableOpacity onPress={toggleEdit}>
                            <Ionicons name="pencil" size={24} color="gray" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            {isEditing && (
                <Button title="Update Profile" onPress={handleUpdateProfile} />
            )}
            <Button title="Logout" onPress={handleLogout} />
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
    name: {
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