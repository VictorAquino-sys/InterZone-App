import React, { useContext, useEffect, useLayoutEffect, useRef, useState, FunctionComponent } from 'react';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { StyleSheet, ActivityIndicator, View, Text, TouchableOpacity, Button, TextInput, FlatList, Modal, ScrollView, Alert } from 'react-native';
// import { Image } from 'expo-image';
import { Image } from 'react-native';
import friendsIcon from '../assets/addfriends_icon.png'
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
// import defaultProfileImg from '../assets/unknownuser.png';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, usePosts } from '../src/contexts/PostsContext';
import * as Location from 'expo-location';
import { db } from '../src/config/firebase';
import { useUser } from '../src/contexts/UserContext';
import Avatar from '../src/components/Avatar';
import LikeButton from '../src/components/LikeButton';
import { deleteDoc, collection, doc, getDocs, getDoc, updateDoc, query, where, orderBy, arrayUnion } from "firebase/firestore";
import {ref as storageRef, getDownloadURL ,deleteObject, getStorage } from 'firebase/storage';
import { categories, getCategoryByKey } from '../src/config/categoryData';
import { checkLocation } from '../src/utils/locationUtils';
import i18n from '@/i18n'; 
import { RootStackParamList } from '../src/navigationTypes';
import { Accuracy } from 'expo-location';
import { Timestamp, serverTimestamp, addDoc } from 'firebase/firestore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import UpdateChecker from '../src/components/UpdateChecker';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'HomeScreen'>;

