import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Platform, SafeAreaView, StyleSheet, View, Text, Image, TouchableOpacity, Button, TextInput, FlatList, Modal, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostsContext } from '../src/contexts/PostsContext';
import * as Location from 'expo-location';
import { db } from '../src/config/firebase';
import { useUser } from '../src/contexts/UserContext';
import Avatar from '../src/components/Avatar';
import LikeButton from '../src/components/LikeButton';
import { Alert } from 'react-native';
import { addDoc, deleteDoc, collection, doc, getDocs, getDoc, query, where, orderBy } from "firebase/firestore";
import {ref as storageRef, deleteObject, getStorage } from 'firebase/storage';
import i18n from '../src/i18n'; 

const HomeScreen = () => {
  const navigation = useNavigation();
  const { posts, setPosts } = useContext(PostsContext);
  const { user, setUser } = useUser();
  const storage = getStorage();

  // Modal state inside the component
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState('../assets/unknownuser.png');
  const defaultProfileImg = require('../assets/unknownuser.png');

  const [imageOpacity, setImageOpacity] = useState(1); // State to force refresh

  // Search Bar State
  const [searchText, setSearchText] = useState('');
  const categories = [
    { key: 'events', label: i18n.t('categories.events') },
    { key: 'restaurants', label: i18n.t('categories.restaurants')},
    { key: 'music', label: i18n.t('categories.music')},
    { key: 'news', label: i18n.t('categories.news')},
    { key: 'study hub', label: i18n.t('categories.studyhub')},
    { key: 'petpals', label: i18n.t('categories.petpals')},
    { key: 'deals', label: i18n.t('categories.deals')}
  ];
  // State to show the funny message
  const [funnyMessage, setFunnyMessage] = useState('');
  
  // variables for user's location
  const [isFetching, setIsFetching] = useState(false);
  const [city, setCity] = useState(null); // To store the city name
  const [loading, setLoading] = useState(true); // Loading state for better UX
  const prevCityRef = useRef(null);

  console.log("HomeScreen");

  useEffect(() => {
    const checkUserName = async () => {

        try {
          if (!user?.uid) return;
            console.log("Checking if user has a name...");

            // First, check Firestore for the user name
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists() && userSnap.data().name) {
                console.log("User has a name:", userSnap.data().name);
                return; // Stop execution, no need to navigate
            }

            // Second, check AsyncStorage
            const storedName = await AsyncStorage.getItem('userName' + user.uid);
            if (storedName) {
                console.log("Name found in AsyncStorage:", storedName);
                return; // Stop execution, no need to navigate
            }

            // If no name is found, navigate to NameInputScreen
            console.log("No name found, redirecting to NameInputScreen...");
            navigation.replace('NameInputScreen', { userId: user.uid });

        } catch (error) {
            console.error("Error checking user name:", error);
        }
    };

    checkUserName();
  }, [user?.uid]); // Only runs when `user` changes

  const fetchLocation = async () => {
    try {
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        alert('Please enable your location services.');
        return;
      }
  
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
  
      let location = await Location.getCurrentPositionAsync({ timeout: 5000 });
  
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
  
      console.log("Reverse Geocode Result:", JSON.stringify(reverseGeocode));
      if (reverseGeocode && reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        if (address.city) {
          console.log("Found city:", address.city); // Log to check what city was found
          setCity(address.city); // Set the city from reverse geocode
        } else if (address.region) {
          console.log("City not found. Using region:", address.region);
          setCity(address.region || "Unknown");
        }
      } else {
        console.log("No address found.");
        setCity("Unknown");
      }
    } catch (error) {
      console.error("Error fetching location:", error);
      alert("Failed to fetch location. Please try again.");
    }
  };  
  
  const fetchPostsByCity = async (cityName) => {
    if (!cityName) return; //Prevent running if city isn't set

    try {
      console.log("Fetching posts for city:", cityName);
      const postsRef = collection(db, "posts");
      const q = query(postsRef, where("city", "==", cityName), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);

      const postsData = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        timestamp: doc.data().timestamp 
      }));

      console.log("Fetched posts:", JSON.stringify(postsData, null, 2)); // Log all posts including imageUrl

      setPosts(postsData);
      console.log("Fetched posts:", postsData);
      console.log("Fetched posts image URLs:", postsData.map(post => post.imageUrl));  // This will log all image URLs
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false); // Stop loading once data is fetched
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      // Reset image opacity when the screen is focused
      setImageOpacity(1);

      // Fetch latest user data
      const fetchUserData = async () => {
        try {
            if (user?.uid) {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    console.log("Fetched updated user:", userData);
                    setUser((prevUser) => ({
                        ...prevUser,
                        name: userData.name,
                        avatar: userData.avatar
                    }));
                    setProfileImageUrl(userData.avatar || Image.resolveAssetSource(defaultProfileImg).uri); // Set the profile image URL from the user data
                }
            }
        } catch (error) {
            console.error("Error fetching updated user data:", error);
        }
      };

      fetchUserData(); // Fetch latest user name

          // Fetch location only if not already fetching
      if (!isFetching) {
        console.log("Fetching user location...");
        fetchLocation();
      }

      // Fetch posts when city is available & changed
      if (city && city !== prevCityRef.current) {
        console.log("Fetching posts for city:", city);
        setIsFetching(true);
        fetchPostsByCity(city).finally(() => setIsFetching(false));
        prevCityRef.current = city;
      }

    }, [city, user?.uid])
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';  // Handle undefined or null timestamps
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();  // Format date as a string
  };

  const handleDeletePost = (postId, imageUrl) => {
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
          onPress: () => deletePost(postId, imageUrl)
        }
      ],
      { cancelable: false }
    );
  };

  const deletePost = async (postId, imageUrl) => {
    if (imageUrl) {
      // Create a reference to the file to delete
      const imageRef = storageRef(storage, imageUrl);

      // Delete the file
      deleteObject(imageRef)
          .then(() => {
              console.log('Image successfully deleted!');
          }).catch((error) => {
              console.error('Error removing image: ', error);
          });
    }

    console.log("Attempting to delete post:", postId);
      // Check if there is an image URL to delete
      if (imageUrl) {
        const imageRef = storageRef(storage, imageUrl);

        // Delete the file
        deleteObject(imageRef)
            .then(() => {
                console.log('Image successfully deleted!');
            })
            .catch((error) => {
              if (error.code === 'storage/object-not-found') {
                  console.log('No image found, nothing to delete.');
              } else {
                  console.error('Error removing image: ', error);
              }
            });
      }

      // Proceed to delete the post document from Firestore regardless of the image deletion
      try {
          await deleteDoc(doc(db, "posts", postId));
          console.log('Post successfully deleted!');
          Alert.alert(i18n.t('deleteSuccessTitle'), i18n.t('deleteSuccessMessage'));
          // Remove the post from the local state to update UI instantly
          setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      } catch (error) {
          console.error('Error deleting post: ', error);
          Alert.alert(i18n.t('deleteErrorTitle'), i18n.t('deleteErrorMessage', { error: error.message }));
      }
  };

  // Function to handle opening the modal
  const openImageModal = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
    setModalVisible(true);
  };

  // Function to handle closing the modal
  const closeImageModal = () => {
    setModalVisible(false);
  };

  // Filter categories based on search input
  const filteredCategories = categories.filter(category =>
    category.label.toLowerCase().includes(searchText.toLowerCase())
  );

  // Navigate to Category Screen
  const handleCategorySelect = (category) => {
    navigation.navigate('CategoryScreen', { category });
  };

  // Handle category click
  const handleCategoryClick = (category) => {
    setFunnyMessage(i18n.t('funnyMessage'));

    // Remove the message after 3 seconds
    setTimeout(() => {
      setFunnyMessage('');
    }, 3000);
  };

  const renderItem = ({ item }) =>  {

    if (!user) {
      // Optionally, return a placeholder or nothing if the user is null
      return null;
    }

    return (
      <View style={styles.postItem}>
        <View style={styles.userContainer}>
          {/* Clickable Avatar */}
          <TouchableOpacity onPress={() => openImageModal(item.user?.avatar)}>
            <Avatar key={item.id} name={item.user?.name} imageUri={item.user?.avatar}/>
          </TouchableOpacity>
          <View style={styles.postDetails}>
            <Text style={styles.userName}>{item.user?.name || i18n.t('anonymous')}</Text>
            <Text style={styles.postCity}>{item.city || i18n.t('unknown')}</Text>
            <Text style={styles.postTimestamp}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>

        <Text style={styles.postText}>{item.content}</Text>

        {/* Display Image if Available */}
        {item.imageUrl && (
          <TouchableOpacity onPress={() => openImageModal(item.imageUrl)}>
            <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
          </TouchableOpacity>
        )}

        {/* Like Button Component */}
        <LikeButton postId={item.id} userId={user.uid} />

        {/* Allow users to delete their own posts */}
        {user?.uid == item.user?.uid && (
          <TouchableOpacity onPress={() => handleDeletePost(item.id, item.imageUrl)} style={styles.deleteButton}>
            <Text style={styles.deleteText}>{i18n.t('deletePost')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      <View style={styles.container}>
      {/* Top Bar with Profile Icon and Search Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.profilePicContainer} 
            onPress={() => {
              navigation.navigate('Profile');
            }}
            activeOpacity={0.5} // Manage active opacity here
          >
            <Image 
                source={{ uri: profileImageUrl }}
                style={[styles.profilePic, {opacity: imageOpacity}]} // Apply dynamic opacity
            />
          </TouchableOpacity>
          
          {/* Search Bar */}
          <TextInput
            style={styles.searchBar}
            placeholder={i18n.t('searchPlaceholder')}
            placeholderTextColor="#888"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Loading posts...</Text>
        ) : !user ? (
          <Text style={styles.noUserText}>{i18n.t('pleaseLogin')}</Text>
        ) : posts.length === 0 ? (
          <View style={styles.noPostsContainer}>
            <Text style={styles.noPostsText}>{i18n.t('noPosts')}</Text>
          </View>
        ) : (
          /* Scrollable Content (Categories + Funny Message + Posts) */
          <FlatList
            ListHeaderComponent={
              <View>
                  {/* Categories (Now Scrollable) */}
                  <View style={styles.categoriesContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {filteredCategories.map((item) => (
                              <TouchableOpacity key={item.key} style={styles.categoryItem} onPress={() => handleCategoryClick(item.key)}>
                                  <Text style={styles.categoryText}>{item.label}</Text>
                              </TouchableOpacity>
                          ))}
                      </ScrollView>
                  </View>

                  {/* Display Funny Message (if exists) */}
                  {funnyMessage ? <Text style={styles.funnyMessage}>{funnyMessage}</Text> : null}
              </View>
            }
            data={posts}
            keyExtractor={(item) => `${item.id}_${item.likedBy?.includes(user?.uid)}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            style={{ flex: 1, width: '100%' }} // Ensuring FlatList also takes full width
          />
        )}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeImageModal}
        >
          <TouchableOpacity style={styles.fullScreenModal} onPress={closeImageModal}>
            <Image style={styles.fullScreenImage} source={{ uri: selectedImageUrl }} />
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white' // or any other background color you want
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    color: "gray",
  },
  noUserText: {
    fontSize: 16,
    textAlign: "center",
    color: "gray",
    marginTop: 30,
  },
  deleteButton: {
    paddingVertical: 5,
    paddingHorizontal: 15,
    alignItems: 'flex-end'
  },
  noPostsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noPostsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  deleteText: {
    color: 'red',
    fontSize: 12,
  },  
  container: {
    // marginTop: 20,
    flex: 1,
    backgroundColor: '#fff',
    // paddingTop: 16,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 5 : 10, // Increase padding for iOS
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomColor: '#ddd',
  },
  profilePicContainer: {
    height: 40,
    width: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    height: 40,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',  // Light gray border
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    borderRadius: 20,
    shadowRadius: 4,
    paddingHorizontal: 16,
    elevation: 2, // Shadow effect for Android
    marginRight: 20,  // Adjust the right spacing
    marginLeft: 10,
    fontSize: 14,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginTop: 5,
    marginLeft: 8,
    marginBottom: 5,
    alignItems: 'center',
  },
  categoryItem: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingLeft: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  funnyMessage: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
    backgroundColor: '#fffae6',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  profilePic: {
    height: '100%',
    width: '100%',
    resizeMode: 'cover', // Ensures the image covers the space without stretching
  },
  postItem: {
    padding: 8,
    borderTopWidth: 0.5,
    // borderTopWidth: 0.6,
    borderTopColor: 'pearl river',
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
  postImage: {
    width: '100%', 
    height: 200, 
    resizeMode: 'cover', 
    marginTop: 10
  },
  fullScreenModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)'
  },
  fullScreenImage: {
    width: '90%',
    height: '90%',
    resizeMode: 'contain'
  }
});