import React, { useContext, useEffect, useState } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Text, Image, TouchableOpacity, Button, FlatList } from 'react-native';
// import { auth } from '../screens/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostsContext } from './PostsContext';
import { v4 as uuidv4 } from 'uuid'; // Import UUID library to generate unique keys
import * as Location from 'expo-location';
import { db } from './firebase';
import { useUser } from './UserContext';
import { collection, getDocs, query, where } from "firebase/firestore";

const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { posts, setPosts } = useContext(PostsContext);
  const { user } = useUser();

  const [imageOpacity, setImageOpacity] = useState(1); // State to force refresh
  
  // variables for user's location
  const [location, setLocation] = useState(null);
  const [city, setCity] = useState(null); // To store the city name
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('permission to access location was denied');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setLocation(location);

    const reverseGeocode = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });

    if (reverseGeocode && reverseGeocode.length > 0 && reverseGeocode[0].city) {
      // Assuming the first result is the most relevant
      setCity(reverseGeocode[0].city || "Unknown"); // Set the city from reverse geocode
    } else {
      setCity('Location not found');
      console.log("City set to:", foundCity);
    }
  };
  
  const fetchPostsByCity = async (cityName) => {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, where("location", "==", cityName));
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp }));
    console.log("Fetched posts:", posts);
    setPosts(posts);
  };

  useFocusEffect(
    React.useCallback(() => {
      // Reset image opacity when the screen is focused
      setImageOpacity(1);
      fetchLocation(); // Refetch location when the screen is focused
      if (city) {
        fetchPostsByCity(city);
      }
    }, [city])
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';  // Handle undefined or null timestamps
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();  // Format date as a string
  };

  const renderItem = ({ item }) => (
    <View style={styles.postItem}>
      <Image source={{ uri: item.user?.avatar || 'default_avatar.png' }} style={styles.avatar} />
      <View style={styles.postDetails}>
        <Text style={styles.userName}>{item.user?.name || 'Anonymous'}</Text>
        <Text style={styles.postText}>{item.text}</Text>
        <Text style={styles.postCity}>Posted from: {item.location || 'Unknown'}</Text>
        <Text style={styles.postTimestamp}>Posted on: {formatDate(item.timestamp)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.profilePicContainer} 
          onPress={() => {
            navigation.navigate('Profile');
          }}
          activeOpacity={0.5} // Manage active opacity here
        >
          <Image 
            source={require('../assets/unknownuser.png')} 
            style={[styles.profilePic, {opacity: imageOpacity}]} // Apply dynamic opacity
          />
        </TouchableOpacity>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        style={{ flex: 1, width: '100%' }} // Ensuring FlatList also takes full width
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch', // Align children to the start horizontally
    justifyContent: 'flex-start', // Align children to the start vertically
    width: '100%', // Ensure container takes full width
  },
  header: {
    flexDirection: 'row', // Ensure the header is a row for alignment
    alignItems: 'center',
    width: '100%', // Full width
    paddingHorizontal: 14, // Padding on the sides
    paddingTop: 28, // Padding on top
  },
  profilePicContainer: {
    height: 60,
    width: 60,
    borderRadius: 25,
    overflow: 'hidden',
  },
  profilePic: {
    height: '100%',
    width: '100%',
  },
  postItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%', // Ensure post items take full width
  },
  postDetails: {
    flex: 1,
    marginLeft: 10,
  },
  postText: {
    fontSize: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userName: {
    fontWeight: 'bold',
  },
  postCity: {
    fontSize: 14,
    color: 'gray'
  },
  postTimestamp: {
    fontSize: 12,
    color: 'gray',
    marginTop: 4
  },
  listContent: {
    // alignItems: 'center', 
    width: '100%'
  },
});