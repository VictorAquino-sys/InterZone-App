import React, { useEffect, useState, useCallback, useContext, FunctionComponent } from 'react';
import { View, Text, StyleSheet, Button, Image, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, signOut, updateProfile } from "firebase/auth";
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../src/contexts/UserContext';
import Avatar from '../src/components/Avatar';
import { db } from '../src/config/firebase';
import { Alert } from 'react-native';
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import Ionicons from '@expo/vector-icons/Ionicons';
import i18n from '../src/i18n'; 
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import mime from "mime";
import { ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigationTypes';

type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'ProfileScreen'>;

const ProfileScreen: FunctionComponent<ProfileScreenProps> = ({ navigation }) => {
    const auth = getAuth();
    const authUser = auth.currentUser;
    const storage = getStorage();

    // States for user details
    const [newName, setNewName] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const { user, setUser } = useUser();
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        navigation.setOptions({
            headerShown: false,
            title: '',
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

                            setProfilePic(authUser.photoURL || userData.avatar || '');
                        }
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
                routes: [{ name: 'LoginScreen' }], // Ensure this matches the name in your navigator
            });
            console.log('User has logged out.');
        } catch (error) {
        // An error happened.
            console.error("Logout Error:", error);
            Alert.alert("Error", "There was an error logging out. Please try again.");
        }
    };

    const handleNameProfile = async () => {
        try {
            if (!authUser) return;

            // Update Firebase Auth displayName
            await updateProfile(auth.currentUser, { displayName: newName });
            console.log("Firebase Auth displayName updated:", auth.currentUser.displayName);
    
            // Reference to the Firestore document
            const userRef = doc(db, "users", authUser.uid);
            // Update Firestore and merge data
            await setDoc(userRef, { name: newName }, { merge: true });
            console.log("Firestore profile updated or created.");
    
            // Update user context directly
            setUser(prevUser => prevUser ? {...prevUser, name: newName} : null);
            
            // Update AsyncStorage
            await AsyncStorage.setItem('userName' + authUser.uid, newName);
    
            alert('Profile Updated Successfully');
            setIsEditing(false); // Set editing to false here to switch back to non-edit mode
    
        } catch (error) {
            console.error("Error updating name:", error);
            Alert.alert("Error", "Failed to update name");
        }
    };

    const toggleEdit = () => {
        setIsEditing(!isEditing);
    };

    const uploadImageAsync = async (uri: string): Promise<string | null> => {
        if (!uri) return null;
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("No user is currently logged in.");
            return null;
        }
        try {
            setLoading(true); // Start loading
            // Correct the URI for Android file path
            const newImageUri = uri.startsWith('file://') ? uri : `file://${uri.split("file:/").join("")}`;

            const blob = await (await fetch(newImageUri)).blob();
            const storagePath = `profilePictures/${auth.currentUser.uid}`;
            const ref = storageRef(storage, storagePath);

            console.log('Uploading to:', ref.fullPath);  // Ensure path is correct

            const snapshot = await uploadBytes(ref, blob, {
                contentType: mime.getType(newImageUri) || 'application/octet-stream'  // Use mime to get the correct type
            });

            const downloadURL = await getDownloadURL(snapshot.ref);

            // Update the user's profile photoURL with the new image
            updateProfile(auth.currentUser, { photoURL: downloadURL });

            console.log('File available at', downloadURL);

            return downloadURL;
        } catch (error) {
            console.error("Error uploading image: ", error);
            throw new Error("Failed to upload image.");
        } finally {
            setLoading(false); // Stop loading
        }
    };

    const pickImageProfile = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
            });
    
            console.log("ImagePicker Result:", JSON.stringify(result));
    
            if (!result.canceled && result.assets && result.assets[0].uri) {
                console.log("Image URI:", result.assets[0].uri);

                if (!auth.currentUser) {
                    console.error("No user logged in.");
                    Alert.alert("Login Required", "Please log in to upload images.");
                    return;
                }

                const uploadUrl = await uploadImageAsync(result.assets[0].uri);

                if (!uploadUrl) {
                    console.error("Failed to upload image");
                    return;
                }

                // Update both Auth and Firestore with the new profile picture
                await updateProfile(auth.currentUser, { photoURL: uploadUrl });
    
                const userRef = doc(db, "users", auth.currentUser.uid);
                await updateDoc(userRef, { avatar: uploadUrl });  // Update Firestore

                console.log("Image uploaded and URL received:", uploadUrl);

                setProfilePic(uploadUrl); // Update the state and the user context
                setUser(prevUser => prevUser ? { ...prevUser, avatar: uploadUrl } : null ); // Update the user context
            }
        } catch (error) {
            console.error("Failed to pick or upload image: ", error);
            Alert.alert("Upload Error", "Failed to upload image. Please try again.");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{i18n.t('profileTitle')}</Text>
            <TouchableOpacity onPress={pickImageProfile}>
            <Avatar key={profilePic} name={newName} imageUri={profilePic} size={150}/>
            </TouchableOpacity>
            {loading && <ActivityIndicator size="large" color="#0000ff" />} 
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
                <Button title={i18n.t('updateProfileButton')} onPress={handleNameProfile} />
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