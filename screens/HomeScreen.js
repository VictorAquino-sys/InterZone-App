import React, { useContext, useEffect, useState } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Text, Image, TouchableOpacity, Button, Alert, FlatList } from 'react-native';
// import { auth } from '../screens/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostsContext } from '../src/contexts/PostsContext';
import { v4 as uuidv4 } from 'uuid'; // Import UUID library to generate unique keys
import * as Location from 'expo-location';
import { db } from '../src/config/firebase';
import { useUser } from '../src/contexts/UserContext';
import Avatar from '../src/components/Avatar';
import { addDoc, deleteDoc, collection, doc, getDocs, query, where, orderBy } from "firebase/firestore";
import i18n from '../src/i18n'; 

const HomeScreen = () => {
  const navigation = useNavigation();
  const { posts, setPosts } = useContext(PostsContext);
  const { user } = useUser();

  const [imageOpacity, setImageOpacity] = useState(1); // State to force refresh
  
  // variables for user's location
  const [location, setLocation] = useState(null);
  const [city, setCity] = useState(null); // To store the city name
  const [errorMsg, setErrorMsg] = useState(null);

  console.log("HomeScreen");

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
      console.log("Found city:", city); // Log to check what city was found
    } else {
      setCity('Location not found');
    }
  };
  
  const fetchPostsByCity = async (cityName) => {
    const postsRef = collection(db, "posts");
    console.log("Querying posts in city:", cityName);
    const q = query(postsRef, where("city", "==", cityName), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(), 
      timestamp: doc.data().timestamp 
    }));
    // Sort posts by timestamp in decending order
    // posts.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
    console.log("Fetched posts:", posts);
    setPosts(posts);
  };

  useFocusEffect(
    React.useCallback(() => {
      // Reset image opacity when the screen is focused
      setImageOpacity(1);
      if (!user.city) {
        fetchLocation(); // Refetch location when the screen is focused
      } else {
        console.log("User's name not set, awaiting completion of user setup.");
      }

      if (city) {
        console.log("Refetching posts since city is set:", city);
        fetchPostsByCity(city);
      } else {
        console.log("City is not yet set.");
      }
    }, [city])
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';  // Handle undefined or null timestamps
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();  // Format date as a string
  };

  const handleDeletePost = (postId) => {
    Alert.alert(
      i18n.t('confirmDeleteTitle'), // "Confirm Delete"
      i18n.t('confirmDeleteMessage'), // "Are you sure you want to delete this post?"
      [
        {
          text: i18n.t('cancel'),
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel"
        },
        {
          text: i18n.t('ok'),
          onPress: () => deletePost(postId)
        }
      ],
      { cancelable: false }
    );
  };

  const deletePost = async (postId) => {
    console.log("Attempting to delete post:", postId);
    await deleteDoc(doc(db, "posts", postId));
    try {
      console.log("User ID:", user.uid);

        // Success message
      Alert.alert(i18n.t('deleteSuccessTitle'), i18n.t('deleteSuccessMessage'));
      // Optionally remove the post from the local state to update UI instantly
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    } catch (error) {
      alert('Error deleting post: ', error.message);
      Alert.alert(i18n.t('deleteErrorTitle'), i18n.t('deleteErrorMessage', { error: error.message }));
    }
  };

  const renderItem = ({ item }) =>  {
    // Debugging user IDs
    console.log("Current user UID:", user.uid);
    console.log("Post creator UID:", item.user?.uid);
    if (!user) {
      // Optionally, return a placeholder or nothing if the user is null
      return null;
    }

    return (
      <View style={styles.postItem}>
        <View style={styles.userContainer}>
          <Avatar key={user.avatar} name={item.user?.name} imageUri={item.user?.avatar}/>
          <View style={styles.postDetails}>
            <Text style={styles.userName}>{item.user?.name || i18n.t('anonymous')}</Text>
            <Text style={styles.postCity}>{item.city || i18n.t('unknown')}</Text>
            <Text style={styles.postTimestamp}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>
            <Text style={styles.postText}>{item.content}</Text>
          {user.uid == item.user?.uid && (
            <TouchableOpacity onPress={() => handleDeletePost(item.id)} style={styles.deleteButton}>
              <Text style={styles.deleteText}>{i18n.t('deletePost')}</Text>
            </TouchableOpacity>
          )}
      </View>
    );
  };

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
        {user ? (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            style={{ flex: 1, width: '100%' }} // Ensuring FlatList also takes full width
          />
        ) : (
          <Text>{i18n.t('pleaseLogin')}</Text>
          )}
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
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row', // Ensure the header is a row for alignment
    alignItems: 'center',
    width: '100%', // Full width
    paddingHorizontal: 2, // Padding on the sides
    paddingBottom: 8,
    paddingTop: 24, // Padding on top
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
    padding: 8,
    borderTopWidth: 0.6,
    borderTopColor: 'pearl river',
    // borderBottomWidth: 0.6,
    // borderBottomColor: 'pearl river',
    width: '100%', // Ensure post items take full width
  },
  postText: {
    fontSize: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  postDetails: {
    marginLeft: 10,
    flexDirection: 'column',
  },
  userName: {
    fontWeight: 'bold',
  },
  postCity: {
    fontSize: 12,
    color: 'gray',
  },
  postTimestamp: {
    fontSize: 11,
    color: 'gray',
  },
  listContent: {
    width: '100%'
  },
  deleteButton: {
    paddingVertical: 5,  // Small vertical padding for easier tapping
    paddingHorizontal: 30, // Horizontal padding to ensure the touch area is just enough
    alignItems: 'flex-end' // Align to the start of the flex container
},
  deleteText: {
    color: 'red',
    fontSize: 12, // Ensure the font size is appropriate
  },
});