import React, { useContext, useState, useEffect, useRef, FunctionComponent } from 'react';
import { ScrollView, KeyboardAvoidingView, View, TextInput, TouchableOpacity, Text, StyleSheet, Button, Alert, Image, ActivityIndicator, Platform, NativeEventEmitter, NativeModules, Switch, StatusBar } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { usePosts } from '../../src/contexts/PostsContext';
import Toast from 'react-native-toast-message';
import { useUser } from '../../src/contexts/UserContext'; // Import useUser hook
import { db } from '../../src/config/firebase';
import { getAuth, User as FirebaseUser } from "firebase/auth";
import { Timestamp, collection, addDoc, doc, getDoc, query, getDocs, where } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable, UploadTaskSnapshot } from 'firebase/storage';
import { Tooltip } from '@rneui/themed';
import { navigationRef } from '../../src/navigation/navigationRef';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from '@react-navigation/native';
import i18n from '@/i18n';
import { Accuracy } from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import mime from 'mime';
import { useFocusEffect } from '@react-navigation/native';
import { checkLocation } from '../../src/utils/locationUtils';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../../src/navigationTypes';
// import { ContentType } from 'expo-clipboard';
import { Video } from 'expo-av';
import { app } from '../../src/config/firebase';
import * as FileSystem from 'expo-file-system';
import { getReadableVideoPath, saveVideoToAppStorage, validateVideoFile, uploadVideoWithCompression } from '@/utils/videoUtils';
import { isValidFile, showEditor } from 'react-native-video-trim';
import { getProfaneWords } from '@/utils/profanityFilter';

type PostScreenProps = BottomTabScreenProps<TabParamList, 'PostScreen'>;

function isUserPeruvian(user?: { country?: string } | null): boolean {
  if (!user?.country) return false;
  // Remove accents, lowercase, and trim
  const normalized = user.country.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return (
    normalized === "pe" ||
    normalized === "peru"
  );
}

