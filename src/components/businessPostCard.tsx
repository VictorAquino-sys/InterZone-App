// BusinessPostCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions
} from 'react-native';
import { Post } from '@/contexts/PostsContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import CommentsModal from './commentsModal';
import { useUser } from '@/contexts/UserContext';
import { db } from '@/config/firebase';
import Video from 'react-native-video';
import ImageViewer from 'react-native-image-zoom-viewer';
import LikeButton from './LikeButton'; // ✅ Make sure this is the correct path

interface Props {
  post: Post;
  onOpenImage: (url: string) => void;
  onDelete: (postId: string, imageUrl?: string) => void;
  userId: string;
}

const BusinessPostCard = ({ post, onOpenImage, onDelete, userId }: Props) => {
    const [zoomModalVisible, setZoomModalVisible] = useState(false);
    const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [commentCount, setCommentCount] = useState(post.commentCount || 0);
    const [showComments, setShowComments] = useState(false);
    const { user } = useUser();
    const [loadingComments, setLoadingComments] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <View style={styles.container}>
        {/* Description */}
        {post.content && (
            <Text style={styles.description} numberOfLines={3}>
            {post.content}
            </Text>
        )}

        {/* Image */}
        {post.imageUrl && (
            <TouchableOpacity onPress={() => setZoomModalVisible(true)}>
            <Image source={{ uri: post.imageUrl ?? '' }} style={styles.image} />
            </TouchableOpacity>
        )}

        {/* Video Preview */}
        {post.videoUrl && (
            <TouchableOpacity onPress={() => setSelectedVideoUrl(post.videoUrl ?? null)}>
            <View style={styles.videoWrapper}>
                <Video
                    source={{ uri: post.videoUrl }}
                    resizeMode="cover"
                    paused
                    onLoad={() => setVideoLoaded(true)} // ✅ fade in when ready
                    style={[
                        styles.video,
                        { opacity: videoLoaded ? 1 : 0.3 }, // ✅ initial dim, then full opacity
                    ]}
                />
                <View style={styles.playIconOverlay}>
                <Ionicons name="play-circle" size={48} color="#fff" />
                </View>
            </View>
            </TouchableOpacity>
        )}

        {/* Like + Comment Count Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
            <LikeButton postId={post.id} userId={userId} />

            {post.commentsEnabled !== false && (
                <TouchableOpacity
                    style={styles.commentButton}
                    onPress={() => {
                        setModalVisible(true);
                        setShowComments(true);
                    }}
                >
                <Ionicons name="chatbubble-outline" size={20} color="#888" />
                <Text style={styles.commentCount}>{post.commentCount || 0}</Text>
                </TouchableOpacity>
            )}

            {userId === post.user?.uid && (
                <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onDelete(post.id, post.imageUrl)}
                >
                <Ionicons name="trash-outline" size={22} color="red" />
                </TouchableOpacity>
            )}
        </View>

        <CommentsModal
            visible={modalVisible}
            onClose={async () => {
                setLoadingComments(true);
                setModalVisible(false);

                try {
                    const q = query(
                      collection(db, 'posts', post.id, 'comments'),
                      orderBy('timestamp', 'desc'),
                      limit(3)
                    );
                    const snapshot = await getDocs(q);
                    const recent = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCommentCount(recent.length);
                } finally {
                    setLoadingComments(false);
                }
            }}

            postId={post.id}
            currentUser={{
                uid: user?.uid || '',
                name: user?.name || '',
                avatar: user?.avatar || '',
            }}
            setCommentCount={setCommentCount}
            postOwnerId={post.user?.uid}
            />

        {/* Image Zoom Modal */}
        <Modal
            visible={zoomModalVisible}
            transparent
            onRequestClose={() => setZoomModalVisible(false)}
        >
            <ImageViewer
            imageUrls={[{ url: post.imageUrl ?? '' }]}
            onSwipeDown={() => setZoomModalVisible(false)}
            enableSwipeDown
            />
        </Modal>

      {/* Fullscreen Video Modal */}
        {selectedVideoUrl && (
            <Modal
            animationType="slide"
            transparent
            visible={true}
            onRequestClose={() => setSelectedVideoUrl(null)}
            >
            <TouchableOpacity
                style={styles.fullScreenModal}
                onPress={() => setSelectedVideoUrl(null)}
            >
                <Video
                    source={{ uri: selectedVideoUrl }}
                    style={styles.fullScreenVideo}
                    controls
                    resizeMode="contain"
                />
            </TouchableOpacity>
            </Modal>
      )}
    </View>
  );
};

export default BusinessPostCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    // paddingBottom: 12,
    marginVertical: 1,
    marginTop: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 8,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: '40%',
    left: '40%',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenVideo: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  commentCount: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  
  deleteButton: {
    marginLeft: 'auto',
  },

});