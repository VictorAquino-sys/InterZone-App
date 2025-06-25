import React, {useState, useEffect} from 'react';
import { Modal, View, Text, StyleSheet, Alert, FlatList, Image, TouchableOpacity, ActivityIndicator, Pressable, Platform, ScrollView } from 'react-native';
// import { useRoute, RouteProp } from '@react-navigation/native';
import { usePosts } from '@/contexts/PostsContext';
import i18n from '@/i18n';
// import { Timestamp } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import { useUser } from '../src/contexts/UserContext';
// import {ref as storageRef, getDownloadURL ,deleteObject, getStorage } from 'firebase/storage';
import { deleteDoc, doc, getDoc} from "firebase/firestore";
import DefaultCategoryContent from '@/components/category/DefaultCategoryContent';
import MusicHubContent from '@/components/category/musichubContent';
import { categories } from '@/config/categoryData';
import HistoryTrivia from '@/components/HistoryTrivia';
import { useFocusEffect } from '@react-navigation/native';
import NewsFeedContent from '@/components/NewsFeedContent';
import { logEvent } from '@/utils/analytics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigationTypes'
import StudyHubContent from '@/components/category/studyHubContent';
import { useTheme } from '@/contexts/ThemeContext';
import { themeColors } from '@/theme/themeColors';

const CategoryScreen: React.FC<NativeStackScreenProps<RootStackParamList, 'CategoryScreen'>> = ({ route }) => {
    // const { posts, setPosts } = usePosts();
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const { categoryKey } = route.params;
    const category = categories.find(cat => cat.key === categoryKey);
    const { user } = useUser();

    const [historyTriviaActive, setHistoryTriviaActive] = useState(false);
    const [isPeruvian, setIsPeruvian] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAdminOverrideMsg, setShowAdminOverrideMsg] = useState(false);
    const [checkedPermissions, setCheckedPermissions] = useState(false);
    const { resolvedTheme, toggleTheme } = useTheme();
    const colors = themeColors[resolvedTheme];

    useFocusEffect(
        React.useCallback(() => {
            setCheckedPermissions(false);
            const checkUserPermissions = async () => {
                if (user?.uid) {
                    const userRef = doc(db, "users", user.uid);
                    const userSnap = await getDoc(userRef);
            
                    if (userSnap.exists()) {
                        const userData = userSnap.data();

                        const isFromPeru = userData.country?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'peru';
                        const isAdminUser = user?.claims?.admin === true;
              
                        setIsPeruvian(isFromPeru);
                        setIsAdmin(isAdminUser);
              
                        if (!isFromPeru && isAdminUser) {
                          setShowAdminOverrideMsg(true);
                        } else {
                          setShowAdminOverrideMsg(false);
                        }
                      }
                    }
              
                    if (user?.uid && categoryKey) {
                      await logEvent('category_viewed', {
                        category: categoryKey,
                        user_id: user.uid,
                      });
                    }
                    setCheckedPermissions(true); // set to true when done
                  };

                  setCheckedPermissions(false); // <-- Optionally reset on focus
                  checkUserPermissions();
              }, [user?.uid, categoryKey])
    );

    // Function to handle opening the modal
    const openImageModal = (imageUrl: string | null) => {
        setSelectedImageUrl(imageUrl);
        setModalVisible(true);
    };

    // Function to handle closing the modal
    const closeImageModal = () => {
        setModalVisible(false);
    };

    const toggleHistoryTrivia = () => {
        const isAdmin = user?.claims?.admin === true;

        console.log("History Trivia button pressed. Current isPeruvian:", isPeruvian);
        if (!isPeruvian && !isAdmin) {
            alert("History Trivia is not available in your location");
        } else {
            setHistoryTriviaActive(!historyTriviaActive);
        }
    };

    useEffect(() => {
        console.log("Current user language:", user?.language);  // Check what language is being set
      }, [user?.language]);


    if (!checkedPermissions) {
        // Only show spinner while checking permissions
        return (
          <SafeAreaView style={[styles.container, {backgroundColor: category?.backgroundColor || '#FFF'}]}>
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <ActivityIndicator size="large" color="#26c6da" />
            </View>
          </SafeAreaView>
        );
    }
    

    return (
        <SafeAreaView style={[styles.container, {backgroundColor: colors.background} ]}>

            {/* universities: show Peruvian universities instead of post list */}
            {categoryKey === 'universities' && (isPeruvian || isAdmin) && !historyTriviaActive && (
            <ScrollView 
                contentContainerStyle={{ paddingBottom: 80, backgroundColor: colors.background }}                showsVerticalScrollIndicator={false}
            >
                {showAdminOverrideMsg && (
                <Text style={{ textAlign: 'center', color: colors.text || 'orange', marginBottom: 10 }}>
                  You are seeing this as Admin. This screen is only available for Peruvian users.
                </Text>
                )}
                <StudyHubContent toggleHistoryTrivia={toggleHistoryTrivia} />
            </ScrollView>
            )}

            {categoryKey === 'music' ? (
            <MusicHubContent />
            ) : historyTriviaActive ? (
            <HistoryTrivia onTriviaComplete={toggleHistoryTrivia} />
            ) : categoryKey === 'news' ? (
                <NewsFeedContent /> // ✅ This renders RSS-based news!
            ) : (
                <DefaultCategoryContent
                    onOpenImageModal={openImageModal}
                    categoryKey={categoryKey}
                />
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={closeImageModal}
            >
                <TouchableOpacity style={styles.fullScreenModal} onPress={closeImageModal}>
                    <Image style={styles.fullScreenImage} source={{ uri: selectedImageUrl || undefined }}/>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView >
    );

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: 'azure',
    },
    header: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 12,
    },
    postItem: {
        padding: 12,
        marginHorizontal: 10,
        marginVertical: 8,
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    videoWrapper: {
        marginTop: 10,
        width: '100%',
        height: 200,
        backgroundColor: 'black', // optional, for loading experience
        borderRadius: 10,
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10
    },
    postDetails: {
        marginLeft: 10,
        flexDirection: 'column',
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 16
    },
    postImage: {
        width: '100%',
        height: 200,
        marginTop: 10,
        resizeMode: 'cover'
    },
    postCity: {
        fontSize: 12,
        color: 'gray',
    },
    postTimestamp: {
        fontSize: 11,
        color: 'gray',
    },
    postText: {
        fontSize: 14,
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
    emptyCategoryText: {
        fontSize: 14,
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
    },
    triviaButton: {
        paddingHorizontal: 20,
        width: '60%',
        padding: 10,
        alignSelf: 'center',
        marginVertical: 10,
        backgroundColor: '#26c6da',
        alignItems: 'center',
        borderRadius: 5
    },
    triviaButtonText: {
        color: 'white',
        fontSize: 16,
    },

});

export default CategoryScreen;