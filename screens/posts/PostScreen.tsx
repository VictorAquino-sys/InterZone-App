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
import i18n from '../../src/i18n';
import { Picker } from '@react-native-picker/picker';
import mime from 'mime';
import { checkLocation } from '../../src/utils/locationUtils';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../../src/navigationTypes';

type PostScreenProps = BottomTabScreenProps<TabParamList, 'PostScreen'>;

const PostScreen: FunctionComponent<PostScreenProps> = ({ navigation }) => {
  const auth = getAuth();
  const authUser = auth.currentUser;

  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [postText, setPostText] = useState<string>('');
  const [charCount, setCharCount] = useState<number>(0); 
  const [location, setLocation] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null); // Store post image URI
  const [uploading, setUploading] = useState<boolean>(false);  // Track image upload status

  const [selectedCategory, setSelectedCategory] = useState<string | null>('');
  // const pickerRef = useRef<Picker<string> | null>(null);  // Use generic to specify the element type

  const { user } = useUser(); // Use the useUser hook
  const { setPosts } = usePosts();
  const storage = getStorage();

  console.log("PostScreen");

  // Asynchronous function to upload image and return the download URL
  const uploadImageToStorage = async (uri:string): Promise<string | null> => {
    if (!uri) return null;
    try {
        setUploading(true);
        const response = await fetch(uri);
        const blob = await response.blob();

        // Extract the file extension and set MIME type
        const fileExtension = uri.split('.').pop() ?? 'jpg';
        const mimeType = mime.getType(fileExtension) || 'application/octet-stream'; // Fallback to binary if unknown

        if (!authUser) {
          console.error("Authentication required for uploading images.");
          return null; // or handle it by showing an error message
        }
        const imageName = `postImages/${authUser.uid}/${Date.now()}.${fileExtension}`;
        const imageRef = ref(storage, imageName);

        await uploadBytes(imageRef, blob, { contentType: mimeType });

        const downloadUrl = await getDownloadURL(imageRef);
        console.log("Image uploaded successfully:", downloadUrl);

        return downloadUrl;
    } catch (error: any) {
        console.error("Error uploading image:", error);
        Alert.alert("Upload Error", (error as Error).message || "Unknow error occurred");
        return null;
    } finally {
        setUploading(false);
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
        quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri); // Store selected image URI
    } else {
      console.log('Image picker was canceled or no image was selected');
    }
  };

  const handleAddLocation = async () => {
    setLocationLoading(true); // Start loading when the location fetch begins
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Permission Denied', 'Please enable location permissions in your settings.');
      setLocationLoading(false); // End loading on permission denial
      return;
    }

    try {
      // Fetch current location coordinates
      const currentLocation = await Location.getCurrentPositionAsync({});
      const coords = currentLocation.coords; // Properly define coords

      const reverseGeocodeResults = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude
      });

      // console.log("Location fetched:", reverseGeocodeResults);  // Log fetched location
      // Process reverse geocode results
      if (reverseGeocodeResults.length > 0) {
        const { city, region, isoCountryCode } = reverseGeocodeResults[0];
        let locationDisplay = null;
        if (isoCountryCode == 'US' && region !== null){
          const acronym: string = region.toUpperCase().slice(0, 2);
          locationDisplay = `${city}, ${acronym}`;
          console.log("Testing acronym:", locationDisplay);
        }
        else { 
          locationDisplay = city ? `${city}, ${region}` : checkLocation(coords);
        }
        // const formattedLocation = `${reverseGeocodeResults[0].city}, ${reverseGeocodeResults[0].region}`;
  
        console.log("Display Location:", locationDisplay); // For debugging
        setLocation(locationDisplay);
        Alert.alert(i18n.t('locationAddedTitle'), `${i18n.t('locationAddedMessage')} ${locationDisplay}`);
      } else {
          setLocation("Unknown Location");
          Alert.alert(i18n.t('locationErrorTitle'), i18n.t('locationErrorMessage'));
      }
    } catch (error) {
        console.error("Failed to fetch location or reverse geocode:", error);
        Alert.alert(i18n.t('locationErrorTitle'), i18n.t('locationErrorMessage'));
    } finally {
        setLocationLoading(false); // End loading after fetching location
    }
  };

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

    setUploading(true);

    try {
      // Fetch the latest user data from Firestore
      const userRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userRef);

      const latestUserData = userSnap.exists() ? userSnap.data() : { name: 'Anonymous', avatar: '' };

      // Upload image if provided
      let imageUrl = "";
      if (imageUri) {
        console.log("Uploading image...");
        imageUrl = await uploadImageToStorage(imageUri) || '';
        if (!imageUrl) {
          Alert.alert("Upload Failed", "Could not upload image. Try again.");
          return;
        }
      }

      console.log("Image URL to be stored in Firestore:", imageUrl);

      // Create post with latest user data
      const postData = {
        city: location,
        content: postText,
        timestamp: Timestamp.fromDate(new Date()),
        imageUrl: imageUrl || "", // Attach uploaded image URL
        user: {
          uid: authUser.uid,
          name: latestUserData.name || "Anonymous", // Use updated name
          avatar: latestUserData.avatar || "", 
        },
        categoryKey: selectedCategory
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

          {imageUri && (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.previewText}>{i18n.t('imagePreview')}</Text>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            </View>
          )}

          <View style={styles.iconsContainer}>
            <TouchableOpacity onPress={pickImage} disabled={locationLoading}>
                <Ionicons name="image-outline" size={30} color={locationLoading ? "gray" : "#FF9966"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddLocation}>
              {locationLoading ? (
                <ActivityIndicator  size="small" color="blue" /> // Change to a spinner or different icon color
                ) : (
                <Ionicons name="location-outline" size={28} color="#009999" />
              )}            
            </TouchableOpacity>
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
            </Picker>
          </View>

          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={handleDone}
            disabled={uploading || locationLoading}
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
});