const PostScreen: FunctionComponent<PostScreenProps> = ({ navigation }) => {
  const auth = getAuth();
  const { user } = useUser();
  const authUser = auth.currentUser;
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [postText, setPostText] = useState<string>('');
  const [charCount, setCharCount] = useState<number>(0); 
  const [location, setLocation] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null); // Video path state
  const [videoUri, setVideoUri] = useState<string | null>(null); // Store video URI
  const [imageUri, setImageUri] = useState<string | null>(null); // Store post image URI
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null); // New state to track media type
  const [uploading, setUploading] = useState<boolean>(false);  // Track image upload status
  const [isShowcase, setIsShowcase] = useState(false); // 🔹 Showcase toggle state
  const isPeruvian = isUserPeruvian(user);

  const [isPromoEnabled, setIsPromoEnabled] = useState(false);
  const [promoLabel, setPromoLabel] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoTotal, setPromoTotal] = useState<number | null>(null);

  const [postingAsBusiness, setPostingAsBusiness] = useState<boolean>(
    user?.accountType === 'business' && user?.businessVerified === true
  );
  
  const [locationIconVisible, setLocationIconVisible] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string | null>('');

  const [commentsEnabled, setcommentsEnabled] = useState<boolean>(true);
  const normalizedCountry = user?.country?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const currencyPrefix = (normalizedCountry === 'peru' || normalizedCountry === 'pe') ? 'S/ ' : '$ ';

  const profaneWords = getProfaneWords(postText);
  const [promoExpirationDate, setPromoExpirationDate] = useState<Date | null>(null);

  const [originalPrice, setOriginalPrice] = useState<number | null>(null);
  const [selectedDiscount, setSelectedDiscount] = useState<number | null>(null);

  const discountedPrice = originalPrice && selectedDiscount
  ? (originalPrice * (1 - selectedDiscount / 100)).toFixed(2)
  : null;

  // Check if the category supports video posts
  const isVideoCategory = selectedCategory === 'business' || selectedCategory === 'music' || selectedCategory === "tutors";


  // Disable the image and video picker if no category is selected or location is still loading
  const isCategorySelected = selectedCategory !== '';
  const isLocationReady = !locationLoading;

  const displayName = postingAsBusiness
  ? user?.businessProfile?.name || user?.name
  : user?.name;

  const displayAvatar = postingAsBusiness
    ? user?.businessProfile?.avatar || user?.avatar
    : user?.avatar;


  const { setPosts } = usePosts();
  const storage = getStorage(app);

  console.log("PostScreen");

  useEffect(() => {
    // Set the custom StatusBar for PostScreen
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#b2dfdb'); // Your custom PostScreen color
    }
  
    return () => {
      // Reset StatusBar when leaving PostScreen
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#ECEFF4'); // HomeScreen background
      }
    };
  }, []);

  // Asynchronous function to upload image and return the download URL
  const uploadImageToStorage = async (uri: string): Promise<string | null> => {
    if (!uri) {
      console.error("🚫 No URI provided for image upload");
      return null;
    }

    const exists = await fileExists(uri);
    if (!exists) {
      console.warn("🛑 File doesn't exist or is inaccessible:", uri);
      Alert.alert("Upload Error", "The image file couldn't be accessed. Please try picking it again.");
      return null;
    }
  
    try {
      setUploading(true);
      console.log("📦 Fetching image blob from URI:", uri);
  
      let response: Response;
      try {
        response = await fetch(uri);
      } catch (fetchErr) {
        console.error("❌ fetch() failed:", fetchErr);
        Alert.alert("Upload Error", "Unable to access the image. Please try a different one.");
        return null;
      }
  
      if (!response || !response.ok) {
        console.error("❌ Invalid fetch response:", response.status);
        Alert.alert("Upload Error", "The selected image couldn't be processed.");
        return null;
      }
  
      let blob: Blob;
      try {
        blob = await response.blob();
      } catch (blobErr) {
        console.error("❌ blob() conversion failed:", blobErr);
        Alert.alert("Upload Error", "Problem occurred while reading the image.");
        return null;
      }
  
      if (!blob || blob.size === 0) {
        console.error("🚫 Blob is empty or corrupt");
        Alert.alert("Upload Error", "The image file appears empty or corrupted.");
        return null;
      }
  
      const fileExtension = uri.split('.').pop() ?? 'jpg';
      const mimeType = mime.getType(fileExtension) || 'application/octet-stream';
  
      if (!authUser) {
        console.error("🔒 User not authenticated.");
        Alert.alert("Upload Error", "You must be logged in to upload media.");
        return null;
      }
  
      const imageName = `postImages/${authUser.uid}/${Date.now()}.${fileExtension}`;
      const imageRef = ref(storage, imageName);
  
      console.log("🚀 Uploading image:", imageName);
      await uploadBytes(imageRef, blob, { contentType: mimeType });
      setImagePath(imageRef.fullPath);
  
      const downloadUrl = await getDownloadURL(imageRef);
      console.log("✅ Image uploaded:", downloadUrl);
  
      return downloadUrl;
    } catch (error: any) {
      console.error("🔥 Unhandled upload error:", error);
      Alert.alert("Upload Failed", error.message || "An unknown error occurred.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(NativeModules.VideoTrim);
    const subscription = eventEmitter.addListener('VideoTrim', async (event) => {
      if (event.name === 'onFinishTrimming') {
        console.log('🎬 Finished trimming:', event);
        
        Alert.alert(
          i18n.t('videoTrimmedTitle'),
          i18n.t('videoTrimmedMessage'),
          [
            {
              text: i18n.t('openGallery'),
              onPress: async () => {
                try {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                    allowsEditing: false,
                    quality: 1,
                  });
  
                  if (!result.canceled && result.assets?.length > 0) {
                    const uri = result.assets[0].uri;
                    const savedPath = await saveVideoToAppStorage(uri, authUser?.uid || 'anon');
                    if (savedPath) {
                      setVideoUri(savedPath);
                      setVideoPath(savedPath);
                      setMediaType('video');
                      setImageUri(null);
                      console.log("✅ Trimmed video manually selected and saved.");
                    } else {
                      Alert.alert("Error", "Failed to save the trimmed video.");
                    }
                  } else {
                    console.log("❌ User cancelled video picking.");
                  }
                } catch (e) {
                  console.error("🚨 Failed to handle trimmed video:", e);
                  Alert.alert("Error", "An issue occurred while picking the trimmed video.");
                }
              },
            },
          ]
        );
      }
    });
  
    return () => subscription.remove();
  }, []);
  

  // Step 3: Video picker
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('Video picker was canceled or no video selected');
      return;
    }
  
    if (!authUser || !authUser.uid) {
      Alert.alert('Authentication Error', 'Please log in to select a video.');
      return;
    }
  
    try {
      const rawUri = result.assets[0].uri;
      const duration = result.assets[0].duration ?? 0;
      
      // ⚠️ Check if the video is TOO LONG → launch trimmer
      if (duration / 1000 > 60) {
        const isFileValid = await isValidFile(rawUri);
        if (isFileValid) {
          console.log("🎬 Video too long — opening trimmer...");
          showEditor(rawUri, {
            maxDuration: 60,
            saveToPhoto: true,
          });
        } else {
          Alert.alert("Invalid File", "The selected video cannot be edited.");
        }
        return;
      }
      // If under limit, continue as normal
      const readableUri = await getReadableVideoPath(rawUri);
      const isValid = await validateVideoFile(readableUri, duration / 1000);
      if (!isValid) return;

      const savedPath = await saveVideoToAppStorage(readableUri, authUser.uid);
      if (!savedPath) return;

      setVideoUri(savedPath);
      setVideoPath(savedPath);
      setMediaType('video');
      setImageUri(null);
        // console.log('✅ Video successfully uploaded:', downloadUrl);
    } catch (err: any) {
      console.error('Error during video selection/upload:', err);
      Alert.alert('Video Error', err.message || 'Something went wrong while picking the video.');
    }
  };

  const resizeImage = async (uri: string): Promise<string> => {
    const resizedPhoto = await manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }], // Resize to width of 1080 while maintaining aspect ratio
      { compress: 0.7, format: SaveFormat.JPEG }
    );
    return resizedPhoto.uri;
  };

  const fileExists = async (uri: string): Promise<boolean> => {
    if (Platform.OS === 'ios' && uri.startsWith('file://')) {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        return info.exists && info.isDirectory === false;
      } catch (err) {
        console.error("⚠️ File existence check failed:", err);
        return false;
      }
    }
    return true; // Skip for Android or other valid paths
  };

  const handleImageUpload = async (uri: string): Promise<string> => {
    try {
      const resizedUri = await resizeImage(uri);
      const downloadUrl = await uploadImageToStorage(resizedUri);
      return downloadUrl || "";
    } catch (error) {
        console.error("Error handling the image upload:", error);
        return ""; 
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
      quality: 1,
    });
  
    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('Image picker was canceled or no image was selected');
      return;
    }
  
    try {
      const selectedAsset = result.assets[0];
      const originalUri = selectedAsset.uri;
      const fileName = originalUri.split('/').pop();
      const newUri = `${FileSystem.documentDirectory}${fileName}`;
  
      await FileSystem.copyAsync({
        from: originalUri,
        to: newUri,
      });
  
      console.log("📁 Image copied to safe local storage:", newUri);
  
      setImageUri(newUri);       // Set local URI for preview and upload
      setMediaType('image');
      setVideoUri(null);         // Clear video if set
    } catch (err) {
      console.error("🚫 Failed to copy image locally:", err);
      Alert.alert("File Error", "Failed to prepare the image for upload.");
    }
  };

  const handleAddLocation = async () => {
    console.log("🔍 Starting fetchLocation...");
    setLocationLoading(true); // start loading spinner

    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        alert('Please enable location services.');
        setLocationLoading(false);

        return;
      }
  
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission denied.');
        setLocationLoading(false);

        return;
      }
  
      const location = await Location.getCurrentPositionAsync({ accuracy: Accuracy.Balanced });
      console.log("✅ Location obtained:", location.coords);
  
      const matchedLocation = checkLocation(location.coords);
      console.log("Matched Location:", matchedLocation);
  
      let locationDisplay = matchedLocation;
      
      if (!matchedLocation) {
        const reverseGeocode = await Location.reverseGeocodeAsync(location.coords);
        console.log("Reverse Geocode:", reverseGeocode);
        
        if (reverseGeocode?.length > 0) {
          const { city, region, isoCountryCode } = reverseGeocode[0];
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
        setLocation(locationDisplay);
        setLocationIconVisible(false); // Hide icon after getting location
      } else {
        console.warn("⚠️ No valid city from location");

        Alert.alert(
          i18n.t('locationNotDeterminedTitle'),
          i18n.t('locationNotDeterminedMessage'),
          [
            { text: "Cancel", style: "cancel"},
            {
              text: i18n.t('shareCoordinates'),
              onPress: () => {
                const { latitude, longitude } = location.coords;
                const coordString = `Lat: ${latitude.toFixed(4)}, Lon:${longitude.toFixed(4)}`;
                setLocation(coordString);
                setLocationIconVisible(false);
                sendCoordinatesToFirebase(latitude, longitude);
                Alert.alert(i18n.t('thankYou'), i18n.t('coordinatesShared'));
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error("🚨 Error in fetchLocation:", error);
      alert("Failed to fetch location clearly. Try again.");
    } finally {
      setLocationLoading(false); // stop loading spinner
    }
  };

  const sendCoordinatesToFirebase = async (latitude: number, longitude: number) => {
    try {
      await addDoc(collection(db, "locationReports"), {
        userId: authUser?.uid || "anonymous",
        latitude,
        longitude,
        timestamp: Timestamp.fromDate(new Date()),
      });
      console.log("📍 Coordinates submitted to Firebase");
    } catch (error) {
      console.error("🔥 Failed to send coordinates:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLocationIconVisible(true); // Reset icon visibility
      setLocation(null);            // Reset location text
    }, [])
  );  

  function uploadWithRetry<T>(
    fn: () => Promise<T | null>,
    maxRetries = 2
  ): Promise<T | null> {
    return (async () => {
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          const result = await fn();
          if (result) return result;
          throw new Error('Empty result');
        } catch (err) {
          console.warn(`Retry ${attempt + 1} failed:`, err);
          attempt += 1;
          await new Promise((res) => setTimeout(res, 2000)); // wait before retry
        }
      }
      Alert.alert(i18n.t('uploadFailedTitle'), i18n.t('uploadFailedMessage'))      
      return null;
    })();
  }
  
  

  // Handle Creating a Post button
  const handleDone = async () => {
    if (!authUser || !authUser.uid) {
      Alert.alert(i18n.t('authErrorTitle'), i18n.t('authErrorMessage'))
      return;
    }

    if (!postText.trim()) {
      Alert.alert(i18n.t('emptyPostTitle'), i18n.t('emptyPostMessage'));
      return;
    }

    if (profaneWords.length > 0) {
      Alert.alert(
        i18n.t('inappropriateContentTitle'),
        `${i18n.t('inappropriateContentMessage')}\n\n${i18n.t('detectedWords')}: ${profaneWords.join(', ')}`
      );
      return;
    }

    if (!location) {
      Alert.alert(i18n.t('locationRequiredTitle'), i18n.t('locationRequiredMessage'));
      return;
    }

    if (!selectedCategory) {
      Alert.alert(i18n.t('categoryRequired'), i18n.t('selectCategory'));
      return;
    }

    setUploading(true);

    if (postingAsBusiness && isShowcase) {
      try {
        const showcaseQuery = query(
          collection(db, 'posts'),
          where('user.uid', '==', authUser.uid),
          where('showcase', '==', true)
        );
        const snapshot = await getDocs(showcaseQuery);
    
        if (snapshot.size >= 6) {
          Alert.alert(i18n.t('showcaseLimitTitle'), i18n.t('showcaseLimitMessage'))

          setUploading(false);
          return;
        }
      } catch (err) {
        console.error("🔥 Error checking showcase post limit:", err);
        Alert.alert("Error", "Could not verify showcase post limit. Please try again.");
        setUploading(false);
        return;
      }
    }

    try {
      // Fetch the latest user data from Firestore
      const userRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userRef);

      const latestUserData = userSnap.exists() ? userSnap.data() : { name: 'Anonymous', avatar: '' };

      // Upload image if provided
      let imageUrl = "";
      let videoUrl = "";
      let videoStoragePath = "";

      if (mediaType === 'image' && imageUri) {
        console.log("Resizing and uploading image...");
        imageUrl = await handleImageUpload(imageUri) || '';
      } else if (mediaType === 'video' && videoUri) {
        if (!user) {
          Alert.alert(i18n.t('userContextErrorTitle'), i18n.t('userContextErrorMessage'))
          return;
        }
        const result = await uploadWithRetry(() =>
          uploadVideoWithCompression(videoUri!, user, (progress) => {
            console.log(`Upload Progress: ${(progress * 100).toFixed(2)}%`);
          })
        );
      
        if (!result) return;
      
        videoUrl = result.downloadUrl;
        videoStoragePath = result.storagePath;
      }

      if (!user) {
        Alert.alert(i18n.t('userErrorTitle'), i18n.t('userErrorMessage'))
        return;
      }

      // Create post with latest user data
      const postData = {
        city: location,
        content: postText,
        timestamp: Timestamp.fromDate(new Date()),
        imageUrl: imageUrl || "", // Attach uploaded image URL
        imagePath: imagePath || "",
        videoUrl: videoUrl || "", // Attach uploaded video URL
        videoPath: videoStoragePath || "", // Store video path for later use
        user: {
          uid: authUser.uid,
          name: postingAsBusiness
            ? user.businessProfile?.name || user.name
            : user.name,
          avatar: postingAsBusiness
            ? user.businessProfile?.avatar || user.avatar || ""
            : user.avatar || "",
          description: postingAsBusiness
            ? user.businessProfile?.description
            : user.description || '',
          mode: postingAsBusiness ? 'business' : 'individual' as 'business' | 'individual',
          businessVerified: postingAsBusiness ? user.businessVerified : false,  
        },
        categoryKey: selectedCategory,
        commentCount: 0,
        commentsEnabled: commentsEnabled,
        verifications: user?.verifications || {},
        showcase: isShowcase, // 🔹 Save showcase field
        promo: isPromoEnabled && promoLabel && promoTotal && promoTotal > 0
        ? {
            enabled: true,
            codeLabel: promoLabel,
            description: promoDescription || '',
            total: promoTotal,
            claimed: 0,
            ...(promoExpirationDate ? { expirationDate: Timestamp.fromDate(promoExpirationDate) } : {}),
            originalPrice: originalPrice != null ? originalPrice : undefined,
            discountPercent: selectedDiscount != null ? selectedDiscount : undefined,
          }
        : null    
      };

      // Add post to Firestore
      const docRef = await addDoc(collection(db, "posts"), postData);
      console.log("Post added successfully with ID:", docRef.id);

      // Update local state
      setPosts(prevPosts => [{ id: docRef.id, ...postData }, ...prevPosts]);

      // ✅ Delete actual file from internal storage
      if (videoUri?.startsWith("file://") || videoUri?.startsWith("/data/")) {
        try {
          await FileSystem.deleteAsync(videoUri, { idempotent: true });
          console.log("🧼 Deleted trimmed video file from internal storage");
        } catch (e) {
          console.warn("⚠️ Failed to delete internal file:", e);
        }
      }

      if (videoPath?.startsWith("file://") || videoPath?.startsWith("/data/")) {
        try {
          await FileSystem.deleteAsync(videoPath, { idempotent: true });
          console.log("🧼 Deleted video file from internal storage (videoPath)");
        } catch (e) {
          console.warn("⚠️ Failed to delete videoPath file:", e);
        }
      }

      setVideoUri(null); // Clear stored video URI
      setVideoPath(null); // Clear video path
      // Wait for the upload to complete before navigating
      setTimeout(() => {
        // navigation.goBack();  // Delay before navigating back to the previous screen
      }, 5000);  // Adjust the delay as needed (2000ms = 2 seconds)

      // Reset UI state
      navigation.goBack();
      setPostText(''); // Clear the input field
      setLocation(null);
      setImageUri(null);
      setImagePath(null);      // ✅ Clear stored image path
      setVideoPath(null); // Clear video path
      setSelectedCategory(''); // ✅ Reset selected category
      setIsShowcase(false);
      setMediaType(null); // Reset media type
    } catch (error: any) {
      console.error("Error adding post: ", error);
      Alert.alert("Upload Error", (error as Error).message || "Unknow error occurred");
    } finally {
      setUploading(false);
    }
  };

  const isFocused = useIsFocused();

  return (
    <>
    {isFocused && (
      <StatusBar
        backgroundColor={Platform.OS === 'android' ? '#b2dfdb' : 'transparent'}
        barStyle="dark-content"
        />
    )}
      <SafeAreaView style={{ flex: 1, backgroundColor: '#b2dfdb' }}>
          <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? "padding": undefined}>
            <ScrollView contentContainerStyle={{ flexGrow: 1}}>
              <View style={styles.container}>
                <Text style={styles.screenTitle}>{i18n.t('createPost')}</Text>

                {user?.accountType === 'business' && user.businessVerified && (

                  <View style={styles.postAsRow}>
                    <Text style={{ marginRight: 10 }}>{i18n.t('postAs')}</Text>

                    {/* User Option */}
                    <TouchableOpacity
                      onPress={() => setPostingAsBusiness(false)}
                      style={[
                        styles.identityOption,
                        !postingAsBusiness && styles.identityOptionSelected
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: 110 }}>
                        <Text
                          numberOfLines={1}
                          ellipsizeMode='tail'
                          style={[
                            styles.identityText,
                            !postingAsBusiness && styles.identityTextSelected
                          ]}
                        >
                          {user.name}
                        </Text>
                        {user.name.length > 14 && (
                          <Tooltip
                            popover={<Text style={{ fontSize: 15 }}>{user.name}</Text>}
                            backgroundColor="#fff"
                          >
                            <Ionicons
                              name="information-circle-outline"
                              size={16}
                              color="#888"
                              style={{ marginLeft: 3 }}
                            />
                          </Tooltip>
                        )}
                        {/* Show checkmark if selected */}
                        {!postingAsBusiness && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#1976D2"
                            style={{ marginLeft: 4 }}
                          />
                        )}
                      </View>
                    </TouchableOpacity>

                    <Text style={styles.dividerText}>/</Text>

                    {/* Business Option */}
                    <TouchableOpacity
                      onPress={() => setPostingAsBusiness(true)}
                      style={[
                        styles.identityOption,
                        postingAsBusiness && styles.identityOptionSelected
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: 110 }}>
                        <Text
                          numberOfLines={1}
                          ellipsizeMode='tail'
                          style={[
                            styles.identityText,
                            postingAsBusiness && styles.identityTextSelected
                          ]}
                        >
                          {user.businessProfile?.name || user.name}
                        </Text>
                        {(user.businessProfile?.name || '').length > 14 && (
                          <Tooltip
                            popover={<Text style={{ fontSize: 15 }}>{user.businessProfile?.name}</Text>}
                            backgroundColor="#fff"
                          >
                            <Ionicons
                              name="information-circle-outline"
                              size={16}
                              color="#888"
                              style={{ marginLeft: 3 }}
                            />
                          </Tooltip>
                        )}
                        {/* Show checkmark if selected */}
                        {postingAsBusiness && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#1976D2"
                            style={{ marginLeft: 4 }}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <TextInput
                    multiline
                    placeholder={i18n.t('postPlaceholder')}
                    maxLength={500}
                    style={{height: 150}}
                    value={postText}
                    onChangeText={(text) => {
                      setPostText(text);
                      setCharCount(text.length); // Update character count as user types
                    }}
                  />
                  <Text style={styles.charCount}>
                    {charCount} / 500
                  </Text>
                </View>

                {/* Image Preview */}
                {imageUri && (
                  <View style={styles.imagePreviewContainer}>
                    <Text style={styles.previewText}>{i18n.t('imagePreview')}</Text>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  </View>
                )}

                {/* Video Preview */}
                {videoUri && (
                  <View style={styles.imagePreviewContainer}>
                    <Text style={styles.previewText}>{i18n.t('videoPreview')}</Text>
                    <Video
                      source={{ uri: videoUri }}
                      rate={1.0}
                      volume={1.0}
                      isMuted={false}
                      shouldPlay
                      isLooping
                      style={styles.videoPreview}
                    />
                  </View>
                )}

                <View style={styles.iconsContainer}>
                  {/* Image picker button */}
                  <TouchableOpacity 
                    onPress={pickImage} 
                    disabled={locationLoading || !isLocationReady || !isCategorySelected || mediaType === 'video'}>
                      <Ionicons 
                        name="image-outline" 
                        size={30} 
                        color={(!isCategorySelected || !isLocationReady || mediaType === 'video') ? "gray" : "#FF9966"} /> 
                  </TouchableOpacity>

                  {/* Video picker button */}
                  {isCategorySelected && isLocationReady && ( isVideoCategory && ( // Show video icon only when category and location are ready
                    <TouchableOpacity onPress={pickVideo} disabled={mediaType === 'image'}>
                      <Ionicons
                        name="videocam"
                        size={30}
                        color={(!isCategorySelected || !isLocationReady || mediaType === 'image') ? "gray" : "#FF9966"} // Gray out if no category or location is ready
                      />
                    </TouchableOpacity>
                  ))}

                  {locationIconVisible ? (
                    <TouchableOpacity onPress={handleAddLocation}>
                      {locationLoading ? (
                        <ActivityIndicator size="small" color="blue" />
                      ) : (
                        <Ionicons name="location-outline" size={28} color="#b388ff" />
                      )}
                    </TouchableOpacity>
                  ) : (
                    location && (
                      <Text style={{ textAlign: 'center', color: '#333', marginTop: 8 }}>
                        📍 {location}
                      </Text>
                    )
                  )}
                </View>

                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedCategory}
                    onValueChange={(itemValue, itemIndex) => setSelectedCategory(itemValue)}
                    enabled={!locationLoading}                  
                    style={styles.pickerStyle}
                  >
                    {Platform.OS !== 'ios' && (
                      <Picker.Item label={i18n.t('selectCategory')} value="" color="grey"/>
                    )}
                    <Picker.Item label={i18n.t('categories.restaurants')} value="restaurants" color="cornflowerblue"/>
                    {!isPeruvian && (
                      <Picker.Item label={i18n.t('categories.universities')} value="universities" color="cornflowerblue"/>
                    )}
                    <Picker.Item label={i18n.t('categories.events')} value="events" color="cornflowerblue"/>
                    <Picker.Item label={i18n.t('categories.music')} value="music" color="cornflowerblue"/>
                    <Picker.Item label={i18n.t('categories.news')} value="news" color="cornflowerblue"/>
                    <Picker.Item label={i18n.t('categories.studyhub')} value="study hub" color="cornflowerblue"/>
                    <Picker.Item label={i18n.t('categories.sports')} value="sports" color='cornflowerblue'/>
                    <Picker.Item label={i18n.t('categories.petpals')} value="petpals" color="cornflowerblue"/>
                    <Picker.Item label={i18n.t('categories.deals')} value="deals" color="cornflowerblue"/>
                    <Picker.Item label={i18n.t('categories.random')} value="random" color="cornflowerblue"/>  
                    <Picker.Item label={i18n.t('categories.ruteros')} value="ruteros" color="cornflowerblue"/>
                    <Picker.Item label={i18n.t('categories.business')} value="business" color="cornflowerblue"/>            
                    <Picker.Item label={i18n.t('categories.tutors')} value="tutors" color="cornflowerblue"/>            
                  </Picker>
                </View>

                {/* Show prompts when category or location is not ready */}
                {!isCategorySelected && (
                  <Text style={styles.categoryPrompt}>{i18n.t('selecCategoryPrompt')}</Text>
                )}

                {locationLoading && (
                  <Text style={styles.locationPrompt}>{i18n.t('waitingForLocation')}</Text>
                )}

                {user?.accountType === 'business' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
                    <Text>{i18n.t('featureOnChannel')}</Text>


                    <Switch 
                      value={isShowcase} 
                      onValueChange={() => {
                        if (!user.businessVerified || !postingAsBusiness) {
                          Toast.show({
                            type: 'error',
                            text1: i18n.t('promoToastTitle'),
                            text2: i18n.t('promoToastMessage'),
                            position: 'bottom',
                            visibilityTime: 3000,
                          });
                          return;
                        }
                        setIsShowcase(prev => !prev);
                      }} 
                    />


                  </View>
                )}

                {user?.accountType === 'business' && (
                  <View style={{ padding: 10, backgroundColor: '#e3f2fd', borderRadius: 10, marginBottom: 15 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>
                      🎁 {i18n.t('promoSettingsTitle') || 'Promo Settings'}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ flex: 1 }}>{i18n.t('enablePromo') || 'Enable Promo:'}</Text>

                      <Switch
                        value={isPromoEnabled}
                        onValueChange={() => {
                          if (!user.businessVerified || !postingAsBusiness) {
                            Toast.show({
                              type: 'error',
                              text1: i18n.t('promoToastTitle'),
                              text2: i18n.t('promoToastMessage'),
                              position: 'bottom',
                              visibilityTime: 3000,
                            });
                            return;
                          }
                          setIsPromoEnabled(prev => !prev);
                        }}
                      />

                    </View>

                    {!user.businessVerified && (
                      <Text style={{ fontSize: 13, color: '#d32f2f', marginBottom: 10 }}>
                        {i18n.t('promoAvailableVerifiedOnly') || 'Only verified business accounts can enable promotions.'}
                      </Text>
                    )}

                    {(isPromoEnabled && user.businessVerified && postingAsBusiness) && (
                      <>
                        <Text style={{
                            fontSize: 12,
                            color: '#FFA000',
                            marginBottom: 8,
                            textAlign: 'center',
                            fontWeight: 'bold',
                          }}>
                          {i18n.t('promoExpiresIn24h', {
                            defaultValue: 'Nota: Cada código o QR de promoción será válido sólo durante 24 horas después de ser reclamado.'
                          })}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 6 }}>{i18n.t('enterStandardPrice')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                          <Text style={{ fontSize: 18, marginRight: 6 }}>{currencyPrefix}</Text>
                          
                          <TouchableOpacity
                            onPress={() => setOriginalPrice(prev => Math.max(0, (prev || 0) - 1))}
                            style={{ padding: 8, backgroundColor: '#e0e0e0', borderRadius: 6 }}
                          >
                            <Ionicons name="remove" size={20} color="#333" />
                          </TouchableOpacity>

                          <TextInput
                            keyboardType="numeric"
                            value={originalPrice?.toString() || ''}
                            onChangeText={(text) => {
                              // Remove anything that's not a digit
                              const sanitized = text.replace(/[^0-9]/g, '');
                              setOriginalPrice(sanitized === '' ? null : Math.max(1, Number(sanitized)));
                            }}
                            style={{
                              width: 80,
                              padding: 6,
                              marginHorizontal: 10,
                              textAlign: 'center',
                              fontSize: 16,
                              backgroundColor: 'white',
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: '#ccc',
                            }}
                          />

                          <TouchableOpacity
                            onPress={() => setOriginalPrice(prev => Math.min(9999, (prev || 0) + 1))}
                            style={{ padding: 8, backgroundColor: '#e0e0e0', borderRadius: 6 }}
                          >
                            <Ionicons name="add" size={20} color="#333" />
                          </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 6 }}>{i18n.t('applyDiscount')}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 10 }}>
                          {[5, 10, 15, 20].map((percentage) => (
                            <TouchableOpacity
                              key={percentage}
                              style={{
                                paddingVertical: 6,
                                paddingHorizontal: 14,
                                borderRadius: 10,
                                backgroundColor: selectedDiscount === percentage ? '#4A90E2' : '#e0e0e0',
                                minWidth: 55,
                                alignItems: 'center',
                              }}
                              onPress={() => {
                                setPromoLabel(`${percentage}%`);
                                setSelectedDiscount(percentage);
                              }}
                            >
                              <Text style={{ color: selectedDiscount === percentage ? 'white' : '#333', fontWeight: 'bold' }}>
                                {percentage}%
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {discountedPrice && originalPrice && selectedDiscount && (
                          <Text style={{ fontSize: 13, color: '#2e7d32', textAlign: 'center', marginBottom: 8, fontWeight: '600' }}>
                            {i18n.t('afterDiscount')}: {currencyPrefix}{discountedPrice}
                          </Text>
                        )}

                        <TextInput
                          placeholder={i18n.t('promoDescription')}
                          value={promoDescription}
                          onChangeText={setPromoDescription}
                          style={{ backgroundColor: 'white', marginBottom: 8, padding: 8, borderRadius: 8 }}
                          maxLength={40}
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                          <TouchableOpacity
                            onPress={() => setPromoTotal(prev => Math.max(1, (prev || 1) - 1))}
                            style={{ padding: 8, backgroundColor: '#e0e0e0', borderRadius: 6, marginRight: 10 }}
                          >
                            <Ionicons name="remove" size={20} color="#333" />
                          </TouchableOpacity>

                          <TextInput
                            keyboardType="numeric"
                            value={promoTotal?.toString() || ''}
                            onChangeText={(text) => {
                              // Remove non-digits
                              const sanitized = text.replace(/[^0-9]/g, '');
                              setPromoTotal(sanitized === '' ? null : Math.max(1, Number(sanitized)));
                            }}
                            style={{
                              width: 60,
                              padding: 6,
                              textAlign: 'center',
                              fontSize: 16,
                              backgroundColor: 'white',
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: '#ccc',
                            }}
                          />

                          <TouchableOpacity
                            onPress={() => setPromoTotal(prev => Math.min(20, (prev || 1) + 1))}
                            style={{ padding: 8, backgroundColor: '#e0e0e0', borderRadius: 6, marginLeft: 10 }}
                          >
                            <Ionicons name="add" size={20} color="#333" />
                          </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 12, marginTop: 6, color: '#555', textAlign: 'center' }}>
                          {i18n.t('promoQuantityNote')}
                        </Text>

                      </>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.buttonContainer}
                  onPress={handleDone}
                  disabled={uploading || locationLoading || !isCategorySelected || !isLocationReady}
                  activeOpacity={0.8} // Optional: Controls the opacity on touch
                >
                  <Text style={styles.buttonText}>{uploading ? i18n.t('uploading') : i18n.t('doneButton')}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, paddingHorizontal: 10 }}>
                  <TouchableOpacity
                    onPress={() => setcommentsEnabled(prev => !prev)}
                    style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginRight:10, 
                    }}
                    hitSlop={{ top:10, bottom: 10, left: 10, right: 10 }} // Increase touch area
                  >
                    <Ionicons
                      name={commentsEnabled ? 'checkbox' : 'square-outline'}
                      size={24}
                      color="#4A90E2"
                    />
                  </TouchableOpacity>

                  <Text style={{ fontSize: 16, color: '#333' }}>
                    {commentsEnabled ? i18n.t('allowComments') : i18n.t('noComments')}
                  </Text>

                </View>

                {user?.accountType === 'individual' && !user?.verifications?.business && (
                    <TouchableOpacity
                      onPress={() => navigationRef.navigate('ApplyBusiness')}
                      style={styles.applyBusinessCard}
                      activeOpacity={0.6}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="briefcase" size={18} color="#1976D2" style={{ marginRight: 6 }} />
                        <Text style={styles.applyBusinessText}>
                          {i18n.t('gotBusinessGetVerified')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
      
              </View>
          </ScrollView>

              {/* ✅ Add this overlay here */}
          {uploading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={{ marginTop: 10, color: 'gray' }}>
                {i18n.t('uploadingMessage') || 'Uploading your post...'}
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
    </SafeAreaView>
    </>
  );
};

export default PostScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 1,
    backgroundColor: '#b2dfdb',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  charCount: {
    textAlign: 'right',
    marginRight: 10, // Adjust as needed
    color: '#666'
  },
  inputContainer: {
    marginTop: 15,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: 'white', // Ensure background matches
  },
  postAsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
    marginHorizontal: 2,
  },
  postAsLabel: {
    marginRight: 8,
    color: '#666',
    fontSize: 14,
  },
  dividerText: {
    marginHorizontal: 6,
    color: '#666',
    fontSize: 18,
    fontWeight: '300',
  },
  applyBusinessCard: {
    marginTop: 18,
    marginBottom: 8,
    paddingVertical: 13,
    paddingHorizontal: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 370,
    borderColor: '#BBDEFB',
    borderWidth: 1,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  applyBusinessText: {
    color: '#1976D2',
    fontSize: 15.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textAlign: 'center',
    lineHeight: 22,
  },
  identityOption: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4fa', // unselected bg
    minWidth: 60,
    maxWidth: 110,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  identityOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
  },
  identityText: {
    fontWeight: 'normal',
    color: '#555',
    fontSize: 15,
  },
  identityTextSelected: {
    fontWeight: 'bold',
    color: '#1976D2',
  },
  textInput: {
    flex: 1,
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    fontSize: 18,
    textAlignVertical: 'top',
    minHeight: 100, // Ensure it's visually sufficient for multiline input
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
    marginBottom: Platform.OS == 'ios' ? '5%': 15,
  },
  imagePreviewContainer: {
    alignItems: 'flex-start',
  },
  previewText: {
    fontSize: 15,
    color: '#666',
    fontStyle: 'italic',
  },
  imagePreview: { 
    width: '100%', 
    height: 150, 
    resizeMode: 'cover', 
    marginTop: 10 
  },
  pickerStyle: {
    height: Platform.OS === 'ios' ? 10 : 50,
    width: '100%',
    color: '#555',
  },
  pickerContainer: {
    marginBottom: Platform.OS === 'ios' ? '20%' : 30,
    marginHorizontal: 20,
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
    borderColor: '#4fc',
    backgroundColor: Platform.OS === 'ios' ? 'transparent': 'azure', // Background color for the picker container
  },
  buttonContainer: {
    marginTop: Platform.OS === 'ios' ? '35%' : 40,
    width: '80%',
    alignSelf: 'center',
    backgroundColor: '#4A90E2', // Set the background color of the button
    padding: 10, // Add padding for the button
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4A90E2',
    alignItems: 'center', // Center the text inside the button
    justifyContent: 'center', // Center the text vertically
  },
  buttonText: {
    color: 'white', // Text color
    fontSize: 20, // Font size
    fontWeight: 'bold', // Font weight
  },
  categoryPrompt: {
    color: 'gray',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20, // Add some padding for better visual alignment
  },
  locationPrompt: {
    color: 'gray',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20, // Add some padding for better visual alignment
  },
  videoPreview: {
    width: '100%',
    height: 200,  // Adjust based on your layout
    marginTop: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});