import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Post } from '@/contexts/PostsContext';
import { User } from '@/contexts/UserContext';
import PostCard from '@/components/PostCard';
import Avatar from '@/components/Avatar';
import Ionicons from '@expo/vector-icons/Ionicons';
import BusinessPostCard from '@/components/businessPostCard';
import i18n from '@/i18n'; 
import { deleteDoc, doc } from 'firebase/firestore';
import { Alert } from 'react-native';

interface BusinessChannelRouteParams {
  businessUid: string;
}

const BusinessChannelScreen = () => {
  const route = useRoute<RouteProp<Record<string, BusinessChannelRouteParams>, string>>();
  const { businessUid } = route.params;

  const [business, setBusiness] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  useEffect(() => {
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
            where('showcase', '==', true), // ✅ Only showcased posts
            orderBy('timestamp', 'desc'),
            limit(6) // ✅ Limit to 6 posts
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

    fetchBusinessData();
  }, [businessUid]);

    const handleDeletePost = async (postId: string, imageUrl?: string | null) => {
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
  
});
