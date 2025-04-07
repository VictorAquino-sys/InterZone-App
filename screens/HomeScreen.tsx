import React, { useContext, useEffect, useRef, useState, FunctionComponent } from 'react';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { StyleSheet, ActivityIndicator, View, Text, TouchableOpacity, Button, TextInput, FlatList, Modal, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
// import defaultProfileImg from '../assets/unknownuser.png';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, usePosts } from '../src/contexts/PostsContext';
import * as Location from 'expo-location';
import { db } from '../src/config/firebase';
import { useUser } from '../src/contexts/UserContext';
import Avatar from '../src/components/Avatar';
import LikeButton from '../src/components/LikeButton';
import { deleteDoc, collection, doc, getDocs, getDoc, updateDoc, query, where, orderBy } from "firebase/firestore";
import {ref as storageRef, getDownloadURL ,deleteObject, getStorage } from 'firebase/storage';
import { categories, getCategoryByKey } from '../src/config/categoryData';
import { checkLocation } from '../src/utils/locationUtils';
import i18n from '../src/i18n'; 
import { RootStackParamList } from '../src/navigationTypes';
import { Accuracy } from 'expo-location';
import { Timestamp, setDoc } from 'firebase/firestore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'HomeScreen'>;

const HomeScreen: FunctionComponent<HomeScreenProps> = ({ navigation }) => {
  const { posts, setPosts } = usePosts();
  const { user, setUser } = useUser();
  const storage = getStorage();

  // Modal state inside the component
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  // const defaultUri = Asset.fromModule(defaultProfileImg).uri;

  const [imageOpacity, setImageOpacity] = useState<number>(1); // State to force refresh

  // Search Bar State
  const [searchText, setSearchText] = useState<string>('');

  // variables for user's location
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [city, setCity] = useState<string | null>(null); // To store the city name
  const [loading, setLoading] = useState<boolean>(true); // Loading state for better UX
  const prevCityRef = useRef<string | null>(null);

  console.log("HomeScreen");

  useEffect(() => {
    async function handleCityOrUserChange() {
      if (!user?.uid || !city) {
        setLoading(false);
        return;
      }

      try {
        // if (!user?.uid || !city) return;
  
        console.log("User UID or City changed, handling updates...");
  
        // Check user name
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
  
        if (!(userSnap.exists() && userSnap.data().name)) {
          const storedName = await AsyncStorage.getItem('userName' + user.uid);
          if (!storedName) {
            console.log("Redirecting to NameInputScreen...");
            navigation.replace('NameInputScreen', { userId: user.uid });
            return;
          }
        }
  
        // Fetch posts if city has changed
        if (city !== prevCityRef.current) {
          console.log("✅ City updated:", city, "Fetching posts now...");
          // setLoading(true);
          await fetchPostsByCity(city);
          prevCityRef.current = city;
        }
      } catch (error) {
        console.error("Error handling updates:", error);
        setLoading(false);
      } finally {
        setLoading(false); // Always called explicitly here
      }
    }
  
    handleCityOrUserChange();
  }, [user?.uid, city]);

  useFocusEffect(
    React.useCallback(() => {
      const fetchLatestPosts = async () => {
        if (city) {
          setLoading(true);
          console.log("🔄 Fetching latest posts on screen focus for city:", city);
          await fetchPostsByCity(city);
          setLoading(false);
        }
      };
  
      fetchLatestPosts();
    }, [city])
  );

  const fetchLocation = async () => {
    console.log("🔍 Starting fetchLocation...");
    setLoading(true); // Explicitly reset loading at start

    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        alert('Please enable location services.');
        setLoading(false);
        return;
      }
  
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission denied.');
        setLoading(false);
        return;
      }
  
      const location = await Location.getCurrentPositionAsync({ accuracy: Accuracy.Balanced });
      console.log("✅ Location obtained:", location.coords);
  
      const matchedLocation = checkLocation(location.coords);
      console.log("Matched Location:", matchedLocation);
  
      let locationDisplay = matchedLocation;
      let country: string | null = null;

      const reverseGeocode = await Location.reverseGeocodeAsync(location.coords);
      console.log("Reverse Geocode:", reverseGeocode[0]);

      if (reverseGeocode?.length > 0) {
        const { city, region, isoCountryCode, country: countryName } = reverseGeocode[0];
        country = countryName || null;

        if (!matchedLocation) {
          if (isoCountryCode === 'US' && region) {
            const regionCode = region.toUpperCase().slice(0, 2);
            locationDisplay = city ? `${city}, ${regionCode}` : null;
          } else {
            locationDisplay = city && region ? `${city}, ${region}` : null;
          }
        }
      }
  
      if (locationDisplay) {
        console.log("✅ Setting city to:", locationDisplay);
        setCity(locationDisplay);
      } else {
        console.warn("⚠️ No valid city from location");
      }

      // 🔥 Update Firestore and User Context here
      if (user?.uid && (city || country)) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { country });

        setUser(prev => prev ? {
          ...prev,
          ...(country ? { country } : {})
        } : prev);

        console.log("📝 Updated user country in Firestore:", country);
      } else {
        console.warn("⚠️ No valid city from location");
        setLoading(false);
      }

    } catch (error) {
      console.error("🚨 Error in fetchLocation:", error);
    } finally {
      setLoading(false);
    }
  };
  
  
  const fetchPostsByCity = async (cityName: string): Promise<void> => {
    if (!cityName) return; //Prevent running if city isn't set

    try {
      // console.log("Fetching posts for city:", cityName);
      const postsRef = collection(db, "posts");
      const q = query(postsRef, where("city", "==", cityName), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);

      const postsData: Post[] = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        let avatarUrl = "";

        try {
          if (data.user.avatar) {
                      // Check if the URL is a Firebase Storage URL
            if (data.user.avatar.startsWith('https://firebasestorage.googleapis.com/')) {
              const avatarRef = storageRef(getStorage(), data.user.avatar);
              avatarUrl = await getDownloadURL(avatarRef);
            } else {
            // If it's a direct URL (like a Google profile image), use it as is
              avatarUrl = data.user.avatar;
            }
          }
        } catch (error) {
          console.error("Failed to load avatar:", error);
        }

        return {
          id: doc.id,
          city: data.city,
          content: data.content,
          timestamp: data.timestamp,
          imageUrl: data.imageUrl,
          user: {
            uid: data.user.uid,
            name: data.user.name,
            avatar: avatarUrl || "", // fallback to empty string
          },
          categoryKey: data.categoryKey
        };
      }));

      // console.log("Fetched posts:", JSON.stringify(postsData, null, 2)); // Log all posts including imageUrl
      setPosts(postsData);
      // console.log("Fetched posts:", postsData);
      // console.log("Fetched posts image URLs:", postsData.map(post => post.imageUrl));  // This will log all image URLs
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false); // Stop loading once data is fetched
    }
  };

  useEffect(() => {
    const initializeScreen = async () => {
      console.log("🚀 Initializing HomeScreen...");
      setLoading(true);
  
      if (user?.uid) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
  
        if (userSnap.exists()) {
          const userData = userSnap.data();
  
          setUser(prevUser => {
            const updated = prevUser ? {
              ...prevUser,
              name: userData.name || prevUser.name,
              avatar: userData.avatar || prevUser.avatar
            } : prevUser;

            console.log("👀 Updated user context:", updated);
            console.log("✅ Country preserved?", updated?.country);
            console.log("✅ Language preserved?", updated?.language);

            return updated;
          });

          console.log("📦 Firestore user data:", userData);
          setProfileImageUrl(userData.avatar);
        }
      } else {
        setLoading(false);  // Explicitly stop loading if no user
        return;
      }
  
      await fetchLocation();  // Explicitly call here and nowhere else
    };
  
    initializeScreen();
  }, [user?.uid]); // Depend explicitly on user.uid

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Unknown date'; // Handle undefined or null timestamps
    const date = new Date(timestamp.seconds * 1000); // Convert timestamp to Date object
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleDeletePost = (postId: string, imageUrl: string | null) => {
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

  const deletePost = async (postId: string, imageUrl:string | null) => {
    if (imageUrl) {
      const storage = getStorage(); // Make sure storage is initialized
      // Create a reference to the file to delete

      console.log("Attempting to delete post:", postId);
      // Check if there is an image URL to delete
      // if (imageUrl) {
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
        Alert.alert(i18n.t('deleteErrorTitle'), i18n.t('deleteErrorMessage'));
    }
  };

  // Function to handle opening the modal
  const openImageModal = (imageUrl: string | null) => {
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

  // Handle category click to navigate to dynamic screens based on category key
  const handleCategoryClick = (categoryKey: string) => {
    const category = getCategoryByKey(categoryKey);
    if(category) {
      navigation.navigate('CategoryScreen', { categoryKey: category.key, title: category.label});
    }
  };

  // useEffect(() => {
  //   console.log("Categories with Labels:", categories.map(cat => cat.label));
  // }, []);

  const renderItem = ({ item }: { item: Post }) =>  {
    // console.log("Post user avatar:", item.user.avatar);

    if (!user) {
      // Optionally, return a placeholder or nothing if the user is null
      return null;
    }
    
    const category = categories.find(cat => cat.key === item.categoryKey) || categories[0];

    return (
      <View style={styles.postItem}>
        <View style={styles.postHeader}>
          {/* <Image source={category.icon} style={styles.categoryIcon} /> */}
          <View style={styles.userContainer}>
            <TouchableOpacity onPress={() => openImageModal(item.user?.avatar)}>
              <Avatar key={item.id} name={item.user?.name} imageUri={item.user?.avatar}/>
            </TouchableOpacity>

            <View style={styles.postDetails}>
              <Text style={styles.userName}>{item.user?.name || i18n.t('anonymous')}</Text>
              <Text style={styles.postCity}>{item.city || i18n.t('unknown')}</Text>
              <Text style={styles.postTimestamp}>{formatDate(item.timestamp || undefined)}</Text>
            </View>

          </View>
          <Image source={category.icon} style={styles.categoryIcon} />
        </View>

        <Text style={styles.postText}>{item.content}</Text>

        {/* Display Image if Available */}
        {item.imageUrl && (
          <TouchableOpacity onPress={() => openImageModal(item.imageUrl)}>
            <Image source={{ uri: item.imageUrl }} style={styles.postImage} contentFit='cover' />
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
              navigation.navigate('ProfileScreen');
            }}
            activeOpacity={0.5} // Manage active opacity here
          >
            <Avatar 
              name={user?.name || ''}
              imageUri={profileImageUrl}
              size={36}
                // source={{ uri: profileImageUrl || defaultUri }}
                // style={[styles.profilePic, {opacity: imageOpacity}]} // Apply dynamic opacity
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
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading posts...</Text>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
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
                  {/* {funnyMessage ? <Text style={styles.funnyMessage}>{funnyMessage}</Text> : null} */}
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
            <Image style={styles.fullScreenImage} source={{ uri: selectedImageUrl || undefined }} contentFit='contain'/>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    color: "gray",
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    marginRight: 15,
    marginBottom: 20,
  },
  noUserText: {
    fontSize: 16,
    textAlign: "center",
    color: "gray",
    marginTop: 30,
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
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  topBar: {
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
  // profilePic: {
  //   height: '100%',
  //   width: '100%',
  //   resizeMode: 'cover', // Ensures the image covers the space without stretching
  // },
  postItem: {
    padding: 8,
    borderTopWidth: 0.5,
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
    // resizeMode: 'contain'
  }
});