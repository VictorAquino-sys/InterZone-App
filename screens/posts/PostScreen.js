import React, { useContext, useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Button, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostsContext } from '../../src/contexts/PostsContext';
import { useUser } from '../../src/contexts/UserContext'; // Import useUser hook
// import { v4 as uuidv4 } from 'uuid';
import { db } from '../../src/config/firebase';
import { getAuth } from "firebase/auth";
import { Timestamp, collection, addDoc, doc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import i18n from '../../src/i18n'; 

const PostScreen = ({ navigation }) => {
  const auth = getAuth();
  const authUser = auth.currentUser;

  const [postText, setPostText] = useState('');
  const [charCount, setCharCount] = useState(0); 
  const [location, setLocation] = useState(null);
  const { setPosts } = useContext(PostsContext);
  const { user, setUser } = useUser(); // Use the useUser hook
  const storage = getStorage();

  console.log("PostScreen");

  const uploadImageToStorage = async (uri, userId) => {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const imageRef = ref(storage, `profileImages/${userId}-${Date.now()}.jpg`);
        await uploadBytes(imageRef, blob);
        return await getDownloadURL(imageRef);
    } catch (error) {
        console.error("Error uploading image:", error);
        return null;
    }
  };

  // Pick Image Function
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
        const uri = result.assets[0].uri;
        const uploadedImageUrl = await uploadImageToStorage(uri, auth.currentUser.uid);
        if (uploadedImageUrl) {
            setProfilePic(uploadedImageUrl);
            setUser({ ...user, avatar: uploadedImageUrl });
        }
    } else {
        console.log('Image picker was canceled or no image was selected');
    }
  };

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (authUser) {
        const userRef = doc(db, "users", authUser.uid); // Fetch from "users"
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUser({
            uid: authUser.uid,
            name: userData.displayName || "Default Name",
            avatar: userData.photoURL || "",
          });
        }
      }
    };

    fetchUserData();
  }, [authUser]);

  const handleAddImage = async () => {
    await pickImage(); // allow the user to pick an image
    Alert.alert(i18n.t('imageAddedMessage'));
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

    try {
      // Fetch the latest user data from Firestore
      const userRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userRef);

      let latestUserData = { name: user?.name, avatar: user?.avatar };
      if (userSnap.exists()) {
          latestUserData = userSnap.data();
      }

      // Create post with latest user data
      const postData = {
        city: location,
        content: postText,
        timestamp: Timestamp.fromDate(new Date()),
        imageUrl: latestUserData.avatar || "", // Use updated avatar
        user: {
          uid: authUser.uid,
          name: latestUserData.name || "Anonymous", // Use updated name
          avatar: latestUserData.avatar || "", 
        }
      };

      const docRef = await addDoc(collection(db, "posts"), postData);
      // console.log("Post created with ID:", docRef.id);

      setPosts(prevPosts => [{ id: docRef.id, ...postData }, ...prevPosts]);

      navigation.goBack();
      setPostText(''); // Clear the input field
      setLocation(null);
    } catch (e) {
      console.error("Error adding post: ", e);
      Alert.alert("Error adding post:", e.message || "Unknown error");
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        multiline
        placeholder={i18n.t('postPlaceholder')}
        maxLength={200}
        style={{ height: 200, padding: 10, backgroundColor: 'white' }}
        value={postText}
        onChangeText={(text) => {
          setPostText(text);
          setCharCount(text.length); // Update character count as user types
        }}
      />
      <Text style={styles.charCount}>
        {charCount} / 200
      </Text>
      <View style={styles.iconsContainer}>
        <TouchableOpacity onPress={handleAddImage}>
            <Ionicons name="image-outline" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAddLocation}>
            <Ionicons name="location-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>
      <Button
        title={i18n.t('doneButton')}
        onPress={handleDone}
      />
    </View>
  );
};

export default PostScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    fontSize: 18,
    flex: 1,
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
});