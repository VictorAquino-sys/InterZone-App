import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { collection, query, where, getDocs, orderBy, limit, getDoc, FieldValue, deleteField } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Post } from '@/contexts/PostsContext';
import { User } from '@/contexts/UserContext';
import { useUser } from '@/contexts/UserContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../src/navigationTypes';
// import PostCard from '@/components/PostCard';
import Avatar from '@/components/Avatar';
import Ionicons from '@expo/vector-icons/Ionicons';
import BusinessPostCard from '@/components/businessPostCard';
import { updateDoc } from 'firebase/firestore';
import * as RNLocalize from 'react-native-localize';
import i18n from '@/i18n'; 
import { deleteDoc, doc } from 'firebase/firestore';
import BusinessReviewListModal from '@/components/BusinessReviewListModal';
import BusinessRatingModal from '@/components/businessRatingModal';
import { useNavigation } from '@react-navigation/native';
import { deleteImageFromStorage } from '@/utils/storageUtils';
import { setBusinessFeaturedForPosts } from '@/utils/businessStreakUtils';
import { Alert } from 'react-native';

interface BusinessChannelRouteParams {
  businessUid: string;
}

function isFeatureExpired(featuredSince?: string | Date) {
  if (!featuredSince) return true;
  // If Firestore stores as Timestamp, use .toDate()
  const start = featuredSince instanceof Date ? featuredSince : new Date(featuredSince);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return days > 7;
}

