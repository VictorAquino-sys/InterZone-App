import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Video } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';
import { getAuth } from "firebase/auth";
import { Timestamp, collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db, storage } from '@/config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { checkLocation } from '@/utils/locationUtils';
import { Accuracy } from 'expo-location';
import { useUser } from '@/contexts/UserContext';
import mime from 'mime';
import i18n from '@/i18n';
import * as FileSystem from 'expo-file-system';
import { themeColors } from '@/theme/themeColors';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import type { MapMarker as MapMarkerType } from 'react-native-maps';
import { getReadableVideoPath, saveVideoToAppStorage, validateVideoFile, uploadVideoWithCompression } from '@/utils/videoUtils';
import { isValidFile, showEditor } from 'react-native-video-trim';
import { useTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { RootStackParamList } from '@/navigationTypes';
import ThemedStatusBar from '@/components/ThemedStatusBar';

type ReportScreenProps = NativeStackScreenProps<RootStackParamList, 'ReportScreen'>;

const categories = [
  { key: 'lost_pet', label: i18n.t('report.lostPet', { defaultValue: 'Lost Pet' }) },
  { key: 'missing_person', label: i18n.t('report.missingPerson', { defaultValue: 'Missing Person' }) },
  { key: 'incident', label: i18n.t('report.incident', { defaultValue: 'Incident / Robbery' }) },
];

const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

const ReportScreen: React.FC<ReportScreenProps> = ({ navigation }) => {
  const auth = getAuth();
  const { user } = useUser();
  const [category, setCategory] = useState(categories[0].key);
  const [description, setDescription] = useState('');
  const authUser = auth.currentUser;

  const [imageUri, setImageUri] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const [region, setRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | undefined>(undefined);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const markerRef = useRef<MapMarkerType | null>(null);
  const mapRef = useRef<MapView>(null);
  const [mapSnapshotUri, setMapSnapshotUri] = useState<string | null>(null);

  const { resolvedTheme } = useTheme?.() || {};
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const colors = resolvedTheme ? themeColors[resolvedTheme] : themeColors['light'];
  const isFocused = useIsFocused();

  // Error states for required fields
  const [descriptionError, setDescriptionError] = useState(false);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    // Only for debugging API key issues
    console.log("Google Maps Android API Key:", Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY);
  }, []);

  // useEffect(() => { fetchLocation(); }, []);
  useEffect(() => {
    if (coords) {
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        ...DEFAULT_DELTA,
      });
    }
  }, [coords]);

  // --- Location logic ---
  const fetchLocation = async () => {
    setLocationLoading(true);
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) throw new Error('Location services not enabled.');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied.');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Accuracy.Balanced });

      const { latitude, longitude } = loc.coords;
      setCoords({ latitude, longitude });
      setRegion({ latitude, longitude, ...DEFAULT_DELTA });

          // Animate the map to the new location (add this)
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            ...DEFAULT_DELTA,
          }, 400);
        }
      }, 300); // short delay to ensure region is set

      // Use checkLocation first!
      let label = checkLocation(loc.coords);

      // Fallback: reverse geocode only if checkLocation returns null
      if (!label) {
        const reverse = await Location.reverseGeocodeAsync(loc.coords);

        if (reverse?.length > 0) {
          const { city, region: regionLabel, isoCountryCode } = reverse[0];
          if (isoCountryCode === 'US' && regionLabel) {
            const regionCode = regionLabel.toUpperCase().slice(0, 2);
            label = city ? `${city}, ${regionCode}` : null;
          } else {
            label = city && regionLabel ? `${city}, ${regionLabel}` : null;
          }
        }
      }


      setLocation(label || `Lat:${latitude.toFixed(4)}, Lon:${longitude.toFixed(4)}`);
    } catch (e: any) {
      setLocation(null);
      setCoords(null);
      Alert.alert(i18n.t('locationRequiredTitle') || "Location Needed", e.message || "Could not get location.");
    } finally {
      setLocationLoading(false);
    }
  };

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
      Alert.alert(i18n.t('uploadFailedTitle'), i18n.t('uploadFailedMessage'));
      return null;
    })();
  }

  const resizeImage = async (uri: string): Promise<string> => {
    const resizedPhoto = await manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.7, format: SaveFormat.JPEG }
    );
    return resizedPhoto.uri;
  };

  // ----- Upload with progress bar -----
  const uploadImageToStorage = async (uri: string): Promise<string | null> => {
    if (!uri) {
      console.error("🚫 No URI provided for image upload");
      return null;
    }
    try {
      setUploading(true);
      setUploadProgress(0);

      const exists = await FileSystem.getInfoAsync(uri);
      if (!exists.exists) {
        Alert.alert("Upload Error", "The image file couldn't be accessed. Please try picking it again.");
        return null;
      }

      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExtension = uri.split('.').pop() ?? 'jpg';
      const mimeType = mime.getType(fileExtension) || 'application/octet-stream';

      if (!authUser) {
        Alert.alert("Upload Error", "You must be logged in to upload media.");
        return null;
      }
      const imageName = `allreports_images/${authUser.uid}/${Date.now()}.${fileExtension}`;
      const imageRef = ref(storage, imageName);

      // Progress handler!
      const uploadTask = uploadBytesResumable(imageRef, blob, { contentType: mimeType });

      return await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = snapshot.totalBytes ? snapshot.bytesTransferred / snapshot.totalBytes : 0;
            setUploadProgress(progress);
          },
          (error) => {
            setUploadProgress(0);
            reject(error);
          },
          async () => {
            setUploadProgress(1);
            setImagePath(imageRef.fullPath);
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          }
        );
      });
    } catch (error: any) {
      setUploadProgress(0);
      Alert.alert("Upload Failed", error.message || "An unknown error occurred.");
      return null;
    } finally {
      setUploading(false);
    }
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

  const handleTakeSnapshot = async () => {
    if (mapRef.current) {
      const uri = await mapRef.current.takeSnapshot({
        width: 300,
        height: 300,
        format: 'png',
        quality: 0.8,
        result: 'file'
      });
      setMapSnapshotUri(uri);
    }
  };

  const pickImage = async () => {
    if (imageUri.length >= 3) {
      Alert.alert('Limit reached', 'You can only add up to 3 photos.');
      return;
    }

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

    if (result.canceled || !result.assets || result.assets.length === 0) return;
    try {
      const selectedAsset = result.assets[0];
      const originalUri = selectedAsset.uri;
      const fileName = originalUri.split('/').pop();
      const newUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: originalUri, to: newUri });
      setImageUri(prev => [...prev, newUri]);
      setMediaType('image');
      setVideoUri(null);
    } catch (err) {
      Alert.alert("File Error", "Failed to prepare the image for upload.");
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

    if (result.canceled || !result.assets || result.assets.length === 0) return;
    if (!authUser || !authUser.uid) {
      Alert.alert('Authentication Error', 'Please log in to select a video.');
      return;
    }

    try {
      const rawUri = result.assets[0].uri;
      const duration = result.assets[0].duration ?? 0;

      if (duration / 1000 > 60) {
        const isFileValid = await isValidFile(rawUri);
        if (isFileValid) {
          showEditor(rawUri, { maxDuration: 60, saveToPhoto: true });
        } else {
          Alert.alert("Invalid File", "The selected video cannot be edited.");
        }
        return;
      }
      const readableUri = await getReadableVideoPath(rawUri);
      const isValid = await validateVideoFile(readableUri, duration / 1000);
      if (!isValid) return;

      const savedPath = await saveVideoToAppStorage(readableUri, authUser.uid);
      if (!savedPath) return;
      setVideoUri(savedPath);
      setVideoPath(savedPath);
      setMediaType('video');
      setImageUri([]);
    } catch (err: any) {
      Alert.alert('Video Error', err.message || 'Something went wrong while picking the video.');
    }
  };

  // ----- SUBMIT HANDLER -----
  const handleSubmit = async () => {
    let hasError = false;
    setDescriptionError(false);
    setLocationError(false);
    if (!description.trim()) {
      setDescriptionError(true);
      hasError = true;
    }
    if (!location) {
      setLocationError(true);
      hasError = true;
    }
    if (hasError) {
      Alert.alert('Required', 'Description and location are required.');
      return;
    }
    if (!authUser || !authUser.uid) {
      Alert.alert(i18n.t('authErrorTitle'), i18n.t('authErrorMessage'));
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    let imageUrls: string[] = [];
    let videoUrl = '';
    let videoStoragePath = '';
    let mediaUrl = '';
    let mediaStoragePath = '';
    try {
      // Fetch latest user info
      const userRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userRef);
      const latestUserData = userSnap.exists() ? userSnap.data() : { name: 'Anonymous', avatar: '' };

      // Upload image(s)
      if (mediaType === 'image' && imageUri.length > 0) {
        for (const uri of imageUri) {
          const url = await handleImageUpload(uri);
          if (url) imageUrls.push(url);
        }
      } else if (mediaType === 'video' && videoUri) {
        if (!user) {
          Alert.alert(i18n.t('userContextErrorTitle'), i18n.t('userContextErrorMessage'));
          return;
        }
        // Pass progress callback to setUploadProgress
        const result = await uploadWithRetry(() =>
          uploadVideoWithCompression(videoUri, user, (progress) => setUploadProgress(progress), 'allreports_videos')
        );
        if (result) {
          videoUrl = result.downloadUrl;
          videoStoragePath = result.storagePath;
        }
      }

      // Save the report
      await addDoc(collection(db, "publicReports"), {
        type: category,
        description: description.trim(),
        mediaType: mediaType || "",
        imageUrls: imageUrls,
        mediaUrl: mediaUrl || "",
        videoUrl,
        videoStoragePath,
        mediaStoragePath: mediaStoragePath || "",
        timestamp: Timestamp.now(),
        user: {
          uid: authUser.uid,
          name: latestUserData.name || "",
          avatar: latestUserData.avatar || "",
        },
        createdBy: authUser.uid,
        location,
        coords,
        status: "active"
      });

      // Clean up temp files
      for (const uri of imageUri) {
        if (uri.startsWith('file://') || uri.startsWith('/data/')) {
          try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}
        }
      }
      if (videoUri && (videoUri.startsWith('file://') || videoUri.startsWith('/data/'))) {
        try {
          await FileSystem.deleteAsync(videoUri, { idempotent: true });
        } catch (e) { }
      }

      Alert.alert(i18n.t('report.sentTitle') || 'Report Sent', i18n.t('report.sentMsg') || "Your report was sent successfully!");
      navigation.goBack();

      setDescription('');
      setLocation(null);
      setMediaType(null);
      setCoords(null);
      setImageUri([]);
      setVideoUri(null);
      setVideoPath(null);
      setImagePath(null);
      setUploadProgress(0);
    } catch (err: any) {
      setUploadProgress(0);
      Alert.alert(i18n.t('error'), err.message || 'Could not send report. Try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {isFocused && <ThemedStatusBar />}
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundprofile || "#FFFBEA" }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View style={[styles.container, { backgroundColor: colors.backgroundprofile || "#FFFBEA" }]}>

              <View style={styles.headerContainer}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="arrow-back" size={26} color={colors.text || "#333"} />
                </TouchableOpacity>
                <Text style={styles.screentitle}>{i18n.t('report.newReport') || 'New Report'}</Text>
              </View>

              <View style={styles.categoriesRowWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesRow}
                >
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.categoryButton,
                        category === cat.key && styles.categoryButtonActive
                      ]}
                      onPress={() => setCategory(cat.key)}
                      disabled={uploading}
                    >
                      <Text style={category === cat.key ? styles.categoryTextActive : styles.categoryText}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={[
                styles.inputContainer,
                { backgroundColor: colors.background },
                descriptionError && { borderColor: 'red', borderWidth: 2 }
              ]}>
                <TextInput
                  style={[
                    { height: 100 },
                    { backgroundColor: colors.background },
                    { color: colors.text },
                  ]}
                  placeholder={i18n.t('report.descriptionPlaceholder') || "Brief description..."}
                  placeholderTextColor={colors.placeholder || "#888"}
                  value={description}
                  onChangeText={(txt) => {
                    setDescription(txt);
                    setDescriptionError(false);
                  }}
                  maxLength={500}
                  multiline
                  editable={!uploading}
                />
                <Text style={{ alignSelf: 'flex-end', color: '#AAA', marginBottom: 6, fontSize: 13 }}>{description.length}/500</Text>
              </View>

              {/* Image Preview */}
              {imageUri.length > 0 && (
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  {imageUri.map((uri, idx) => (
                    <View key={idx} style={{ marginRight: 8, position: 'relative' }}>
                      <Image source={{ uri }} style={{ width: 90, height: 90, borderRadius: 8 }} />
                      <TouchableOpacity
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          backgroundColor: '#fff',
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#ccc',
                          zIndex: 2,
                          padding: 2
                        }}
                        onPress={() => setImageUri(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <Ionicons name="close-circle" size={22} color="#E57373" />
                      </TouchableOpacity>
                    </View>
                  ))}
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
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: 0, right: 0,
                      backgroundColor: '#fff', borderRadius: 12,
                      borderWidth: 1, borderColor: '#ccc', zIndex: 2, padding: 2
                    }}
                    onPress={() => { setVideoUri(null); setVideoPath(null); setMediaType(null); }}
                  >
                    <Ionicons name="close-circle" size={22} color="#E57373" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.iconsContainer}>
                <TouchableOpacity
                  onPress={pickImage}
                  disabled={mediaType === 'video' || imageUri.length >= 3}>
                  <Ionicons
                    name="image-outline"
                    size={30}
                    color={(mediaType === 'video' || imageUri.length >= 3) ? "gray" : "#FF9966"} />
                </TouchableOpacity>

                <TouchableOpacity onPress={pickVideo} disabled={mediaType === 'image'}>
                  <Ionicons
                    name="videocam"
                    size={30}
                    color={(mediaType === 'image') ? "gray" : "#FF9966"}
                  />
                </TouchableOpacity>
              </View>

              {/* Location Section */}
              <View style={{ marginTop: 12 }}>
                <Text style={{ marginBottom: 5, color: colors.text || "#333", fontWeight: '500' }}>
                  {i18n.t('report.locationLabel') || 'Location'}
                </Text>

                {/* MODIFIED: Show a button to fetch location */}
                {(!coords || !region) ? (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#E3F2FD',
                      borderRadius: 8,
                      paddingVertical: 12,
                      alignItems: 'center',
                      marginBottom: 10,
                      borderColor: locationError ? 'red' : 'transparent',
                      borderWidth: locationError ? 2 : 0,
                      flexDirection: 'row',
                      justifyContent: 'center'
                    }}
                    onPress={fetchLocation}
                    disabled={locationLoading || uploading}
                  >
                    <Ionicons name="location" size={22} color="#1976D2" />
                    <Text style={{ color: "#1976D2", fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>
                      {i18n.t('report.setLocationBtn') || 'Set your current location'}
                    </Text>
                    {locationLoading && (
                      <ActivityIndicator size="small" color="#1976D2" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                      borderColor: locationError ? 'red' : 'transparent',
                      borderWidth: locationError ? 2 : 0,
                      borderRadius: 8,
                      padding: locationError ? 4 : 0,
                    }}>
                      <Ionicons name="location-outline" size={22} color="#EAB308" style={{ marginRight: 5 }} />
                      <Text style={{ fontSize: 16, color: colors.text || "#444" }}>
                        {location ? location : (i18n.t('report.noLocation') || "Location unavailable")}
                      </Text>
                      <TouchableOpacity
                        onPress={fetchLocation}
                        disabled={uploading || locationLoading}
                        style={{ marginLeft: 8 }}
                      >
                        {locationLoading ? (
                          <ActivityIndicator size="small" color="#1976D2" />
                        ) : (
                          <Ionicons name="refresh" size={20} color="#1976D2" />
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 6 }}>
                      {['standard', 'hybrid', 'satellite'].map(type => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setMapType(type as any)}
                          disabled={locationLoading}
                          style={{
                            paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
                            backgroundColor: mapType === type ? '#fde68a' : '#f3f4f6', marginHorizontal: 4
                          }}
                        >
                          <Text style={{ color: mapType === type ? '#D97706' : '#333' }}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={{ marginTop: 6, marginBottom: 12, borderRadius: 14, overflow: 'hidden' }}>
                      <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={{ width: '100%', height: 200 }}
                        region={region}
                        mapType={mapType}
                        showsUserLocation={true}
                        onRegionChangeComplete={setRegion}
                        scrollEnabled={true}
                        zoomEnabled={true}
                        pitchEnabled={false}
                        rotateEnabled={false}
                      >
                        {coords && (
                          <Marker
                            ref={markerRef as any}
                            coordinate={coords}
                            draggable
                            onDragEnd={e => {
                              const { latitude, longitude } = e.nativeEvent.coordinate;
                              setRegion(region ? { ...region, latitude, longitude } : undefined);
                              setCoords({ latitude, longitude });
                              // Animate to new marker
                              setTimeout(() => {
                                if (mapRef.current) {
                                  mapRef.current.animateToRegion({
                                    latitude,
                                    longitude,
                                    ...DEFAULT_DELTA,
                                  }, 400);
                                }
                              }, 200);
                            }}
                          >
                            <Callout>
                              <Text>{i18n.t('report.dragToExact') || 'Drag marker to exact spot'}</Text>
                            </Callout>
                          </Marker>
                        )}
                      </MapView>

                      {mapSnapshotUri && <Image source={{ uri: mapSnapshotUri }} style={{ width: 100, height: 100 }} />}
                      <TouchableOpacity onPress={handleTakeSnapshot} style={{ marginTop: 8, alignSelf: 'center' }}>
                        <Text style={{ color: "#1976D2" }}>Take Snapshot</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          position: 'absolute', bottom: 16, right: 16,
                          backgroundColor: '#fff', borderRadius: 20, padding: 8, elevation: 4,
                          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
                        }}
                        onPress={fetchLocation}
                        disabled={locationLoading}
                      >
                        <Ionicons name="locate" size={22} color="#1976D2" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              {/* --- Progress Bar --- */}
              {uploading && (
                <View style={{ marginVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#1976D2', marginBottom: 4 }}>
                    {Math.round(uploadProgress * 100)}%
                  </Text>
                  <View style={{
                    height: 8,
                    width: '80%',
                    backgroundColor: '#f3f4f6',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      width: `${uploadProgress * 100}%`,
                      height: '100%',
                      backgroundColor: '#1976D2',
                      borderRadius: 10,
                    }} />
                  </View>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[
                  styles.submit,
                  uploading && { backgroundColor: '#FFD580' },
                  (!description.trim() || !location) && { opacity: 0.5 }
                ]}
                onPress={handleSubmit}
                disabled={uploading || !description.trim() || !location}
              >
                {uploading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 10 }} />
                    <Text style={styles.submitText}>
                      {i18n.t('uploading') || "Uploading..."}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>
                    {i18n.t('report.submit') || "Send Report"}
                  </Text>
                )}
              </TouchableOpacity>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default ReportScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fffbe8',
    paddingTop: 0,
    paddingBottom: 1,
  },
  screentitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 0,
    marginBottom: 12,
    color: '#D97706',
    textAlign: 'center'
  },
  headerContainer: {
    marginTop: 1,
    marginBottom: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 0,
  },
  imagePreviewContainer: {
    alignItems: 'flex-start',
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
    marginBottom: Platform.OS == 'ios' ? '1%' : 15,
  },
  previewText: {
    fontSize: 15,
    color: '#666',
    fontStyle: 'italic',
  },
  categoriesRowWrapper: {
    marginBottom: 22,
    marginTop: 0,
  },
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingLeft: 0,
  },
  categoryButton: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 16, backgroundColor: '#f3f4f6', marginRight: 8 },
  categoryButtonActive: { backgroundColor: '#fde68a' },
  categoryText: { color: '#444', fontWeight: '500' },
  categoryTextActive: { color: '#D97706', fontWeight: 'bold' },
  inputContainer: {
    marginTop: 15,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: 'white',
  },
  input: { borderColor: '#fde68a', borderWidth: 1, borderRadius: 10, backgroundColor: '#fffde4', padding: 10, marginBottom: 2, minHeight: 56, textAlignVertical: 'top', fontSize: 16 },
  mediaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  removeMedia: { marginLeft: 16 },
  preview: { width: 110, height: 110, borderRadius: 12, marginVertical: 10, alignSelf: 'center' },
  videoPreview: { alignItems: 'center', marginVertical: 10 },
  submit: { backgroundColor: '#D97706', borderRadius: 16, paddingVertical: 15, marginTop: 22, marginBottom: 16 },
  submitText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 18 }
});
