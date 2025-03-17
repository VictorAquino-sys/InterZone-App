import React, { useContext, useState, useEffect } from 'react';
import { ScrollView, KeyboardAvoidingView, View, TextInput, TouchableOpacity, Text, StyleSheet, Button, Alert, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostsContext } from '../../src/contexts/PostsContext';
import { useUser } from '../../src/contexts/UserContext'; // Import useUser hook
import { db } from '../../src/config/firebase';
import { getAuth } from "firebase/auth";
import { Timestamp, collection, addDoc, doc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import i18n from '../../src/i18n'; 
import mime from 'mime';

const PostScreen = ({ navigation }) => {
  const auth = getAuth();
  const authUser = auth.currentUser;

  const [postText, setPostText] = useState('');
  const [charCount, setCharCount] = useState(0); 
  const [location, setLocation] = useState(null);
  const [imageUri, setImageUri] = useState(null); // Store post image URI
  const [uploading, setUploading] = useState(false);  // Track image upload status
  const { setPosts } = useContext(PostsContext);
  const { user, setUser } = useUser(); // Use the useUser hook
  const storage = getStorage();

  console.log("PostScreen");

  // Upload image to Firebase Stora and return the download URL
  const uploadImageToStorage = async (uri) => {
    if (!uri) return null;

    try {
        setUploading(true);
        const response = await fetch(uri);
        const blob = await response.blob();

        // Extract the file extension and set MIME type
        const fileExtension = uri.split('.').pop();
        const mimeType = mime.getType(fileExtension) || 'application/octet-stream'; // Fallback to binary if unknown

        const imageName = `postImages/${authUser.uid}/${Date.now()}.${fileExtension}`;
        const imageRef = ref(storage, imageName);

        await uploadBytes(imageRef, blob, { contentType: mimeType });

        const downloadUrl = await getDownloadURL(imageRef);
        console.log("Image uploaded successfully:", downloadUrl);

        return downloadUrl;
    } catch (error) {
        console.error("Error uploading image:", error);
        Alert.alert("Upload Error", error.message);
        return null;
    } finally {
        setUploading(false);
    }
  };

  // Pick an image for the post
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Sorry, we need camera roll permissions to make this work!');
        return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri); // Store selected image URI
    } else {
      console.log('Image picker was canceled or no image was selected');
    }
  };

  const handleAddLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Permission Denied', 'Please enable location permissions in your settings.');
      return;
    }

    let currentLocation = await Location.getCurrentPositionAsync({});
    console.log("Location fetched:", currentLocation);  // Log fetched location
    const coords = currentLocation.coords; // Properly define coords

    setLocation(coords); // Save coordinates directly

    const reverseGeocode = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude
    });

    if (reverseGeocode.length > 0 && reverseGeocode[0].city) {
      setLocation(reverseGeocode[0].city); // Set city name if available
    } else {
      setLocation(`${currentLocation.coords.latitude}, ${currentLocation.coords.longitude}`);
    }

    Alert.alert(i18n.t('locationAddedTitle'), i18n.t('locationAddedMessage'));
  };

  // Handle Creating a Post
  const handleDone = async () => {
    if (!authUser || !authUser.uid) {
      Alert.alert("Authentication Error", "You must be logged in to post.");
      return;
    }

    if (!postText.trim()) {
      Alert.alert(i18n.t('emptyPostTitle'), i18n.t('emptyPostMessage'));
      return;
    }

    if (!location) {
      Alert.alert(i18n.t('locationRequiredTitle'), i18n.t('locationRequiredMessage'));
      return;
    }

    setUploading(true);

    try {
      // Fetch the latest user data from Firestore
      const userRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userRef);

      let latestUserData = { name: user?.name, avatar: user?.avatar };
      
      if (userSnap.exists()) {
          latestUserData = userSnap.data();
      }

      // Upload image if provided
      let imageUrl = "";
      if (imageUri) {
        console.log("Uploading image...");
        imageUrl = await uploadImageToStorage(imageUri);
        if (!imageUrl) {
          Alert.alert("Upload Failed", "Could not upload image. Try again.");
          return;
        }
      }

      console.log("Image URL to be stored in Firestore:", imageUrl);

      // Create post with latest user data
      const postData = {
        city: location,
        content: postText,
        timestamp: Timestamp.fromDate(new Date()),
        imageUrl: imageUrl || "", // Attach uploaded image URL
        user: {
          uid: authUser.uid,
          name: latestUserData.name || "Anonymous", // Use updated name
          avatar: latestUserData.avatar || "", 
        }
      };

      // Add post to Firestore
      const docRef = await addDoc(collection(db, "posts"), postData);
      console.log("Post added successfully with ID:", docRef.id);

      // Update local state
      setPosts(prevPosts => [{ id: docRef.id, ...postData }, ...prevPosts]);

      // Reset UI state
      navigation.goBack();
      setPostText(''); // Clear the input field
      setLocation(null);
      setImageUri(null);
    } catch (e) {
      console.error("Error adding post: ", e);
      Alert.alert("Error adding post:", e.message || "Unknown error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          <TextInput
            multiline
            placeholder={i18n.t('postPlaceholder')}
            maxLength={200}
            style={{height: 300}}
            value={postText}
            onChangeText={(text) => {
              setPostText(text);
              setCharCount(text.length); // Update character count as user types
            }}
          />
          <Text style={styles.charCount}>
            {charCount} / 200
          </Text>

          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          )}

          <View style={styles.iconsContainer}>
            <TouchableOpacity onPress={pickImage}>
                <Ionicons name="image-outline" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddLocation}>
                <Ionicons name="location-outline" size={24} color="black" />
            </TouchableOpacity>
          </View>

          <Button title={uploading ? "Uploading..." : i18n.t('doneButton')} onPress={handleDone} disabled={uploading} />
        </View>
    </ScrollView>
  </KeyboardAvoidingView>
  );
};

export default PostScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 100,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    textAlign: 'right',
    marginRight: 10, // Adjust as needed
    color: '#666'
  },
  postButton: {
    backgroundColor: '#b2ff59',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  postButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  textInput: {
    flex: 1,
    marginTop: 50,
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    fontSize: 18,
    textAlignVertical: 'top',
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  createOptions: {
    marginTop: 20,
  },
  createOptionButton: {
    backgroundColor: '#f1f1f1',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  createOptionText: {
    fontSize: 16,
  },
  imagePreview: { 
    width: '100%', 
    height: 200, 
    resizeMode: 'cover', 
    marginTop: 10 }
});