const BusinessChannelScreen = () => {
  const route = useRoute<RouteProp<Record<string, BusinessChannelRouteParams>, string>>();
  const { businessUid } = route.params;
  const { user } = useUser();

  const [business, setBusiness] = useState<User | null>(null);
  const [businessRating, setBusinessRating] = useState<{ average: number; count: number } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReviewList, setShowReviewList] = useState(false);
  const [shouldRefreshReviews, setShouldRefreshReviews] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [featureLoading, setFeatureLoading] = useState(false);
  const locale = RNLocalize.getLocales()[0]?.languageTag || 'en';


  const postStreak = business?.businessProfile?.postStreak;
  const isActuallyFeatured =
    !!postStreak?.isFeatured &&
    postStreak?.featuredSince &&
    !isFeatureExpired(postStreak.featuredSince);

    let expiryDateString = '';
    if (postStreak?.featuredSince) {
      const parsedDate = new Date(postStreak.featuredSince);
      if (!isNaN(parsedDate.getTime())) {
        const expiryDate = new Date(parsedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        expiryDateString = new Intl.DateTimeFormat(locale, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(expiryDate);
      }
    }

  useEffect(() => {
    if (!isActuallyFeatured || !postStreak?.featuredSince) return;
    const expiry = new Date(postStreak.featuredSince).getTime() + 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const msUntilExpire = expiry - now;
    if (msUntilExpire > 0) {
      const timeout = setTimeout(() => {
        setBusiness(prev =>
          prev && prev.businessProfile
            ? {
                ...prev,
                businessProfile: {
                  ...prev.businessProfile,
                  name: prev.businessProfile.name || '',
                  ownerUid: prev.businessProfile.ownerUid || '',
                  avatar: prev.businessProfile.avatar || '',
                  description: prev.businessProfile.description || '',
                  category: prev.businessProfile.category || '',
                  location: prev.businessProfile.location || '',
                  email: prev.businessProfile.email || '',
                  postStreak: {
                    ...prev.businessProfile.postStreak,
                    isFeatured: false,
                    featuredSince: undefined,
                    count: prev.businessProfile.postStreak?.count ?? 0,
                    lastPostDate: prev.businessProfile.postStreak?.lastPostDate || '',
                    city: prev.businessProfile.postStreak?.city || '',
                  },
                },
              }
            : prev // no update if businessProfile missing
        );
        // Fetch latest business data from Firestore
        fetchBusinessData();
      }, msUntilExpire + 1000);
      return () => clearTimeout(timeout);
    }
  }, [isActuallyFeatured, postStreak?.featuredSince]);

  const fetchBusinessData = async () => {
    try {
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', businessUid)));
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data() as User;
        setBusiness(userData);
      }
  
      const postQuery = query(
        collection(db, 'posts'),
        where('user.uid', '==', businessUid),
        where('showcase', '==', true),
        orderBy('timestamp', 'desc'),
        limit(6)
      );
  
      const postSnap = await getDocs(postQuery);
      const businessPosts = postSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(businessPosts);
    } catch (error) {
      console.error("Error loading business data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessData();
    fetchBusinessRating();
  }, [businessUid]);

  useLayoutEffect(() => {
    if (!business || user?.uid === businessUid) return;

      // Use ownerUid from businessProfile, fallback to business.uid if not set
    const ownerUid = business.businessProfile?.ownerUid || business.uid;
  
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('ChatScreen', {
            friendId: ownerUid,
            friendName: business.businessProfile?.name || business.name || 'Business',
          })}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#007aff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, businessUid, business, user?.uid]);

  const fetchBusinessRating = async () => {
    const profileDocRef = doc(db, 'businessProfiles', businessUid);
    const profileSnap = await getDoc(profileDocRef);
    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      setBusinessRating({
        average: profileData.averageRating ?? 0,
        count: profileData.ratingCount ?? 0,
      });
    }
  };

  const handleDeletePost = async (postId: string, imageUrls?: string | string[]) => {
    Alert.alert(
      i18n.t('businessChannel.deleteTitle'),
      i18n.t('businessChannel.deleteMessage'),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: i18n.t('delete'),
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingPostId(postId); // 🔄 start loading
  
              // 🔥 Delete images from storage if present
              if (imageUrls) {
                if (Array.isArray(imageUrls)) {
                  for (const url of imageUrls) {
                    await deleteImageFromStorage(url);
                  }
                } else if (typeof imageUrls === "string") {
                  await deleteImageFromStorage(imageUrls);
                }
              }
  
              // Delete post from Firestore
              await deleteDoc(doc(db, 'posts', postId));
              setPosts(prev => prev.filter(post => post.id !== postId));
            } catch (error) {
              console.error('❌ Error deleting post:', error);
            } finally {
              setDeletingPostId(null); // ✅ stop loading
            }
          },
        },
      ]
    );
  };

  if (loading) {
      return (
      <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007aff" />
      </View>
      );
  }

  if (!business) {
      return (
      <View style={styles.centered}>
          <Text>{i18n.t('businessChannel.businessNotFound')}</Text>
      </View>
      );
  }

  return (
    <View style={styles.container}>
        <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row} // spacing between items
            contentContainerStyle={styles.gridContainer}
            ListHeaderComponent={
                <View style={styles.header}>
                <Avatar name={business.businessProfile?.name || business.name || ''} imageUri={business.businessProfile?.avatar || business.avatar} size={100} />
                <Text style={styles.businessName}>{business.businessProfile?.name || business.name}</Text>
                {business.businessVerified && (
                    <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={{ marginRight: 6 }} />
                    <Text style={styles.verifiedText}>{i18n.t('businessChannel.verifiedBusiness')}</Text>
                    </View>
                )}

                <Text style={styles.description}>
                {business.businessProfile?.description || business.description || i18n.t('businessChannel.noDescription')}
                </Text>

                {/* ⭐️ ADMIN FEATURED BUTTONS BELOW ⭐️ */}
                {user?.claims?.admin && (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 14, marginBottom: 2 }}>
                    {isActuallyFeatured ? (
                      // --- REMOVE FEATURED BUTTON ---
                      <TouchableOpacity
                        style={{ backgroundColor: '#ffebee', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}
                        onPress={async () => {
                          try {
                            await updateDoc(doc(db, 'users', businessUid), {
                              'businessProfile.postStreak.isFeatured': false,
                              'businessProfile.postStreak.featuredSince': deleteField(),
                            });

                            await setBusinessFeaturedForPosts(businessUid, false);
                            await fetchBusinessData();

                            Alert.alert('Removed', 'This business is no longer featured.');
                            setBusiness(prev =>
                              prev
                                ? {
                                    ...prev,
                                    businessProfile: {
                                      ...prev.businessProfile,
                                      name: prev.businessProfile?.name || '',
                                      ownerUid: prev.businessProfile?.ownerUid || '',
                                      avatar: prev.businessProfile?.avatar ?? '',
                                      description: prev.businessProfile?.description ?? '',
                                      category: prev.businessProfile?.category ?? '',
                                      location: prev.businessProfile?.location ?? '',
                                      email: prev.businessProfile?.email ?? '',
                                      postStreak: {
                                        ...prev.businessProfile?.postStreak,
                                        isFeatured: false,
                                        featuredSince: undefined,
                                        count: prev.businessProfile?.postStreak?.count ?? 0,
                                        lastPostDate: prev.businessProfile?.postStreak?.lastPostDate ?? '',
                                        city: prev.businessProfile?.postStreak?.city ?? '',
                                      },
                                    },
                                  }
                                : prev
                            );
                          } catch (error) {
                            Alert.alert('Error', 'Failed to remove feature status.');
                            console.log(error);
                          }
                        }}
                      >
                        <Text style={{ color: '#c62828', fontWeight: '700' }}>Remove Featured</Text>
                      </TouchableOpacity>
                    ) : (
                      // --- SET AS FEATURED BUTTON ---
                      <TouchableOpacity
                        disabled={featureLoading}
                        style={{ 
                          backgroundColor: '#e8f5e9', 
                          paddingHorizontal: 14, 
                          paddingVertical: 8, 
                          borderRadius: 12,     
                          opacity: featureLoading ? 0.5 : 1
                        }}
                        onPress={async () => {
                          setFeatureLoading(true);

                          try {
                            const now = new Date();
                            await updateDoc(doc(db, 'users', businessUid), {
                              'businessProfile.postStreak.count': business?.businessProfile?.postStreak?.count ?? 0,
                              'businessProfile.postStreak.lastPostDate': business?.businessProfile?.postStreak?.lastPostDate ?? "",
                              'businessProfile.postStreak.city': business?.lastKnownLocation?.label || "",
                              'businessProfile.postStreak.isFeatured': true,
                              'businessProfile.postStreak.featuredSince': now,
                            });
                            await setBusinessFeaturedForPosts(businessUid, true);
                            await fetchBusinessData();

                            Alert.alert('Featured', 'This business is now featured for 7 days.');
                            setBusiness(prev =>
                              prev
                                ? {
                                    ...prev,
                                    businessProfile: {
                                      ...prev.businessProfile,
                                      name: prev.businessProfile?.name || '',
                                      ownerUid: prev.businessProfile?.ownerUid || '',
                                      avatar: prev.businessProfile?.avatar ?? '',
                                      description: prev.businessProfile?.description ?? '',
                                      category: prev.businessProfile?.category ?? '',
                                      location: prev.businessProfile?.location ?? '',
                                      email: prev.businessProfile?.email ?? '',
                                      postStreak: {
                                        ...prev.businessProfile?.postStreak,
                                        isFeatured: true,
                                        featuredSince: undefined,
                                        count: prev.businessProfile?.postStreak?.count ?? 0,
                                        lastPostDate: prev.businessProfile?.postStreak?.lastPostDate ?? '',
                                        city: prev.businessProfile?.postStreak?.city ?? '',
                                      },
                                    },
                                  }
                                : prev
                            );
                            navigation.navigate('HomeScreen', { refreshFeatured: Date.now() });

                          } catch (error) {
                            Alert.alert('Error', 'Failed to set feature status.');
                            console.log(error);
                          } finally {
                            setFeatureLoading(false);
                          }

                        }}
                      >
                        {featureLoading ? (
                          <ActivityIndicator size="small" color="#999" />
                        ) : (
                          <Text style={{ color: isActuallyFeatured ? '#c62828' : '#2e7d32', fontWeight: '700' }}>
                            {isActuallyFeatured ? 'Remove Featured' : 'Set as Featured'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {/* ⭐️ END ADMIN CONTROLS ⭐️ */}

                {isActuallyFeatured && expiryDateString && expiryDateString !== 'Invalid Date' && (
                  <View style={{ backgroundColor: '#FFFDE7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 6 }}>
                    <Text style={{ color: '#FFD600', fontWeight: '700' }}>
                      {i18n.t('businessChannel.featuredUntil', { date: expiryDateString })}
                    </Text>
                  </View>
                )}

                <View style={{ alignItems: 'center', marginTop: 12 }}>
                  <TouchableOpacity onPress={() => setShowRatingModal(true)} style={styles.ratingBox}>
                    <Ionicons name="star" size={20} color="#FFD700" style={{ marginRight: 6 }} />
                      <Text style={styles.ratingText}>
                        {businessRating && businessRating.count > 0
                          ? `${businessRating.average.toFixed(1)} ★ (${businessRating.count})`
                          : i18n.t('businessChannel.noRatings')}
                      </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => setShowReviewList(true)} style={{ marginTop: 6 }}>
                  <Text style={{ color: '#007aff', fontSize: 14 }}>{i18n.t('businessChannel.viewAllReviews')}</Text>
                </TouchableOpacity>    

                <Text style={styles.sectionTitle}>{i18n.t('businessChannel.mediaFeed')}</Text>

                </View>
            }
            renderItem={({ item }) => (
                <View style={styles.gridItem}>
                    {deletingPostId === item.id ? (
                    <View style={[styles.gridItem, styles.loadingOverlay]}>
                        <ActivityIndicator size="large" color="#007aff" />
                    </View>
                    ) : (
                        <BusinessPostCard
                            post={item}
                            userId={business.uid}
                            onOpenImage={() => {}}
                            onDelete={handleDeletePost}
                        />
                    )}

                </View>
              )}

            ListEmptyComponent={<Text style={styles.emptyFeed}>{i18n.t('businessChannel.noPosts')}</Text>}
        />
      <BusinessRatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        businessId={businessUid}
        businessName={business.businessProfile?.name || business.name}
        onSubmitted={async () => {  
          setShouldRefreshReviews(true);
          await fetchBusinessRating(); // ✅ update right away
        }}
      />

      <BusinessReviewListModal
        visible={showReviewList}
        onClose={() => {
          setShowReviewList(false);
          setShouldRefreshReviews(false); // Reset the flag when closed
        }}
        businessId={businessUid}
        refreshTrigger={shouldRefreshReviews}
      />

    </View>
  );
};

export default BusinessChannelScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  businessName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#e0f8e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 14,
  },
  description: {
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontSize: 14,
    color: '#666',
  },
  feedSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyFeed: {
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 40,
    // height: '80%'
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  
  gridItem: {
    flex: 1,
    marginHorizontal: 4,
    marginVertical: 4,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '48%', // Explicit width for 2 columns
    alignSelf: 'flex-start', // Prevent stretching
  },
  loadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 240,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  ratingText: {
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
  },
  
});