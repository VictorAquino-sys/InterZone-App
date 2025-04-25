import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatDistanceToNow } from 'date-fns';
import { logEvent } from '@/utils/analytics';

const PostDetailScreen = () => {
  const route = useRoute();
  const { postId } = route.params as { postId: string };

  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const docRef = doc(db, 'posts', postId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const postData = snapshot.data();
          setPost(snapshot.data());

          // Log post view
          if (postData) {
            await logEvent('post_viewed', {
              post_id: postId,
              category: postData.categoryKey,
              city: postData.city,
            });
          }
        } else {
          console.warn('⚠️ Post not found');
        }
      } catch (error) {
        console.error('❌ Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <Text>Post not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Image source={{ uri: post.user?.avatar }} style={styles.avatar} />
          <View>
            <Text style={styles.userName}>{post.user?.name}</Text>
            <Text style={styles.timestamp}>
              {post.timestamp
                ? formatDistanceToNow(new Date(post.timestamp.toDate?.() || post.timestamp), {
                    addSuffix: true,
                  })
                : ''}
            </Text>
          </View>
        </View>
  
        <Text style={styles.content}>{post.content}</Text>
  
        {post.imageUrl && (
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.image}
          />
        )}
  
        <View style={styles.metaRow}>
          <Text style={styles.meta}>📍 {post.city}</Text>
          <Text style={styles.meta}>🏷️ {post.categoryKey}</Text>
        </View>
      </View>
    </ScrollView>
  );
  
  
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        backgroundColor: '#ccc',
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#222',
    },
    timestamp: {
        fontSize: 13,
        color: '#999',
    },
    content: {
        fontSize: 18,
        marginBottom: 12,
        color: '#444',
    },
    image: {
        width: '100%',
        height: 250,
        borderRadius: 10,
        marginBottom: 12,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    meta: {
        fontSize: 14,
        color: '#888',
    },
});

export default PostDetailScreen;
