import React, { useEffect, useState, useCallback, useContext, FunctionComponent } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, Image, Linking, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, StatusBar } from 'react-native';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView, AnimatePresence } from 'moti';
import { getAuth, signOut, updateProfile } from "firebase/auth";
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../src/contexts/UserContext';
import Avatar from '../src/components/Avatar';
import { db } from '../src/config/firebase';
import { Alert } from 'react-native';
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import Ionicons from '@expo/vector-icons/Ionicons';
import Purchases from 'react-native-purchases';
import i18n from '@/i18n'; 
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import mime from "mime";
import { ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../src/navigationTypes';
import MembershipInfoModal from '@/components/MembershipInfoModal';
import VerifyBusinessButton from '@/components/VerifyBusinessButton';
import { themeColors } from '@/theme/themeColors';
import { useTheme } from '@/contexts/ThemeContext';
import ThemedStatusBar from '@/components/ThemedStatusBar';

type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'ProfileScreen'>;

const ProfileScreen: FunctionComponent<ProfileScreenProps> = ({ navigation }) => {
    const auth = getAuth();
    const authUser = auth.currentUser;
    const storage = getStorage();

    // States for user details
    const [newName, setNewName] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const { user, setUser, refreshUser } = useUser();
    const [loading, setLoading] = useState<boolean>(false);

    const [description, setDescription] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showMembershipModal, setShowMembershipModal] = useState(false);
    const [isPulsing, setIsPulsing] = useState(false);

    const [monthlyPrice, setMonthlyPrice] = useState<string | undefined>(undefined);
    const [yearlyPrice, setYearlyPrice] = useState<string | undefined>(undefined);
    const [offeringsLoading, setOfferingsLoading] = useState(false);

    const verificationTypes: Array<'business' | 'musician' | 'tutor'> = ['business', 'musician', 'tutor'];
    const [unverifiedTypes, setUnverifiedTypes] = useState<Array<'business' | 'musician' | 'tutor'>>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const { resolvedTheme } = useTheme();
    const colors = themeColors[resolvedTheme];

    useEffect(() => {
        navigation.setOptions({
            headerShown: false,
            title: '',
        });
        requestMediaLibraryPermissions();
    }, []);

    useEffect(() => {
        if (user?.verifications) {
          const missing = verificationTypes.filter(type => !user.verifications?.[type]);
          setUnverifiedTypes(missing);
        }
    }, [user]);

    useEffect(() => {
        if (unverifiedTypes.length === 0) return;
      
        const interval = setInterval(() => {
          setCurrentIndex(prev => (prev + 1) % unverifiedTypes.length);
        }, 5000); // rotate every 5 seconds
      
        return () => clearInterval(interval);
      }, [unverifiedTypes.length]);

    const nextType = unverifiedTypes.length > 0 ? unverifiedTypes[currentIndex % unverifiedTypes.length] : null;

    useFocusEffect(
        useCallback(() => {
            refreshUser();
            const fetchProfile = async () => {
                try {// Ensure you have a valid user before proceeding
                    if (authUser) {
                        const userRef = doc(db, "users", authUser.uid);
                        const docSnap = await getDoc(userRef);

                        if (docSnap.exists()) {
                            const userData = docSnap.data();
                            setNewName(userData.name || 'Default Name');
                            setProfilePic(authUser.photoURL || userData.avatar || '');
                            setDescription(userData.description || ''); // <-- New
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch profile data:", error);
                }
            };
            fetchProfile();
        }, [authUser])
    );

    const requestMediaLibraryPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted'){
            alert('Sorry, we need camera roll permissions to make this work!');
        }
    };

    // Save note function
    const handleSaveDescription = async () => {
        if (!authUser) return;

        const trimmed = description.trim();
        const original = user?.description?.trim() || '';

          // 1. Check if there's an actual change
        if (trimmed === original) {
            setIsEditingNote(false);
            Keyboard.dismiss();
            return; // Do nothing if no change
        }

        try {
            setSavingNote(true);
            const userRef = doc(db, "users", authUser.uid);
            await updateDoc(userRef, { description });
            setUser(prev => prev ? { ...prev, description: trimmed } : prev);
            Alert.alert("✅ Note saved!");
        } catch (error) {
            console.error("Error saving description:", error);
            Alert.alert("❌ Failed to save your note.");
        } finally {
            setSavingNote(false);
            setIsEditingNote(false);
            Keyboard.dismiss(); // ⌨️ Dismiss the keyboard
        }
    };

    const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
        try {
          // Fetch current offerings from RevenueCat
          const offerings = await Purchases.getOfferings();
      
          // Pick the right package based on your plan string and RevenueCat config
          let selectedPackage = null;
          if (plan === 'monthly') {
            selectedPackage = offerings.current?.monthly; // This is the default key in RevenueCat
            // Or: selectedPackage = offerings.current.availablePackages.find(pkg => pkg.identifier === 'your_monthly_id');
          } else if (plan === 'yearly') {
            selectedPackage = offerings.current?.annual; // This is the default key in RevenueCat
            // Or: selectedPackage = offerings.current.availablePackages.find(pkg => pkg.identifier === 'your_annual_id');
          }
      
          if (!selectedPackage) {
            alert('No plan found for selection.');
            return;
          }
      
          // Start the purchase
          const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      
          // Check if the entitlement is active
          if (customerInfo.entitlements.active["premium_access"]) {
            setUser(prev => prev ? { ...prev, premium: true } : prev);
            alert('Thank you for subscribing! 🎉');
          } else {
            alert('Subscription was not activated.');
          }
          setShowMembershipModal(false); // Optionally close modal
        } catch (e: any) {
            if (e.userCancelled) {
                Toast.show({
                  type: 'info',
                  text1: 'Purchase cancelled',
                  text2: 'You can subscribe anytime.',
                });
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Subscription failed',
                  text2: e?.message || 'Try again later.',
                });
            }
        }
      };

    const handleLogout = async () => {
        try {
            await signOut(auth); // Sign out the user
            setUser(null); // Clear user state in context
            await AsyncStorage.clear(); // Clear all AsyncStorage items
            // Navigate to Login screen before signing out
            navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }], // Ensure this matches the name in your navigator
            });
            console.log('User has logged out.');
        } catch (error) {
        // An error happened.
            console.error("Logout Error:", error);
            Alert.alert("Error", "There was an error logging out. Please try again.");
        }
    };

    const handleNameProfile = async () => {
        try {
            if (!authUser) return;

            // Update Firebase Auth displayName
            await updateProfile(auth.currentUser, { displayName: newName });
            console.log("Firebase Auth displayName updated:", auth.currentUser.displayName);
    
            // Reference to the Firestore document
            const userRef = doc(db, "users", authUser.uid);
            // Update Firestore and merge data
            await setDoc(userRef, { name: newName }, { merge: true });
            console.log("Firestore profile updated or created.");
    
            // Update user context directly
            setUser(prevUser => prevUser ? {...prevUser, name: newName} : null);
            
            // Update AsyncStorage
            await AsyncStorage.setItem('userName' + authUser.uid, newName);
    
            alert('Profile Updated Successfully');
            setIsEditing(false); // Set editing to false here to switch back to non-edit mode
    
        } catch (error) {
            console.error("Error updating name:", error);
            Alert.alert("Error", "Failed to update name");
        }
    };

    const toggleEdit = () => {
        setIsEditing(!isEditing);
    };

    const handlePremiumPress = async () => {
        setIsPulsing(true);
        setOfferingsLoading(true);
        try {
          const offerings = await Purchases.getOfferings();
          if (offerings.current?.monthly?.product?.priceString) {
            setMonthlyPrice(offerings.current.monthly.product.priceString);
          } else {
            setMonthlyPrice('$4.99'); // fallback
          }
          if (offerings.current?.annual?.product?.priceString) {
            setYearlyPrice(offerings.current.annual.product.priceString);
          } else {
            setYearlyPrice('$29.99');
          }
        } catch (e) {
          setMonthlyPrice('$4.99');
          setYearlyPrice('$29.99');
        } finally {
          setOfferingsLoading(false);
          setShowMembershipModal(true);
        }
      };

    const uploadImageAsync = async (uri: string): Promise<string | null> => {
        if (!uri) return null;
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("No user is currently logged in.");
            return null;
        }
        try {
            setLoading(true); // Start loading
            // Correct the URI for Android file path
            const newImageUri = uri.startsWith('file://') ? uri : `file://${uri.split("file:/").join("")}`;

            const blob = await (await fetch(newImageUri)).blob();
            const storagePath = `profilePictures/${auth.currentUser.uid}`;
            const ref = storageRef(storage, storagePath);

            console.log('Uploading to:', ref.fullPath);  // Ensure path is correct

            const snapshot = await uploadBytes(ref, blob, {
                contentType: mime.getType(newImageUri) || 'application/octet-stream'  // Use mime to get the correct type
            });

            const downloadURL = await getDownloadURL(snapshot.ref);

            // Update the user's profile photoURL with the new image
            updateProfile(auth.currentUser, { photoURL: downloadURL });

            console.log('File available at', downloadURL);

            return downloadURL;
        } catch (error) {
            console.error("Error uploading image: ", error);
            throw new Error("Failed to upload image.");
        } finally {
            setLoading(false); // Stop loading
        }
    };

    const pickImageProfile = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
            });
    
            console.log("ImagePicker Result:", JSON.stringify(result));
    
            if (!result.canceled && result.assets && result.assets[0].uri) {
                console.log("Image URI:", result.assets[0].uri);

                if (!auth.currentUser) {
                    console.error("No user logged in.");
                    Alert.alert("Login Required", "Please log in to upload images.");
                    return;
                }

                const uploadUrl = await uploadImageAsync(result.assets[0].uri);

                if (!uploadUrl) {
                    console.error("Failed to upload image");
                    return;
                }

                // Update both Auth and Firestore with the new profile picture
                await updateProfile(auth.currentUser, { photoURL: uploadUrl });
    
                const userRef = doc(db, "users", auth.currentUser.uid);
                await updateDoc(userRef, { avatar: uploadUrl });  // Update Firestore

                console.log("Image uploaded and URL received:", uploadUrl);

                setProfilePic(uploadUrl); // Update the state and the user context
                setUser(prevUser => prevUser ? { ...prevUser, avatar: uploadUrl } : null ); // Update the user context
            }
        } catch (error) {
            console.error("Failed to pick or upload image: ", error);
            Alert.alert("Upload Error", "Failed to upload image. Please try again.");
        }
    };

    return (
        <>
            <ThemedStatusBar/>
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundprofile}}>

                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <ScrollView
                            contentContainerStyle={[styles.container, { flexGrow: 1 }, { backgroundColor: colors.backgroundprofile}]}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.topSection}>

                                <View style={styles.headerRow}>
                                    <View style={{ flex: 1 }} />
                                    <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsIconContainer}>
                                    <Ionicons name="settings-outline" size={26} color={ colors.iconColor } />
                                    </TouchableOpacity>
                                </View>

                                <MotiView
                                    from={{ scale: 0.7, opacity: 0 }}
                                    animate={{
                                        scale: isPulsing ? 1.15 : 1,
                                        opacity: 1,
                                      }}
                                      transition={{
                                        type: 'spring',
                                        damping: 8,
                                        mass: 1.2,
                                        stiffness: 170,
                                      }}
                                    style={styles.premiumButtonWrapper}
                                    onDidAnimate={(key, finished) => {
                                        if (key === 'scale' && isPulsing && finished) {
                                          setIsPulsing(false); // Reset after pulse
                                        }
                                    }}
                                >

                                <TouchableOpacity
                                    style={styles.premiumButton}
                                    activeOpacity={0.93}
                                    onPress={handlePremiumPress}
                                >
                                    <Ionicons name="trophy" size={24} color="#FFD700" style={styles.premiumIcon} />
                                    <Text style={styles.premiumText}>
                                        {user?.premium ? i18n.t('premiumMember') : i18n.t('getPremium')}
                                    </Text>
                                </TouchableOpacity>
                                </MotiView>

                                <MembershipInfoModal
                                    visible={showMembershipModal}
                                    onClose={() => setShowMembershipModal(false)}
                                    onSubscribe={handleSubscribe}
                                    monthlyPrice={monthlyPrice}
                                    yearlyPrice={yearlyPrice}
                                    loading={offeringsLoading}
                                />

                                <Text style={[styles.title, { color: colors.text}]}>{i18n.t('profileTitle')}</Text>
                            
                                <TouchableOpacity onPress={pickImageProfile}>
                                    <Avatar key={profilePic} name={newName} imageUri={profilePic} size={150} />
                                </TouchableOpacity>
                                
                                {loading && <ActivityIndicator size="large" color="#0000ff" />} 
                                
                                <View style={styles.nameContainer}>
                                    {isEditing ? (
                                        <TextInput
                                            value={newName}
                                            onChangeText={setNewName}
                                            style={[styles.input, { color: colors.text}, {borderColor: colors.border}]}
                                            autoFocus={true}
                                            onBlur={() => setIsEditing(false)}  // Optionally stop editing when input is blurred
                                            maxLength={20}
                                        />
                                    ) : (
                                        <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={[styles.newName, { color: colors.text }]}>{newName}</Text>
                                                <TouchableOpacity onPress={toggleEdit} style={{ marginLeft: 10 }}>
                                                    <Ionicons name="pencil" size={20} color="gray"/>
                                                </TouchableOpacity>
                                            </View>

                                            {user?.verifications?.business && (
                                                <View style={styles.verifiedBadge}>
                                                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={{ marginRight: 6 }}/>
                                                    <Text style={styles.verifiedText}>{i18n.t('businessVerified')}</Text>
                                                </View>
                                            )}

                                            {user?.verifications?.musician && (
                                                <View style={styles.verifiedBadge}>
                                                    <Ionicons name="musical-notes" size={18} color="#3F51B5" style={{ marginRight: 6 }}/>
                                                    <Text style={styles.verifiedText}>{i18n.t('musicianVerified')}</Text>
                                                </View>
                                            )}

                                            {user?.verifications?.tutor && (
                                                <View style={styles.verifiedBadge}>
                                                    <Ionicons name="school" size={18} color="#FF9800" style={{ marginRight: 6 }}/>
                                                    <Text style={styles.verifiedText}>{i18n.t('tutorVerified')}</Text>
                                                </View>
                                            )}

                                        </View>
                                    )}
                                </View>
                                
                                {isEditing && (
                                    <Button title={i18n.t('updateProfileButton')} onPress={handleNameProfile} />
                                )}

                            </View>
                            
                            {/* 📝 Description Editor Section */}
                            <View style={styles.descriptionWrapper}>
                                <Text style={[styles.label, { color: colors.text }]}>{i18n.t('yourNote')}</Text>

                                {isEditingNote ? (
                                    <>
                                    <TextInput
                                        style={[styles.descriptionInput, {color: colors.text}, {borderColor: colors.border}, {backgroundColor: colors.card}]}
                                        // placeholderTextColor={colors.placeholder}                   
                                        multiline
                                        maxLength={80}
                                        placeholder={i18n.t('descriptionPlaceholder')}
                                        value={description}
                                        onChangeText={setDescription}
                                    />
                                    <View style={styles.characterCountWrapper}>
                                        <Text style={[styles.characterCount, { color: colors.text }]}>{description.length}/80</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={handleSaveDescription}
                                        style={styles.saveButton}
                                        disabled={savingNote}
                                    >
                                        <Text style={styles.saveButtonText}>
                                            {savingNote ? i18n.t('saving') : i18n.t('saveNote')}
                                        </Text>
                                    </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={styles.noteRow}>
                                        <Text style={[styles.noteText, { color: colors.text }]}>
                                            {description ? description : i18n.t('noNote')}
                                        </Text>
                                        <TouchableOpacity onPress={() => setIsEditingNote(true)}>
                                            <Ionicons name="create-outline" size={20} color="#4A90E2" style={{ marginLeft: 8 }} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <Modal transparent visible={showSettings} animationType="slide">
                                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setShowSettings(false)}>
                                    <View style={styles.modalBox}>
                                        <Text style={styles.modalTitle}>{i18n.t('settings.title')}</Text>
                                        <TouchableOpacity style={styles.modalOption} onPress={() => {
                                            setShowSettings(false);
                                            navigation.navigate('DeleteAccount');
                                        }}>
                                            <Text style={{ color: 'red', fontWeight: 'bold', textAlign: 'center' }}>{i18n.t('deleteAccount.button')}</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => Linking.openURL('https://doc-hosting.flycricket.io/interzone-privacy-policy/27db818a-98c7-40d9-8363-26e92866ed5b/privacy')}
                                            style={[styles.modalOption, { marginTop: 20 }]}
                                        >
                                        <Text style={{ color: '#007aff', textAlign: 'center' }}>
                                            {i18n.t('privacyPolicy')}
                                        </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={() => setShowSettings(false)}>
                                            <Text style={{ marginTop: 12, textAlign: 'center', color: '#555' }}>{i18n.t('cancel')}</Text>
                                        </TouchableOpacity>

                                    </View>
                                </TouchableOpacity>
                            </Modal>

                            <View style={styles.bottomSection}>

                                {user?.businessVerified && (
                                <TouchableOpacity
                                    style={[styles.buttonContainer, { backgroundColor: '#009688' }]}
                                    onPress={() => navigation.navigate('EditBusinessProfile')}
                                >
                                    <Text style={styles.buttonText}>{i18n.t('editBusinessProfile')}</Text>
                                </TouchableOpacity>
                                )}

                                <View style={styles.verificationButtonWrapper}>
                                    { unverifiedTypes.length > 0 && nextType && (
                                    <VerifyBusinessButton
                                        type={nextType}
                                        onPress={() => navigation.navigate('VerifyBusiness', { type: nextType })}
                                    />
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={styles.buttonContainer} // Additional top margin for separation
                                    onPress={handleLogout}
                                >
                                    <Text style={styles.buttonText}>{i18n.t('logoutButton')}</Text>
                                </TouchableOpacity>

                                {user?.claims?.admin && (
                                <>
                                    <View style={{ marginVertical: 20 }}>
                                    <Text style={[{ fontWeight: '600', fontSize: 16, marginBottom: 10 }, { color: colors.text }]}>
                                        Admin Controls
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.buttonContainer, { backgroundColor: '#222' }]}
                                        onPress={() => navigation.navigate('AdminDashboard')}
                                    >
                                        <Text style={styles.buttonText}>🛠 Admin Dashboard</Text>
                                    </TouchableOpacity>
                                    </View>
                                </>
                                )}

                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
            </SafeAreaView>
        </>
    );
};