const HomeScreen: FunctionComponent<HomeScreenProps> = ({ navigation }) => {
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
    }, [city, user?.blocked])
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

  const handleReportPress = (postId: string, postUserId: string) => {
    setSelectedPostId(postId);
    setSelectedUserId(postUserId);
    setReportModalVisible(true);
  };
  
  const handleSelectReason = async (reason: string) => {
    if (!selectedPostId || !selectedUserId || !user?.uid) return;
  
    try {
      const reportsRef = collection(db, 'reports');
      const q = query(
        reportsRef,
        where('postId', '==', selectedPostId),
        where('reportedBy', '==', user.uid)
      );
      const snapshot = await getDocs(q);
  
      if (!snapshot.empty) {
        Alert.alert(i18n.t('report.alreadyReportedTitle'), i18n.t('report.alreadyReportedMessage'));
        return;
      }
  
      await addDoc(reportsRef, {
        postId: selectedPostId,
        reportedBy: user.uid,
        reportedUserId: selectedUserId,
        reason,
        timestamp: serverTimestamp(),
      });
  
      Alert.alert(i18n.t('report.thankYou'), i18n.t('report.submitted'));
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert(i18n.t('report.errorTitle'), i18n.t('report.errorMessage'));
    } finally {
      setReportModalVisible(false);
      setSelectedPostId(null);
      setSelectedUserId(null);
    }
  };

  const handleBlockUser = async (userIdToBlock: string | null) => {
    if (!userIdToBlock || !user?.uid) return;
  
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        blocked: arrayUnion(userIdToBlock)
      });

      // ✅ Update local context right after
      setUser(prev => {
        if (!prev) return prev;
        const updatedBlocked = prev.blocked ? [...prev.blocked, userIdToBlock] : [userIdToBlock];
        return { ...prev, blocked: updatedBlocked };
      });
  
      Alert.alert(i18n.t('block.success'), i18n.t('block.successMessage'));
      if (!city) return;
      await fetchPostsByCity(city); // make sure city is defined in your scope
    } catch (error) {
      console.error('Block error:', error);
      Alert.alert(i18n.t('block.error'), i18n.t('block.errorMessage'));
    } finally {
      setReportModalVisible(false);
    }
  };
  

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('FriendsHome')}
          style={{ marginRight: 16 }}
        >
          <Image
            source={friendsIcon}
            style={{ width: 26, height: 26 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);
  
  
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

      const blockedUserIds = user?.blocked ?? [];
      const filteredPosts = postsData.filter(post => !blockedUserIds.includes(post.user.uid));
      setPosts(filteredPosts);
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
            <TouchableOpacity onPress={() => {
              if (item.user?.avatar) {
                openImageModal(item.user.avatar);
              } else {
                Alert.alert(i18n.t('NoPhoto')); // Optional: show message if no image
              }
            }}>
              <Avatar
                key={item.id} 
                name={item.user?.name} 
                imageUri={item.user?.avatar || undefined }
              />
            </TouchableOpacity>

            <View style={styles.postDetails}>
              <TouchableOpacity 
                onPress={() => {
                  if (item.user?.uid) {
                    navigation.navigate('UserProfile', { userId: item.user.uid });
                  }
                }}>
                <Text style={styles.userName}>{item.user?.name || i18n.t('anonymous')}</Text>
              </TouchableOpacity>
              <Text style={styles.postCity}>{item.city || i18n.t('unknown')}</Text>
              <Text style={styles.postTimestamp}>{formatDate(item.timestamp || undefined)}</Text>
            </View>

          </View>

          {/* ✅ Wrap these two in a right-aligned container */}
          <View style={styles.topRightIcons}>
            <Image source={category.icon} style={styles.categoryIcon} />
            <TouchableOpacity onPress={() => handleReportPress(item.id, item.user.uid)}>
              <Ionicons name="ellipsis-vertical" size={20} color="#888" style={styles.moreIconInline} />
            </TouchableOpacity>
          </View>

        </View>

        <Text style={styles.postText}>{item.content}</Text>



        {/* Display Image if Available */}
        {item.imageUrl && (
          <TouchableOpacity onPress={() => openImageModal(item.imageUrl)}>
              <View style={styles.postImageWrapper}>
                <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode='cover' />
              </View>
          </TouchableOpacity>
        )}

        {/* Like Button Component */}
        <View style={styles.likeButtonWrapper}>
          <LikeButton postId={item.id} userId={user.uid} />
        </View>

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
            />
          </TouchableOpacity>
          
          <View style={styles.searchWithIcon}>
            {/* Search Bar */}
            <TextInput
              style={styles.searchBar}
              placeholder={i18n.t('searchPlaceholder')}
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={setSearchText}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('FriendsHome')}
              style={styles.iconWrapper}
              activeOpacity={0.7}
            >
              <Image
                source={friendsIcon}
                style={styles.friendsIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 🔔 Version update checker */}
        <UpdateChecker />

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{i18n.t('loadingPost')}</Text>
            <ActivityIndicator size="large" color="#26c6da" />
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
            <Image style={styles.fullScreenImage} source={{ uri: selectedImageUrl || undefined }} resizeMode='contain'/>
          </TouchableOpacity>
        </Modal>

        <Modal animationType="slide" transparent visible={reportModalVisible}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setReportModalVisible(false)}
          >
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{i18n.t('report.title')}</Text>
              {[
                { key: 'spam' },
                { key: 'harassment' },
                { key: 'inappropriate' },
                { key: 'hate' },
                { key: 'other' }
              ].map(({ key }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleSelectReason(i18n.t(`report.reasons.${key}`))}
                  style={styles.modalOption}
                >
                  <Text>{i18n.t(`report.reasons.${key}`)}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => handleBlockUser(selectedUserId)}
                style={[styles.modalOption, { marginTop: 10 }]}
              >
                <Text style={{ color: 'red' }}>{i18n.t('block.blockUser')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Text style={{ color: 'red', marginTop: 10, textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#f5f5f5' // or any other background color you want
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreIconInline: {
    padding: 2,
    marginBottom: 35,
  },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 10, padding: 20 },
  modalTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 10 },
  modalOption: { paddingVertical: 10 },

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
    marginBottom: 8,
  },
  likeButtonWrapper: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    marginRight: 20,
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
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderBottomColor: '#ddd',
  },
  searchWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    // marginLeft: 2,
    padding: 4,
    marginRight: 10,
  },
  friendsIcon: {
    width: 28,
    height: 28,
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
    marginRight: 25,  // Adjust the right spacing
    marginLeft: 10,
    fontSize: 14,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginTop: 5,
    marginLeft: 8,
    marginBottom: 5,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    // elevation: 2,
    paddingVertical: 6,
  },
  categoryItem: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderColor: '#007aff',
    borderWidth: 1,
  },
  categoryText: {
    color: '#0097a7',
    fontWeight: '600',
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
  postItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  postText: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 20,  
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  postDetails: {
    marginLeft: 10,
    flexShrink: 1,  // Prevent overflow
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
  postImageWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
    borderRadius: 12,
    backgroundColor: '#fff', // Necessary for iOS to calculate shadow properly
    marginTop: 8,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
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