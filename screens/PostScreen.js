import React, { useContext, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Button, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as Location from 'expo-location';
import { PostsContext } from './PostsContext';
import { useUser } from './UserContext'; // Import useUser hook
import { v4 as uuidv4 } from 'uuid';

const PostScreen = ({ navigation }) => {
  const [postText, setPostText] = useState('');
  const [location, setLocation] = useState(null);
  const { setPosts } = useContext(PostsContext);
  const { user } = useUser(); // Use the useUser hook

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
    
    // Prepare location text
    let postLocation = location ? location : 'Unknown Location';  
    const newPost = { 
      id: uuidv4(), 
      text: postText,
      location: postLocation,
      timestamp: new Date().toISOString(),
      user: {
        name: user.name,
        avatar: user.avatar
      }
    };

    setPosts((prevPosts) => [newPost, ...prevPosts]);
    navigation.navigate('BottomTabs', { screen: 'Home'});
    setPostText(''); // Clear the input field
    setLocation(null);
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