export default ProfileScreen;

const styles = StyleSheet.create({
    container:{
        alignItems: 'center',
        // padding: 10,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 1,
        backgroundColor: 'aliceblue',
    },
    topSection: {
        alignItems: 'center',
        marginTop: 2,  // Push top section slightly down
        position: 'relative',
    },
    headerRow: {
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 4,
    },
    settingsIconContainer: {
        position: 'absolute',
        top: 6,
        right: 4,
        zIndex: 2,
    },
    bottomSection: {
        alignItems: 'center',
        marginTop: 14,  // Add spacing between sections
        marginBottom: 40, // Push the bottom stuff down
    },
    profilePic: {
        width: 150,
        height: 150,
        borderRadius: 75, // Makes image round
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd' // Optional: adds a border for better visibility
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        marginBottom: 15,   // Corrected from 'marginButtom
    },
    nameContainer: {
        marginBottom: 20,
        marginTop: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    newName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 25,
        // marginTop: 10,
    },
    input: {
        fontSize: 18,
        marginBottom: 20,
        borderWidth: 1,
        padding: 10,
        width: '100%',
    },
    characterCountWrapper: {
        alignSelf: 'flex-end',
        marginBottom: 4,
        marginTop: -8,
        paddingRight: 4,
    },
    characterCount: {
        fontSize: 12,
        color: '#666',
    },
    buttonContainer: {
        backgroundColor: '#4A90E2',
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    descriptionWrapper: {
        width: '100%',
        marginTop: 3,
        marginBottom: 12,
        paddingLeft: 20,
        paddingRight: 20,
    },
    noteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    noteText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        fontStyle: 'italic',
        paddingVertical: 4,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 10,
        marginBottom: 8,
    },
    descriptionInput: {
        width: '100%',
        minHeight: 80,
        padding: 12,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 10,
        textAlignVertical: 'top',
        // backgroundColor: 'white',
        fontSize: 14,
        marginBottom: 12,
    },
    saveButton: {
        backgroundColor: '#007aff',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignSelf: 'center',
        minWidth: 160,              // Prevents it from being too small
        maxWidth: '80%',            // Prevents it from being too wide
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 30,
      },
    modalBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalOption: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#e0f8e9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },      
    verifiedText: {
        color: '#2E7D32',
        fontWeight: '600',
        fontSize: 15,
    },
    verificationButtonWrapper: {
        marginTop: 10,
        marginBottom: 10,
        alignItems: 'center',
        width: '100%',
    },
    premiumButtonWrapper: {
        width: '100%',
        alignItems: 'center',
        marginTop: 1,
        marginBottom: 5,
      },
      premiumButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbe6',
        borderRadius: 30,
        paddingVertical: 10,
        paddingHorizontal: 22,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
        elevation: 6,
        borderWidth: 1.5,
        borderColor: '#FFE066',
        minHeight: 44,
      },
      premiumIcon: {
        marginRight: 12,
        marginLeft: 2,
      },
      premiumText: {
        fontWeight: '700',
        color: '#b8860b',
        fontSize: 17,
        letterSpacing: 0.2,
      },

});