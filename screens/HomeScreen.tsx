import React, { useContext, forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, FunctionComponent, useCallback } from 'react';
import { useRoute, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { StyleSheet, ActivityIndicator, View, Text, TouchableOpacity, Button, TextInput, FlatList, Modal, ScrollView, Alert, StatusBar, Platform } from 'react-native';
import { Image } from 'react-native';

import { FlashList } from '@shopify/flash-list';

import friendsIcon from '../assets/addfriends_icon.png'
import { Ionicons } from '@expo/vector-icons';
// import defaultProfileImg from '../assets/unknownuser.png';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, usePosts } from '../src/contexts/PostsContext';
import * as Location from 'expo-location';
import { db } from '../src/config/firebase';
import { useUser } from '../src/contexts/UserContext';
import Avatar from '../src/components/Avatar';
import { deleteDoc, collection, onSnapshot, limit, doc, getDocs, getDoc, updateDoc, query, where, orderBy, arrayUnion } from "firebase/firestore";
import {ref as storageRef, getDownloadURL ,deleteObject, getStorage } from 'firebase/storage';
import { categories, getCategoryByKey } from '../src/config/categoryData';
import i18n from '@/i18n'; 
import { RootStackParamList } from '../src/navigationTypes';
import { Timestamp, serverTimestamp, addDoc } from 'firebase/firestore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/contexts/ThemeContext';
import UpdateChecker from '../src/components/UpdateChecker';
import { useOnlineUserCount } from '@/hooks/useOnlineUserCount';
import OnlineBanner from '@/components/OnlineBanner';
import { checkNativeUpdate  } from '@/components/NativeUpdateChecker';
import { themeColors } from '@/theme/themeColors';
import { logScreen } from '@/utils/analytics';
import { updateUserLocation } from '@/utils/locationService';
import { useQrVisibility } from '@/contexts/QrVisibilityContext';
import PostCard from '@/components/PostCard';
import cities from '@/config/citiesData';
import Purchases from 'react-native-purchases';
import Toast from 'react-native-toast-message';
import MembershipInfoModal from '@/components/MembershipInfoModal';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  Extrapolation,
  withTiming,
  interpolate,
  useAnimatedScrollHandler,
  withSequence,
  withSpring,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import ThemedStatusBar from '@/components/ThemedStatusBar';

export type HomeScreenRef = {
  scrollToTop: () => void;
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'HomeScreen'>;

function isPeru(country: any) {
  if (!country) return false;
  const c = country.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  return c === "PERU" || c === "PE";
}

const HomeScreen = forwardRef<HomeScreenRef, HomeScreenProps>(({ navigation }, ref) => {
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { posts, setPosts } = usePosts();
  const { user, setUser } = useUser();
  const AnimatedFlatList = Animated.createAnimatedComponent(FlashList<Post>);

  const flatListRef = useRef<any>(null);

  // Modal state inside the component
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  // const defaultUri = Asset.fromModule(defaultProfileImg).uri;

  // Search Bar State
  const [searchText, setSearchText] = useState<string>('');

  // variables for user's location
  const [city, setCity] = useState<string | null>(null); // To store the city name
  const [loading, setLoading] = useState<boolean>(true); // Loading state for better UX
  const prevCityRef = useRef<string | null>(null);

  const scrollY = useSharedValue(0);
  const bounceValue = useSharedValue(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const prevHasUnread = useRef(false);

  const [fallbackUpdate, setFallbackUpdate] = useState(false);
  const { setQrVisible } = useQrVisibility();
  const { resolvedTheme, toggleTheme } = useTheme();
  const colors = themeColors[resolvedTheme];

  const [isFullScreen, setIsFullScreen] = useState(false); // State to control full-screen mode

  const [citySelectorVisible, setCitySelectorVisible] = useState(false);
  const [selectedBrowseCity, setSelectedBrowseCity] = useState<string | null>(null);
  const [showMembershipModal, setShowMembershipModal] = useState(false);

  const { refreshUser } = useUser();
  const [cityModalType, setCityModalType] = useState<'peru' | 'us' | null>(null);
  const [countrySelectorVisible, setCountrySelectorVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<'usa' | 'peru' | null> (null);

  const [monthlyPrice, setMonthlyPrice] = useState<string | undefined>(undefined);
  const [yearlyPrice, setYearlyPrice] = useState<string | undefined>(undefined);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [citySelectionTimestamp, setCitySelectionTimestamp] = useState<number | null>(null);
  const maxDurationMs = 48 * 60 * 60 * 1000; // 48 hours
  const timeLeftMs = citySelectionTimestamp ? maxDurationMs - (Date.now() - citySelectionTimestamp) : 0;
  const hoursLeft = Math.ceil(timeLeftMs / (60 * 60 * 1000));
  const [cityLimitDismissed, setCityLimitDismissed] = useState(false);

  const toggleFullScreen = () => {
    console.log('Toggling full-screen state');
    setIsFullScreen(prev => !prev);
  };

  console.log("HomeScreen");

  // Check native update first
  useEffect(() => {
    const runUpdateCheck = async () => {
      const updated = await checkNativeUpdate();
      if (!updated) {
        if (__DEV__) {
          console.log('[HomeScreen] Falling back to JS update checker.');
        }
        setFallbackUpdate(true);
      }
    };
  
    runUpdateCheck();
  }, []);

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

  
  useEffect(() => {
    // Load from AsyncStorage
    const loadData = async () => {
      const cities = await AsyncStorage.getItem('selectedCities');
      const ts = await AsyncStorage.getItem('citySelectionTimestamp');
      if (cities) setSelectedCities(JSON.parse(cities));
      if (ts) setCitySelectionTimestamp(Number(ts));
    };
    loadData();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('selectedCities', JSON.stringify(selectedCities));
    if (citySelectionTimestamp !== null)
      AsyncStorage.setItem('citySelectionTimestamp', citySelectionTimestamp.toString());
  }, [selectedCities, citySelectionTimestamp]);

  useEffect(() => {
    if (user?.premium && showMembershipModal) {
      setShowMembershipModal(false);
    }
  }, [user?.premium, showMembershipModal]);

  useEffect(() => {
    const now = Date.now();
    if (citySelectionTimestamp && now - citySelectionTimestamp > 48 * 60 * 60 * 1000) {
      setSelectedCities([]);
      setCitySelectionTimestamp(null);
      AsyncStorage.removeItem('selectedCities');
      AsyncStorage.removeItem('citySelectionTimestamp');
    }
  }, [citySelectionTimestamp, citySelectorVisible]);

  useEffect(() => {
    if (!user?.uid) return;
  
    const q = query(
      collection(db, 'conversations'),
      where('users', 'array-contains', user.uid)
    );
  
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let foundUnread = false;
  
      for (const docSnap of snapshot.docs) {
        const convoId = docSnap.id;
        const messagesRef = collection(db, 'conversations', convoId, 'messages');
        const msgQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
        const msgSnap = await getDocs(msgQuery);
  
        const latestMsg = msgSnap.docs[0]?.data();
        if (latestMsg && latestMsg.senderId !== user.uid && latestMsg.read !== true) {
          foundUnread = true;
          break;
        }
      }
  
      setHasUnreadMessages(foundUnread);
    });
  
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (hasUnreadMessages && !prevHasUnread.current) {
      bounceValue.value = withSequence(
        withSpring(-6, { stiffness: 300 }),
        withSpring(0, { stiffness: 300 })
      );
    }
    prevHasUnread.current = hasUnreadMessages;
  }, [hasUnreadMessages]);

  useFocusEffect(
    React.useCallback(() => {
      const onFocus = async () => {
        await logScreen('HomeScreen');
  
        if (city) {
          setLoading(true);
          console.log("🔄 Fetching latest posts on screen focus for city:", city);
          await fetchPostsByCity(city);
          setLoading(false);
        }
      };
  
      onFocus();
    }, [city, user?.blocked])
  );

  useFocusEffect(
    useCallback(() => {
      setQrVisible(true); // Set this in a shared context
      return () => setQrVisible(false); // Hide when screen loses focus
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      setCityLimitDismissed(false);
    }, [])
  );

  // Expose scrollToTop to parent
  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
  }));

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
  
      if (user?.uid) {
        const updated = await updateUserLocation(user.uid);
      
        if (updated?.label) {
          console.log("✅ Setting city to:", updated.label);
          setCity(updated.label);
        }
      
        if (updated?.country) {
          setUser(prev => prev ? { ...prev, country: updated.country ?? undefined } : prev);
          console.log("📝 Updated user country in Firestore:", updated.country);
        }
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

  const handleShowMembershipModal = async () => {
    setShowMembershipModal(true);
    setOfferingsLoading(true);
    try {
      const offerings = await Purchases.getOfferings();
      setMonthlyPrice(offerings.current?.monthly?.product?.priceString || 'S/ 4.99');
      setYearlyPrice(offerings.current?.annual?.product?.priceString || 'S/ 49.99');
    } catch (e) {
      setMonthlyPrice('S/ 4.99');
      setYearlyPrice('S/ 49.99');
    } finally {
      setOfferingsLoading(false);
    }
  };
  
  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    if (isSubscribing) return;
    setIsSubscribing(true);
  
    try {
      const offerings = await Purchases.getOfferings();
      let selectedPackage = null;
      if (plan === 'monthly') selectedPackage = offerings.current?.monthly;
      else if (plan === 'yearly') selectedPackage = offerings.current?.annual;
  
      if (!selectedPackage) {
        Toast.show({ type: 'error', text1: 'No plan found', text2: 'Try again later.' });
        return;
      }
  
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
  
      if (customerInfo.entitlements.active["premium_access"]) {
        setUser(prev => prev ? { ...prev, premium: true } : prev);
        await refreshUser();
        Toast.show({ type: 'success', text1: 'Membership Activated', text2: 'Enjoy your premium perks!' });
        setShowMembershipModal(false);
      } else {
        Toast.show({ type: 'error', text1: 'Subscription not activated', text2: 'Try again.' });
      }
    } catch (e: any) {
      if (e.userCancelled) {
        Toast.show({ type: 'info', text1: 'Purchase cancelled', text2: 'You can subscribe anytime.' });
      } else {
        Toast.show({ type: 'error', text1: 'Subscription failed', text2: e?.message || 'Try again later.' });
      }
    } finally {
      setIsSubscribing(false);
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
      console.log("Fetching posts for city:", cityName);
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
          videoUrl: data.videoUrl || "", // Provide default value if not available
          user: {
            uid: data.user.uid,
            name: data.user.name,
            avatar: avatarUrl || "", // fallback to empty string
            mode: data.user.mode,
          },
          categoryKey: data.categoryKey,
          commentCount: data.commentCount ?? 0,
          commentsEnabled: data.commentsEnabled,
          verifications: data.verifications || {},
          showcase: data.showcase || false,
          promo: data.promo || null,
        };
      }));

      // console.log(" Checking postData: ", postsData);

      const blockedUserIds = user?.blocked ?? [];
      const filteredPosts = postsData.filter(post => !blockedUserIds.includes(post.user.uid));
      setPosts(filteredPosts);
      
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

            // console.log("👀 Updated user context:", updated);
            console.log("✅ Country preserved?", updated?.country);
            console.log("✅ Language preserved?", updated?.language);

            return updated;
          });

          // console.log("📦 Firestore user data:", userData);
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

  const formatDate = (timestamp: Timestamp | null | undefined): string => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp.seconds * 1000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleEditPost = (postId: string, newContent: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) =>
        p.id === postId ? { ...p, content: newContent } : p
      )
    );
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

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceValue.value }],
  }));

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

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  
  const fadeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 60],
      [1, 0],
      {
        extrapolateLeft: Extrapolation.CLAMP,
        extrapolateRight: Extrapolation.CLAMP,
      }
    );
    
    return { opacity };
  });
  

  const memoizedRenderItem = React.useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        item={item}
        userId={user?.uid ?? ''}
        user={{
          uid: user?.uid ?? '',
          name: user?.name ?? '',
          avatar: user?.avatar ?? '',
        }}
        onDelete={handleDeletePost}
        onReport={handleReportPress}
        onOpenImage={openImageModal}
        onUserProfile={(userId: string) => {
          if (item.user.mode === 'business') {
            navigation.navigate('BusinessChannel', { businessUid: userId });
          } else {
            navigation.navigate('UserProfile', { userId });
          }
        }}
        formatDate={formatDate}
        isFullScreen={isFullScreen}
        toggleFullScreen={toggleFullScreen}
        onEdit={handleEditPost}
        cardColor={colors.card}
        textColor={colors.text}
      />
    ),
    [
      user?.uid,
      user?.name,
      user?.avatar,
      handleDeletePost,
      handleReportPress,
      openImageModal,
      formatDate,
      isFullScreen,
      toggleFullScreen,
      navigation,
    ]
  );
  
  const isFocused = useIsFocused();
  const onlineCount = useOnlineUserCount();

  return (
    <>
      {isFocused && (
        <ThemedStatusBar/>
      )}
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Top Bar with Profile Icon and Search Bar */}
            <View style={[styles.topBar, { backgroundColor: colors.background }]}>

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

              <TouchableOpacity
                style={styles.mapIconContainer}
                onPress={() => {

                  // Premium/admin always get the country picker
                  if (user?.premium || user?.claims?.admin) {
                    setCountrySelectorVisible(true);
                    setSelectedCountry(null);
                    return;
                  }

                  // Non-premium Peruvian users get the country picker (but only PERU is available for them)
                  if (isPeru(user?.country)) {
                    setCountrySelectorVisible(true);
                    setSelectedCountry(null);
                    return;
                  }

                  // Everyone else (non-premium, not Peru) must upgrade
                  handleShowMembershipModal();
                }}

                activeOpacity={0.7}
                accessibilityLabel={i18n.t('browseOtherCities')}
              >
                <Ionicons
                  name="map-outline"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
              
              <View style={styles.searchWithIcon}>
                {/* Search Bar */}
                <TextInput
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: colors.searchBar,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder={i18n.t('searchPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={searchText}
                  onChangeText={setSearchText}
                  maxLength={20}
                />

                <TouchableOpacity
                    onPress={toggleTheme}
                    style={styles.themeToggleButton}
                    activeOpacity={0.7}
                    accessibilityLabel={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  >
                  <Ionicons
                    name={resolvedTheme === "dark" ? "sunny-outline" : "moon-outline"}
                    size={26}
                    color={resolvedTheme === "dark" ? "#FFD600" : "#222"}
                  />
                </TouchableOpacity>

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
            {fallbackUpdate && <UpdateChecker />}

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
              <AnimatedFlatList
                ref={flatListRef}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                ListHeaderComponent={
                  <View>

                    {!user?.premium && selectedCities.length >= 3 && citySelectionTimestamp && !cityLimitDismissed && (
                      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE6E6', paddingVertical: 4, paddingHorizontal: 10, marginBottom: 5}}>
                        <Text style={{color: '#D32F2F', fontSize: 13, flex: 1, textAlign: 'center'}}>
                          {i18n.t('cityLimitReachedWithTime', { time: hoursLeft })}
                        </Text>
                        <TouchableOpacity onPress={() => setCityLimitDismissed(true)} style={{marginLeft: 8}}>
                          <Ionicons name="close" size={18} color="#D32F2F" />
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={[styles.categoriesContainer, { backgroundColor: colors.background }]}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {filteredCategories.map((item) => (
                          <TouchableOpacity
                            key={item.key}
                            style={[
                              styles.categoryItem,
                              {
                                backgroundColor: colors.categoryBg,
                                borderColor: colors.categoryBorder,
                              },
                            ]}
                            onPress={() => handleCategoryClick(item.key)}
                          >
                            <Text style={[styles.categoryText, { color: colors.categoryText }]}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                  </View>
                }
                data={posts}
                keyExtractor={item => item.id}
                renderItem={memoizedRenderItem}
                contentContainerStyle={styles.listContent}
                estimatedItemSize={280}
              />
            )}

            <OnlineBanner count={onlineCount} />

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

            <Modal
              visible={countrySelectorVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setCountrySelectorVisible(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPressOut={() => setCountrySelectorVisible(false)}
              >
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>{i18n.t('chooseCountry')}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                    {/* USA Button */}
                    <TouchableOpacity
                      style={[styles.modalOption, { flex: 1, marginRight: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1976D2', borderRadius: 8 }]}
                      onPress={() => {
                        setSelectedCountry('usa');
                        // Show city modal for USA (future), but for now show membership modal if not premium
                        if (user?.premium || user?.claims?.admin) {
                          setCountrySelectorVisible(false);
                          setCityModalType('us');
                          setCitySelectorVisible(true);
                        } else if (isPeru(user?.country)) {
                          // Non-premium Peruvians tapping USA get membership modal
                          setCountrySelectorVisible(false);
                          handleShowMembershipModal();
                        } else {
                          // fallback, should not hit due to first guard
                          setCountrySelectorVisible(false);
                          handleShowMembershipModal();
                        }
                      }}
                    >
                      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>USA</Text>
                    </TouchableOpacity>
                    {/* PERU Button */}
                    <TouchableOpacity
                      style={[styles.modalOption, { flex: 1, marginLeft: 10, alignItems: 'center', borderWidth: 1, borderColor: '#43A047', borderRadius: 8 }]}
                      onPress={() => {
                        setSelectedCountry('peru');
                        setCountrySelectorVisible(false);
                        setCityModalType('peru');
                        setCitySelectorVisible(true);
                      }}
                    >
                      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>PERU</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setCountrySelectorVisible(false)} style={{ marginTop: 18 }}>
                    <Text style={{ color: 'red', textAlign: 'center' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>

            <Modal
              visible={citySelectorVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setCitySelectorVisible(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPressOut={() => setCitySelectorVisible(false)}
              >
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>{i18n.t('selectCity')}</Text>
                  <ScrollView>
                    {cityModalType === 'peru' && cities
                      .filter(c => c.country === 'PE')
                      .map((c) => (                      
                      <TouchableOpacity
                        key={c.city}
                        onPress={() => {
                          const cityLabel = c.city + ", " + c.region;
                        
                          if (user?.premium || user?.claims?.admin) {
                            setSelectedBrowseCity(cityLabel);
                            setCity(cityLabel);
                            setCitySelectorVisible(false);
                            return;
                          }
                        
                          // Check if 48 hours have passed, reset if needed
                          const now = Date.now();
                          if (
                            citySelectionTimestamp &&
                            now - citySelectionTimestamp > 48 * 60 * 60 * 1000
                          ) {
                            setSelectedCities([]);
                            setCitySelectionTimestamp(null);
                          }
                        
                          if (!selectedCities.includes(cityLabel)) {
                            if (selectedCities.length >= 3) {
                              Toast.show({
                                type: 'info',
                                text1: i18n.t('cityLimitReachedTitle', 'City Limit Reached'),
                                text2: i18n.t('cityLimitReachedMsg', 'You’ve reached your city selection limit. Become a member to browse more cities!'),
                              });
                              setCitySelectorVisible(false);
                              setTimeout(() => {
                                handleShowMembershipModal();
                              }, 900);                              
                              return;
                            }
                            // First city of this period: set timestamp
                            if (selectedCities.length === 0) {
                              setCitySelectionTimestamp(Date.now());
                            }
                            setSelectedCities([...selectedCities, cityLabel]);
                          }
                          setSelectedBrowseCity(cityLabel);
                          setCity(cityLabel);
                          setCitySelectorVisible(false);
                        }}
                        style={[
                          styles.modalOption,
                          city === c.city && { backgroundColor: '#eaf6ff' },
                        ]}
                      >
                        <Text style={{ fontWeight: city === c.city ? 'bold' : 'normal', color: '#222' }}>
                          {c.city}
                          <Text style={{ color: '#aaa', fontSize: 13 }}> – {c.region}</Text>
                        </Text>
                      </TouchableOpacity>
                    ))
                    }

                    {cityModalType === 'us' && cities
                      .filter(c => c.country === 'US')
                      .map((c) => (
                        <TouchableOpacity
                          key={c.city}
                          onPress={() => {
                            const cityLabel = c.city + ", " + c.region;
                            // Same selection logic as above, or custom for US if you want
                            if (user?.premium || user?.claims?.admin) {
                              setSelectedBrowseCity(cityLabel);
                              setCity(cityLabel);
                              setCitySelectorVisible(false);
                              return;
                            }
                            const now = Date.now();
                            if (
                              citySelectionTimestamp &&
                              now - citySelectionTimestamp > 48 * 60 * 60 * 1000
                            ) {
                              setSelectedCities([]);
                              setCitySelectionTimestamp(null);
                            }
                            if (!selectedCities.includes(cityLabel)) {
                              if (selectedCities.length >= 3) {
                                Toast.show({
                                  type: 'info',
                                  text1: i18n.t('cityLimitReachedTitle', 'City Limit Reached'),
                                  text2: i18n.t('cityLimitReachedMsg', 'You’ve reached your city selection limit. Become a member to browse more cities!'),
                                });
                                setCitySelectorVisible(false);
                                setTimeout(() => {
                                  handleShowMembershipModal();
                                }, 900);
                                return;
                              }
                              if (selectedCities.length === 0) {
                                setCitySelectionTimestamp(Date.now());
                              }
                              setSelectedCities([...selectedCities, cityLabel]);
                            }
                            setSelectedBrowseCity(cityLabel);
                            setCity(cityLabel);
                            setCitySelectorVisible(false);
                          }}
                          style={[
                            styles.modalOption,
                            city === c.city && { backgroundColor: '#eaf6ff' },
                          ]}
                        >
                          <Text style={{ fontWeight: city === c.city ? 'bold' : 'normal', color: '#222' }}>
                            {c.city}
                            <Text style={{ color: '#aaa', fontSize: 13 }}> – {c.region}</Text>
                          </Text>
                        </TouchableOpacity>
                      ))
                    }



                  </ScrollView>

                  <TouchableOpacity
                    onPress={async () => {
                      setCitySelectorVisible(false);
                      await fetchLocation();
                      Toast.show({ type: 'success', text1: i18n.t('nowViewingYourCity') || "Ahora ves tu ciudad actual" });
                    }}

                    style={[styles.modalOption, { marginTop: 10 }]}
                  >
                    <Text style={{ color: 'green' }}>{i18n.t('backToMyCity')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setCitySelectorVisible(false)}>
                    <Text style={{ color: 'red', marginTop: 10, textAlign: 'center' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>

            <MembershipInfoModal
              visible={showMembershipModal && user?.premium !== true}
              onClose={() => setShowMembershipModal(false)}
              onSubscribe={handleSubscribe}
              monthlyPrice={monthlyPrice}
              yearlyPrice={yearlyPrice}
              loading={offeringsLoading || isSubscribing}
            />

            <Animated.View style={[styles.musicButton, fadeStyle, bounceStyle]}>
              <TouchableOpacity
                onPress={() => navigation.navigate('MusicScreen')}
              >
                <Ionicons name="musical-note" size={28} color= "#4f46e5" />
              </TouchableOpacity>
            </Animated.View>


            <Animated.View style={[styles.chatButton, fadeStyle, bounceStyle]}>

              <TouchableOpacity onPress={() => navigation.navigate('MessagesScreen')}>
                <Ionicons name="chatbubbles-outline" size={30} color="#007AFF" />
                {hasUnreadMessages && <View style={styles.unreadDot} />}
              </TouchableOpacity>

            </Animated.View>

          </View>
        </SafeAreaView>
    </>
  );
});

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: '#ECEFF4', // or any other background color you want
  },
  container: {
    flex: 1,
    // backgroundColor: '#ECEFF4',
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreIconInline: {
    padding: 2,
    marginBottom: 35,
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 60, // Add this line
  },
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
  fullScreenModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)'
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
    // backgroundColor: '#ECEFF4',
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
    borderWidth: 1,
    borderColor: '#ccc',  // Light gray border
    shadowColor: '#000',
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    borderRadius: 20,
    shadowOpacity: 0.05,
    paddingHorizontal: 16,
    elevation: 2, // Shadow effect for Android
    marginRight: 3,  // Adjust the right spacing
    marginLeft: 10,
    fontSize: 14,
  },
  mapIconContainer: {
    marginRight: 2,
    marginLeft: 0,
    padding: 4,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  themeToggleButton: {
    marginHorizontal: 5,
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    // Optionally: Add shadow or background on press
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginTop: 1,
    marginLeft: 8,
    marginBottom: 2,
    alignItems: 'center',
    // backgroundColor: '#ECEFF4',
    shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    // elevation: 2,
    paddingVertical: 1,
  },
  categoryItem: {
    // backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    // borderColor: '#007aff',
    borderWidth: 1,
  },
  categoryText: {
    // color: '#0097a7',
    fontWeight: '600',
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
    // width: '100%'
    paddingBottom: 10,
    paddingTop: 6,
    // backgroundColor: '#ECEFF4',
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
  fullScreenImage: {
    width: '90%',
    height: '90%',
    // resizeMode: 'contain'
  },
  chatButton: {
    position: 'absolute',
    bottom: 45, // Push it up a bit above the tab bar
    right: 15,
    backgroundColor: '#eeeeee',
    borderRadius: 30,
    width: 60,
    height: 60,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  musicButton: {
    position: 'absolute',
    bottom: 115, // Push it up a bit above the tab bar
    right: 15,
    backgroundColor: '#eeeeee',
    borderRadius: 30,
    width: 50,
    height: 50,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  } ,
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    backgroundColor: 'red',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 999,
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: 'black', // Optionally, add a background color for full-screen
  },
  
});