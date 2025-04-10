import React, {useState, useEffect} from 'react';
import { Modal, View, Text, StyleSheet, Alert, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { usePosts } from '@/contexts/PostsContext';
import i18n from '@/i18n';
import { Timestamp } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import { useUser } from '../src/contexts/UserContext';
import {ref as storageRef, getDownloadURL ,deleteObject, getStorage } from 'firebase/storage';
import { deleteDoc, doc, getDoc} from "firebase/firestore";
import LikeButton from '../src/components/LikeButton';
import Avatar from '../src/components/Avatar';
import { categories } from '@/config/categoryData';
import Trivia from '../src/components/Trivia';
import HistoryTrivia from '@/components/HistoryTrivia';
import { useFocusEffect } from '@react-navigation/native';
import { useTrivia } from '../src/contexts/TriviaContext'; // Make sure this is imported
import NewsFeedContent from '@/components/NewsFeedContent';

type CategoryScreenRouteProp = RouteProp<{ params: { categoryKey: string; title: string; } }, 'params'>;

const CategoryScreen = () => {
    const route = useRoute<CategoryScreenRouteProp>();
    const { posts, setPosts } = usePosts();
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const { categoryKey } = route.params;
    const category = categories.find(cat => cat.key === categoryKey);
    const { user } = useUser();
    const { trivia } = useTrivia(); // Using the trivia context

    const [triviaActive, setTriviaActive] = useState(false);
    const [historyTriviaActive, setHistoryTriviaActive] = useState(false);
    const [isPeruvian, setIsPeruvian] = useState(false);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
          const checkUserCountry = async () => {
            if (user?.uid) {
              const userRef = doc(db, "users", user.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                console.log("Fetched user data on focus:", userData);
                setIsPeruvian(userData.country?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'peru');
            }
            }
          };
      
          checkUserCountry();
        }, [user?.uid])
    );

    // Assuming each post has a 'timestamp' field that's a Date or a number
    const filteredPosts = posts
        .filter(post => post.categoryKey === route.params.categoryKey)
        .sort((a, b) => {
                // Handle potentially null timestamps
                const dateA = a.timestamp ? a.timestamp.toDate() : new Date(0);
                const dateB = b.timestamp ? b.timestamp.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime(); // Sort in descending order
    });

    // Function to handle opening the modal
    const openImageModal = (imageUrl: string | null) => {
        setSelectedImageUrl(imageUrl);
        setModalVisible(true);
    };

    // Function to handle closing the modal
    const closeImageModal = () => {
        setModalVisible(false);
    };

    const toggleTrivia = () => {
        setTriviaActive(!triviaActive);
    };

    const toggleHistoryTrivia = () => {
        console.log("History Trivia button pressed. Current isPeruvian:", isPeruvian);
        if (!isPeruvian) {
            alert("History Trivia is not available in your location");
        } else {
            setHistoryTriviaActive(!historyTriviaActive);
        }
    };

    const formatDate = (timestamp: Timestamp | undefined) => {
        if (!timestamp) return 'Unknown date'; // Handle undefined or null timestamps
        const date = new Date(timestamp.seconds * 1000); // Convert timestamp to Date object
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    useEffect(() => {
        console.log("Current user language:", user?.language);  // Check what language is being set
      }, [user?.language]);

    // Render Trivia with language settings
    const renderTrivia = () => {
        const language = (user?.language || 'en') as 'en' | 'es'; // Assert the type directly here
        console.log("Rendering trivia in language:", language); // Check the actual language being passed
        const triviaData = trivia.filter(t => t.category === "Entertainment: Music"); // You might need to adjust this string
    
        if (triviaData.length === 0) {
            console.log("No trivia data available for category:", categoryKey);
            return <Text>No trivia questions available</Text>;
        }

        return (
            <Trivia 
                triviaData={triviaData} 
                language={language} 
                onTriviaComplete={toggleTrivia} 
            />
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
        // Check if there is an image URL to delete
        if (imageUrl) {
            const storage = getStorage(); // Make sure storage is initialized
            // Create a reference to the file to delete

            console.log("Attempting to delete post:", postId);

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

    return (
        <View style={[styles.container, {backgroundColor: category?.backgroundColor || '#FFF'}]}>
            {/* Add a button in the CategoryScreen render method */}
            {categoryKey === 'music' && !triviaActive && (
                <TouchableOpacity style={styles.triviaButton} onPress={toggleTrivia}>
                    <Text style={styles.triviaButtonText}>{i18n.t('testYourKnowledge')}</Text>
                </TouchableOpacity>
            )}

            {categoryKey === "study hub" && isPeruvian && !historyTriviaActive && (
                <TouchableOpacity style={styles.triviaButton} onPress={toggleHistoryTrivia}>
                    <Text style={styles.triviaButtonText}>{i18n.t('Villareal')}</Text>
                </TouchableOpacity>
            )}

            {triviaActive ? (
                renderTrivia() // Here we call renderTrivia instead of directly using the Trivia component
            ) : historyTriviaActive ? (
                <HistoryTrivia onTriviaComplete={toggleHistoryTrivia} />
            ) : categoryKey === 'news' ? (
                <NewsFeedContent /> // ✅ This renders RSS-based news!
            ) : (
                <FlatList
                    data={filteredPosts}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.postItem}>
                            <View style={styles.userContainer}>
                                <TouchableOpacity onPress={() => openImageModal(item.user?.avatar)}>
                                    {/* <Image source={{ uri: item.user.avatar || undefined }} style={styles.avatar} /> */}
                                    <Avatar key={item.id} name={item.user?.name} imageUri={item.user?.avatar}/>
                                </TouchableOpacity>

                                <View style={styles.postDetails}>
                                    <Text style={styles.userName}>{item.user.name}</Text>   
                                    <Text style={styles.postCity}>{item.city || i18n.t('unknown')}</Text>
                                    <Text style={styles.postTimestamp}>{formatDate(item.timestamp || undefined)}</Text>
                                </View>
                                
                            </View>

                            <Text style={styles.postText}>{item.content}</Text>

                            {item.imageUrl && (
                                <TouchableOpacity onPress={() => openImageModal(item.imageUrl)}>
                                    <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
                                </TouchableOpacity>
                            )}

                            {/* Like Button Component */}
                            <LikeButton postId={item.id} userId={user?.uid || ''} />

                            {/* Allow users to delete their own posts */}
                            {user?.uid == item.user?.uid && (
                                <TouchableOpacity onPress={() => handleDeletePost(item.id, item.imageUrl)} style={styles.deleteButton}>
                                    <Text style={styles.deleteText}>{i18n.t('deletePost')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyCategoryText}>{i18n.t('EmptyCategoryScreen')}</Text>}
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
        </View>
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
    postItem: {
        padding: 8,
        borderTopWidth: 0.5,
        borderTopColor: 'pearl river',
        width: '100%', // Ensure post items take full width
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
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



    refreshButton: {
        marginVertical: 10,
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 5,
    },
    refreshButtonText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
    },
});

export default CategoryScreen;