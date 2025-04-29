import React, { useContext, useState, useEffect, useRef, FunctionComponent } from 'react';
import { ScrollView, KeyboardAvoidingView, View, TextInput, TouchableOpacity, Text, StyleSheet, Button, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { usePosts } from '../../src/contexts/PostsContext';
import { useUser } from '../../src/contexts/UserContext'; // Import useUser hook
import { db } from '../../src/config/firebase';
import { getAuth, User as FirebaseUser } from "firebase/auth";
import { Timestamp, collection, addDoc, doc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import i18n from '@/i18n';
import { Accuracy } from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import mime from 'mime';
import { useFocusEffect } from '@react-navigation/native';
import { checkLocation } from '../../src/utils/locationUtils';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../../src/navigationTypes';
import { ContentType } from 'expo-clipboard';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';

type PostScreenProps = BottomTabScreenProps<TabParamList, 'PostScreen'>;

const PostScreen: FunctionComponent<PostScreenProps> = ({ navigation }) => {
  const auth = getAuth();
  const authUser = auth.currentUser;

  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [postText, setPostText] = useState<string>('');
  const [charCount, setCharCount] = useState<number>(0); 
  const [city, setCity] = useState<string | null>(null); // To store the city name
  const [location, setLocation] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null); // Video path state
  const [videoUri, setVideoUri] = useState<string | null>(null); // Store video URI
  const [imageUri, setImageUri] = useState<string | null>(null); // Store post image URI
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null); // New state to track media type
  const [uploading, setUploading] = useState<boolean>(false);  // Track image upload status

  const [locationIconVisible, setLocationIconVisible] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string | null>('');

  // Check if the category supports video posts
  const isVideoCategory = selectedCategory === 'business' || selectedCategory === 'music' || selectedCategory === "tutors";

  // Disable the icons if no category is selected
  const isVideoCategorySelected = selectedCategory !== '';

  // Disable the image and video picker if no category is selected or location is still loading
  const isCategorySelected = selectedCategory !== '';
  const isLocationReady = !locationLoading;

  const { user } = useUser(); // Use the useUser hook
  const { setPosts } = usePosts();
  const storage = getStorage();

  console.log("PostScreen");

  // Asynchronous function to upload image and return the download URL
  const uploadImageToStorage = async (uri:string): Promise<string | null> => {
    if (!uri) {
      console.error("No URI provided for upload");
      return null;
    }
    
    try {
        setUploading(true);
        console.log("Preparing to fetch the image blob from URI");

        const response = await fetch(uri);
        const blob = await response.blob();

        if(!blob || blob.size === 0) {
          console.error("Blob is empty or Failed to create blob from URI:", uri);
          return null;
        }

        console.log("setting timeout to 5000");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract the file extension and set MIME type
        const fileExtension = uri.split('.').pop() ?? 'jpg';
        const mimeType = mime.getType(fileExtension) || 'application/octet-stream'; // Fallback to binary if unknown

        if (!authUser) {
          console.error("Authentication required for uploading images.");
          return null; // or handle it by showing an error message
        }
        const imageName = `postImages/${authUser.uid}/${Date.now()}.${fileExtension}`;
        const imageRef = ref(storage, imageName);

        console.log("Starting upload for image:", imageName, "with MIME type", mimeType);

        await uploadBytes(imageRef, blob, { contentType: mimeType });
        setImagePath(imageRef.fullPath); // ✅ Store full path for cleanup

        const downloadUrl = await getDownloadURL(imageRef);
        console.log("Image uploaded successfully:", downloadUrl);

        return downloadUrl;
    } catch (error: any) {
        console.error("Error uploading image:", error);
        if (error.code) {
          console.error("Firebase error code:", error.code);
        }
        Alert.alert("Upload Error", (error as Error).message || "Unknow error occurred");
        return null;
    } finally {
        setUploading(false);
    }
  };

  const clearCache = async () => {
    try {
      const cacheUri = videoUri;
      if (cacheUri) {
        await FileSystem.deleteAsync(cacheUri);  // Remove the cached file
        console.log("Cache cleared for file:", cacheUri);
      }
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  };

  const uploadVideoToStorage = async (uri:string): Promise<string | null> => {
    if(!uri) {
      console.error("No URI provided for upload");
      return null;
    }

    try {
      setUploading(true);
      console.log("Preparing the fetch the video blob from URI");

      console.log("Before fetch");

      const response = await fetch(uri);
      const blob = await response.blob();

      console.log("After fetch");

      if (!response.ok) {
        console.error("Failed to fetch the video from URI:", uri);
        throw new Error("Failed to fetch video");
      }


      if(!blob || blob.size === 0) {
        console.error("Blob is empty or failed to create blob from URI:", uri);
        return null;
      }

      console.log("setting timeout to 5000");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("Video blob created successfully, preparing upload...");

      // Extract the file extension and set MIME type for video
      const fileExtension = uri.split('.').pop() ?? 'mp4';
      const mimeType = mime.getType(fileExtension) || 'application/octet-stream';

      if (!authUser) {
        console.error("Authentication required for uploading videos.");
        return null;
      }

      // Generate a unique path for the video upload in FIrebase Storage
      const videoName = `postVideos/${authUser.uid}/${Date.now()}.${fileExtension}`;
      const videoRef = ref(storage, videoName);

      console.log("Starting video upload for:", videoName, "with MIME type", mimeType);

      // Upload the video blob to Firebase Storage
      await uploadBytes(videoRef, blob, { contentType: mimeType });
      setVideoPath(videoRef.fullPath); // Store video path for future use or deletion

      // Get the download URL of the uploaded video
      const downloadUrl = await getDownloadURL(videoRef);
      console.log("Video uploaded successfully:", downloadUrl);

      return downloadUrl; // Return the download URL of the video
    } catch (error: any) {
      console.error("Error uploading video:", error);
      if (error.code) {
        console.error("Firebase error code:", error.code);
      }
      Alert.alert("Upload Error", (error as Error).message || "Unknown error occurred");
      return null;
    } finally {
      setUploading(false);
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

    if (!result.canceled) {
      setImageUri(result.assets[0].uri); // Store selected image URI
      setMediaType('image'); // Set media type to image
      setVideoUri(null); // Clear video URI if image is selected
      // handleImageUpload(result.assets[0].uri); // Pass URI to function, ensuring it's a string
    } else {
      console.log('Image picker was canceled or no image was selected');
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


    if (!authUser || !authUser.uid) {
      console.error("User is not authenticated!");
      return;
    }

    console.log("User UID:", authUser.uid);
    console.log("Uploading to path: postVideos/" + authUser.uid + "/..." );

    if (!result.canceled) {
      const videoUri = result.assets[0].uri;
      let videoDurationInMillis = result.assets[0].duration ?? 0; // Duration in milliseconds
  
      // Ensure duration is a valid number and convert to seconds
      if (typeof videoDurationInMillis === 'number') {
        const videoDurationInSeconds = videoDurationInMillis / 1000; // Convert from milliseconds to seconds
        console.log('Video Duration (seconds):', videoDurationInSeconds);
  
        // Check if the video duration is greater than 4 minutes (240 seconds)
        if (videoDurationInSeconds > 240) {
          Alert.alert('Video too long', 'Please select a video that is no longer than 4 minutes.');
          return; // Prevent further actions if the video is too long
        }
  
        setVideoUri(videoUri); // Store the selected video URI
        setMediaType('video'); // Set media type to video
        setImageUri(null); // Clear image URI if video is selected
        console.log('Video selected:', videoUri);
  
        // Proceed with video upload
        // const videoUrl = await handleVideoUpload(videoUri);
        // console.log('Video uploaded to Firebase:', videoUrl);
      } else {
        Alert.alert('Error', 'The video duration is invalid.');
      }
    } else {
      console.log('Video picker was canceled or no video was selected');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLocationIconVisible(true); // Reset icon visibility
      setLocation(null);            // Reset location text
    }, [])
  );  

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

    if (!selectedCategory) {
      Alert.alert(i18n.t('categoryRequired'), i18n.t('selectCategory'));
      return;
    }

    if (mediaType === null) {
      Alert.alert("Media Error", "Please select either an image or a video, not both.");
      return;
    }

    setUploading(true);

    try {
      // Fetch the latest user data from Firestore
      const userRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userRef);

      const latestUserData = userSnap.exists() ? userSnap.data() : { name: 'Anonymous', avatar: '' };

      // Upload image if provided
      let imageUrl = "";
      let videoUrl = "";

      if (mediaType === 'image' && imageUri) {
        console.log("Resizing and uploading image...");
        imageUrl = await uploadImageToStorage(imageUri) || '';
      } else if (mediaType === 'video' && videoUri) {
        videoUrl = await uploadVideoToStorage(videoUri) || '';
        console.log("Uploading video...");
      }


      // Create post with latest user data
      const postData = {
        city: location,
        content: postText,
        timestamp: Timestamp.fromDate(new Date()),
        imageUrl: imageUrl || "", // Attach uploaded image URL
        imagePath: imagePath || "",
        videoUrl: videoUrl || "", // Attach uploaded video URL
        videoPath: videoPath || "", // Store video path for later use
        user: {
          uid: authUser.uid,
          name: latestUserData.name || "Anonymous", // Use updated name
          avatar: latestUserData.avatar || "", 
        },
        categoryKey: selectedCategory,
        commentCount: 0
      };

      // Add post to Firestore
      const docRef = await addDoc(collection(db, "posts"), postData);
      console.log("Post added successfully with ID:", docRef.id);

      // Update local state
      setPosts(prevPosts => [{ id: docRef.id, ...postData }, ...prevPosts]);

      // Reset UI state
      navigation.goBack();
      setPostText(''); // Clear the input field
      setLocation(null);
      setImageUri(null);
      setImagePath(null);      // ✅ Clear stored image path
      setVideoUri(null); // Clear stored video URI
      setVideoPath(null); // Clear video path
      setSelectedCategory(''); // ✅ Reset selected category
      setMediaType(null); // Reset media type
    } catch (error: any) {
      console.error("Error adding post: ", error);
      Alert.alert("Upload Error", (error as Error).message || "Unknow error occurred");
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? "padding": undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1}}>
        <View style={styles.container}>
          <Text style={styles.screenTitle}>{i18n.t('createPost')}</Text>

          <View style={styles.inputContainer}>
            <TextInput
              multiline
              placeholder={i18n.t('postPlaceholder')}
              maxLength={300}
              style={{height: 150}}
              value={postText}
              onChangeText={(text) => {
                setPostText(text);
                setCharCount(text.length); // Update character count as user types
              }}
            />
            <Text style={styles.charCount}>
              {charCount} / 300
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
                  <Ionicons name="location-outline" size={28} color="#009999" />
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
              <Picker.Item label={i18n.t('selectCategory')} value="" color="grey"/>
              <Picker.Item label={i18n.t('categories.restaurants')} value="restaurants" color="cornflowerblue"/>
              <Picker.Item label={i18n.t('categories.events')} value="events" color="cornflowerblue"/>
              <Picker.Item label={i18n.t('categories.music')} value="music" color="cornflowerblue"/>
              <Picker.Item label={i18n.t('categories.news')} value="news" color="cornflowerblue"/>
              <Picker.Item label={i18n.t('categories.studyhub')} value="study hub" color="cornflowerblue"/>
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

          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={handleDone}
            disabled={uploading || locationLoading || !isCategorySelected || !isLocationReady}
            activeOpacity={0.8} // Optional: Controls the opacity on touch
          >
            <Text style={styles.buttonText}>{uploading ? "Uploading..." : i18n.t('doneButton')}</Text>
          </TouchableOpacity>
        </View>
    </ScrollView>
  </KeyboardAvoidingView>
  );
};

export default PostScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: '8%',
    backgroundColor: 'seashell',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
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
    borderColor: '#ccc',
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
});