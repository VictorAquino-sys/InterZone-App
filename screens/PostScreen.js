import React, { useContext, useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Button, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostsContext } from './PostsContext';
import { useUser } from './UserContext'; // Import useUser hook
import { v4 as uuidv4 } from 'uuid';
import { db } from './firebase';
import { Timestamp } from "firebase/firestore";
import { collection, addDoc } from "firebase/firestore";

const PostScreen = ({ navigation }) => {
  const [postText, setPostText] = useState('');
  const [location, setLocation] = useState(null);
  const { setPosts } = useContext(PostsContext);
  const { user, setUser } = useUser(); // Use the useUser hook

  // Optionally refresh user data when screen is focused
  // useEffect(() => {
  //   const refreshUserData = async () => {
  //       const storedName = await AsyncStorage.getItem('userName');
  //       if (storedName && storedName !== user.name) {
  //           setUser(prev => ({ ...prev, name: storedName }));
  //       }
  //   };

  //   refreshUserData();
  // }, [setUser]);

  const handleAddLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Permission Denied', 'Please enable location permissions in your settings.');
      return;
    }

    let currentLocation = await Location.getCurrentPositionAsync({});
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

    Alert.alert('Location Added', `Your location has been attached to your current message.`);
  };

  const handleDone = async () => {
    console.log("Current user in post:", user);
    if (!postText.trim()) {
      Alert.alert("Empty Post", "Please enter some text before posting.");
      return;
    }

    if (!location) {
      Alert.alert("Location Required", "Please click in the location icon to include your current city.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "posts"), {
        text: postText,
        location: location,
        user: {
          name: user.name,
          avatar: user.avatar
        },
        timestamp: Timestamp.fromDate(new Date())
      });

      const newPost = {
        id: docRef.id,
        text: postText,
        location: location,
        timestamp: new Date().toISOString(),
        user: {
          name: user.name,
          avatar: user.avatar
        }
      };
      setPosts(prevPosts => [newPost, ...prevPosts]);
      Alert.alert("Success", `Post created with ID: ${docRef.id}`);
      navigation.navigate('Home');
      setPostText(''); // Clear the input field
      setLocation(null);
    } catch (e) {
      console.error("Error adding post: ", e);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        multiline
        placeholder="What's on your mind, neighbor?"
        style={{ height: 200, padding: 10, backgroundColor: 'white' }}
        value={postText}
        onChangeText={setPostText}
      />
      <View style={styles.iconsContainer}>
        <TouchableOpacity onPress={() => {}}>
            <Ionicons name="image-outline" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAddLocation}>
            <Ionicons name="location-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>
      <Button
        title="Done"
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