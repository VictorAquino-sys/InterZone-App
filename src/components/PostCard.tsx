import React, { useEffect, useState, useRef} from 'react';
import { View, Text, StyleSheet, ActionSheetIOS, TouchableOpacity, Image, Alert, TextInput, Button, Modal, ViewStyle, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Avatar from './Avatar';
import LikeButton from './LikeButton';
import i18n from '@/i18n';
import { Post } from '../contexts/PostsContext';
import * as Clipboard from 'expo-clipboard';
import ImageViewer from 'react-native-image-zoom-viewer';
import { Timestamp, getCountFromServer, getDocs, query, orderBy, limit, deleteDoc, addDoc, serverTimestamp, collection, getDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getCategoryByKey } from '@/config/categoryData';
import CommentsModal from './commentsModal';
import { KeyboardAvoidingView, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
// import { Video, ResizeMode } from 'expo-av';
import Video, { VideoRef } from 'react-native-video'; // Import VideoRef for type
import { User } from '@/contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigationTypes';


interface PostCardProps {
    item: Post; // ✅ Strong type from your Post model
    userId: string;
    user: User;
    onDelete: (postId: string, imageUrl: string | null) => void;
    onReport: (postId: string, userId: string) => void;
    onOpenImage: (imageUrl: string) => void;
    onUserProfile: (userId: string) => void;
    formatDate: (timestamp: Timestamp | null | undefined) => string;

    // onVideoClick: (videoUrl: string) => void; // Pass the full-screen state
    isFullScreen: boolean;
    toggleFullScreen: () => void;
    isShowcase?: boolean;
    // style?: ViewStyle;

}

const PostCard: React.FC<PostCardProps> = ({
  item,
  userId,
  user,
  onDelete,
  onReport,
  onOpenImage,
  onUserProfile,
  formatDate,
  
  // onVideoClick, // Add this prop
  isFullScreen,  // Full-screen state passed from HomeScreen
  toggleFullScreen,  // Full-screen toggle passed from HomeScreen
  isShowcase,
  // style

}) => {
  const category = getCategoryByKey(item.categoryKey);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_COMMENTS = 10;
  const MAX_COMMENT_LENGTH = 200;
  const [commentCount, setCommentCount] = useState(item.commentCount ?? 0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedComment, setEditedComment] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [isDeleting, setIsDeleting] = useState(false);

  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  const [isPlaying, setIsPlaying] = useState(false); // State to track play/pause

  const videoRef = useRef<VideoRef | null>(null); // Use VideoRef for the reference type

  const [businessRating, setBusinessRating] = useState<{ average: number; count: number } | null>(null);

  const [status, setStatus] = useState<any>({}); // Update state with appropriate type for Video status
  const [showControls, setShowControls] = useState(false); // To control visibility of the play/pause button
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false); // Modal visibility state
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null); // State for selected video URL
  const ref = useRef(null);


  const fetchRecentComments = async () => {
    const q = query(
      collection(db, 'posts', item.id, 'comments'),
      orderBy('timestamp', 'desc'),
      limit(3)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  // Fetch comment count on mount
  useEffect(() => {
    setCommentCount(item.commentCount ?? 0);

  }, [item.commentCount]);

  useEffect(() => {
    const fetchBusinessRating = async () => {
      if (item.user?.mode === 'business') {
        const docRef = doc(db, 'businessProfiles', item.user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.averageRating !== undefined && data.ratingCount !== undefined) {
            setBusinessRating({
              average: data.averageRating,
              count: data.ratingCount,
            });
          }
        }
      }
    };
  
    fetchBusinessRating();
  }, [item.user?.uid]);


  // Fetch recent comments only when toggling open
  const handleToggleComments = async () => {
    setShowComments(prev => !prev);

    if (!showComments) {
      const recent = await fetchRecentComments();
      setComments(recent.reverse()); //oldest to newest
    }
  };

  const handleCommentMenu = (comment: any) => {
    const isCommentAuthor = comment.userId === user.uid;
    const isPostOwner = user.uid === item.user?.uid;
  
    const options = [i18n.t('comments.report')];
    if (isPostOwner || isCommentAuthor) options.push(i18n.t('comments.delete'));
    if (isCommentAuthor) options.push(i18n.t('comments.edit'));
    options.push(i18n.t('comments.cancel'));
  
    const cancelIndex = options.length - 1;
    const destructiveIndex = options.indexOf(i18n.t('comments.delete'));
  
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex,
        },
        async (buttonIndex) => {
          const selected = options[buttonIndex];
          await handleCommentAction(selected, comment);
        }
      );
    } else {
      Alert.alert(
        i18n.t('comments.menu'), // Title
        undefined,                // No body message
        [
          ...options.slice(0, -1).map((opt) => ({
            text: opt,
            onPress: () => handleCommentAction(opt, comment),
            style: (opt === i18n.t('comments.delete')
              ? 'destructive'
              : 'default') as 'default' | 'cancel' | 'destructive'
          })),
          {
            text: i18n.t('comments.cancel'),
            style: 'cancel' as const,
            onPress: () => {} // Do nothing
          }
        ]
      );
    }
  };

  const getVerificationBadge = () => {
    const verification = item.verifications;
    if (!verification) return null;
  
    const badges = [];
  
    if (verification.business) {
      badges.push(
        <View key="business" style={styles.badge}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.badgeText}>{i18n.t('businessVerified')}</Text>
        </View>
      );
    }
  
    if (verification.musician) {
      badges.push(
        <View key="musician" style={styles.badge}>
          <Ionicons name="musical-notes" size={16} color="#3F51B5" />
          <Text style={styles.badgeText}>{i18n.t('musicianVerified')}</Text>
        </View>
      );
    }
  
    if (verification.tutor) {
      badges.push(
        <View key="tutor" style={styles.badge}>
          <Ionicons name="school" size={16} color="#FF9800" />
          <Text style={styles.badgeText}>{i18n.t('tutorVerified')}</Text>
        </View>
      );
    }
  
    return (
      <View style={styles.badgeContainer}>
        {badges}
      </View>
    );
  };
    
  const handleCommentAction = async (selected: string, comment: any) => {
    if (selected === i18n.t('comments.report')) {
      await addDoc(collection(db, 'reports'), {
        type: 'comment',
        commentId: comment.id,
        postId: item.id,
        reportedBy: user.uid,
        timestamp: serverTimestamp()
      });
      Alert.alert(i18n.t('comments.reported'), i18n.t('comments.thankYouReport'));
    } else if (selected === i18n.t('comments.delete')) {
      await deleteDoc(doc(db, 'posts', item.id, 'comments', comment.id));
      await updateDoc(doc(db, 'posts', item.id), {
        commentCount: increment(-1)
      });

      const recent = await fetchRecentComments();
      setComments(recent.reverse());
      setCommentCount(prev => Math.max(prev - 1, 0));
    } else if (selected === i18n.t('comments.edit')) {
      setEditingCommentId(comment.id);
      setEditedComment(comment.content);
    }
  };

  const refreshCommentCount = async () => {
    const commentsRef = collection(db, 'posts', item.id, 'comments');
    const snapshot = await getCountFromServer(commentsRef);
    setCommentCount(snapshot.data().count);
  };

  const handleAddComment = async () => {
    if(!newComment.trim()) return;

    if (!user?.uid) {
      console.warn("⚠️ No authenticated user. Cannot comment.");
      return;
    }

    console.log("Submitting comment as user:", user.uid);

    await addDoc(collection(db, 'posts', item.id, 'comments'), {
      userId: user.uid,
      userName: user.name,
      userAvatar: user.avatar,
      content: newComment.trim(),
      timestamp: serverTimestamp()
    });

    await updateDoc(doc(db, 'posts', item.id), {
      commentCount: increment(1)
    });

    setNewComment('');
    setCommentCount(prev => prev + 1); //update comment count
    handleToggleComments(); // Re-fetch latest
  };

  const handleOpenImage = (imageUrl: string) => {
    setZoomModalVisible(true); // Open zoom modal
  };

  const handleCloseImage = () => {
    setZoomModalVisible(false); // Close zoom modal
  };

  // Handle video play/pause
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying); // Toggle play/pause state
  };

  const handleVideoClick = (videoUrl: string) => {
    console.log('Received video URL:', videoUrl);  // Log the video URL passed to the function
    setSelectedVideoUrl(videoUrl);
    setIsVideoModalVisible(true); // Show the video modal
  };

  const closeVideoModal = () => {
    setIsVideoModalVisible(false); // Close the modal
    setSelectedVideoUrl(null); // Clear the video URL
  };

  // Handle touch start (show controls)
  const handleTouchStart = () => {
    setShowControls(true);
  };

  // Handle touch end (hide controls)
  const handleTouchEnd = () => {
    setTimeout(() => {
      setShowControls(false); // Hide controls after 1 second
    }, 1000);
  };

  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(item.content); // Copy post content to clipboard
      setCopyMessage(i18n.t('postCard.copySuccess')); // Update the state for feedback message
      
      // Show success toast
      Toast.show({
        type: 'success',
        position: 'top',
        text1: i18n.t('postCard.copiedToClipboard'),
        text2: i18n.t('postCard.copyMessage'),
      });
  
      // Reset copy message after 2 seconds
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (error) {
      console.error('Failed to copy text to clipboard', error);
  
      // Show error toast
      Toast.show({
        type: 'error',
        position: 'top',
        text1: i18n.t('error'),
        text2: i18n.t('postCard.copyError'), // Localized error message
      });
    }
  };

  const handleUserProfileNavigation = async (userId: string) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        Toast.show({
          type: 'error',
          position: 'top',
          text1: i18n.t('error'),
          text2: i18n.t('userNotFound'),
        });
        return;
      }

      // Proceed with navigation if the user exists
      onUserProfile(userId);
    } catch (error) {
      console.error("Failed to navigate to profile:", error);
      Toast.show({
        type: 'error',
        position: 'top',
        text1: i18n.t('error'),
        text2: i18n.t('unexpectedError'),
      });
    }
  };

  return (
    <View style={[styles.postItem, isShowcase && styles.showcaseBorder]}>
      <View style={styles.postHeader}>
        <View style={styles.userContainer}>
          <TouchableOpacity onPress={() => {
              if (item.user?.avatar) {
                onOpenImage(item.user.avatar);
              } else {
                Toast.show({
                  type: 'error',
                  position: 'top',
                  text1: i18n.t('error'),
                  text2: i18n.t('NoPhoto'),
                });              
              }
            }}
          >
            <Avatar
              key={item.id}
              name={item.user?.name}
              imageUri={item.user?.avatar || undefined}
              size={60}
            />
          </TouchableOpacity>

          <View style={styles.postDetails}>
            <TouchableOpacity
              onPress={() => {
                if (item.user?.mode === 'business') {
                  navigation.navigate('BusinessChannel', {
                    businessUid: item.user.uid,
                  });
                } else {
                  onUserProfile(item.user.uid);
                }
              }}
            >
              <View style={{ flexDirection: 'column', alignItems: 'center'}}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={styles.userName}>
                    {item.user?.name || i18n.t('anonymous')}
                  </Text>
                  {item.user?.mode === 'business' && businessRating && (
                    <Text style={styles.ratingInline}>
                      &nbsp;★ {businessRating.average.toFixed(1)} ({businessRating.count})
                    </Text>
                  )}
                </View>
                <Text style={styles.postCity}>{item.city || i18n.t('unknown')}</Text>
                <Text style={styles.postTimestamp}>{formatDate(item.timestamp)}</Text>
              </View>
            </TouchableOpacity>
          </View>
          {getVerificationBadge()}
        </View>

        <View style={styles.topRightIcons}>
            {category && (
                <Image source={category.icon} style={styles.categoryIcon} />
            )}

        </View>
      </View>

      <TouchableOpacity onPress={handleCopyText}>
        <Text style={styles.postText}>{item.content}</Text>
      </TouchableOpacity>

      {/* Stylish Toast for Copy Feedback */}
      {copyMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{copyMessage}</Text>
        </View>
      )}

      {isShowcase && (
        <Text style={{ color: '#4A90E2', fontWeight: 'bold', marginBottom: 8, marginLeft: 6 }}>
          🌟 Featured by this business
        </Text>
      )}

      {item.imageUrl && (
        <TouchableOpacity onPress={() => handleOpenImage(item.imageUrl)}>
          <View style={styles.postImageWrapper}>
            <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode='cover' />
          </View>
        </TouchableOpacity>
      )}

      <Modal visible={zoomModalVisible} transparent={true} onRequestClose={handleCloseImage}>
        <ImageViewer
        imageUrls={[{ url: item.imageUrl }]}  // Pass the image URL to the zoom viewer
        onSwipeDown={handleCloseImage} // Close on swipe down
        enableSwipeDown={true} // Allow swipe down to close
        />
      </Modal>

      {/* Post content */}
      {item.videoUrl && (
        <View style={styles.videoWrapper}>
          <Video
            ref={videoRef}
            source={{ uri: item.videoUrl }}
            style={styles.video}
            controls={true} // Enables default video controls
            paused={!isPlaying} // Play or pause video
            onError={(e) => console.log('Error loading video', e)}
            onBuffer={(e) => console.log('Buffering video', e)}
            onEnd={() => console.log('Video ended')}
          />
        </View>
      )}

      {/* Video Modal */}
      {isVideoModalVisible && selectedVideoUrl  && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isVideoModalVisible}
          onRequestClose={closeVideoModal}
        >
          <TouchableOpacity style={styles.fullScreenModal} onPress={closeVideoModal}>
            {/* <View style={styles.videoContainer}> */}
            <Video
              ref={videoRef}
              source={{ uri: selectedVideoUrl }}
              style={styles.fullScreenVideo}
              controls={true} // Use the default video controls
              onError={(e) => console.log('Error loading video', e)}
              onBuffer={(e) => console.log('Buffering video', e)}
              onEnd={() => console.log('Video ended')}
            />
          </TouchableOpacity>
        </Modal>
      )}

      <View style={styles.actionRow}>
        {/* Left Side: Like + Comment */}
        <View style={styles.leftActions}>
          <LikeButton postId={item.id} userId={userId} />
          {item.commentsEnabled !== false && (
            <TouchableOpacity onPress={handleToggleComments} style={styles.commentButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#888" />
              <Text style={styles.commentCount}>{commentCount}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Right Side: Delete + Ellipsis */}
        <View style={styles.rightActions}>
          {userId === item.user?.uid && (
            <TouchableOpacity
              onPress={async () => {
                if (isDeleting) return;
                setIsDeleting(true);
                try {
                  await onDelete(item.id, item.imageUrl);
                } finally {
                  setIsDeleting(false);
                }
              }}
              style={styles.deleteWrapper}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="red" />
              ) : (
                <Ionicons name="trash-outline" size={20} color="red" />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => onReport(item.id, item.user.uid)} style={styles.ellipsisWrapper}>
            <Ionicons name="ellipsis-vertical" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </View>


      {/* 🔽 Expanded Comments Section */}
      {showComments && (
        <View style={styles.commentsSection}>
          {comments.map(comment => (
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
              <TouchableOpacity onPress={() => handleUserProfileNavigation(comment.userId)}>
                  <Text style={styles.commentAuthor}>{comment.userName || i18n.t('anonymous')}</Text>
                </TouchableOpacity>
                {(() => {
                  const isCommentAuthor = comment.userId === user.uid;
                  const isPostOwner = user.uid === item.user?.uid;
                  const shouldShowEllipsis = !isCommentAuthor || (isPostOwner && !isCommentAuthor);
                  
                  return shouldShowEllipsis ? (
                    <TouchableOpacity onPress={() => handleCommentMenu(comment)}>
                      <Ionicons name="ellipsis-horizontal" size={16} color="#888" style={{ padding: 4 }} />
                    </TouchableOpacity>
                  ) : null;
                })()}
              </View>

              {editingCommentId === comment.id ? (
                <>
                  <TextInput
                    value={editedComment}
                    onChangeText={text => setEditedComment(text.slice(0, MAX_COMMENT_LENGTH))}
                    style={styles.commentInput}
                  />
                  <Text style={styles.charCount}>
                    {editedComment.length} / {MAX_COMMENT_LENGTH}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <Button
                      title={isSubmitting ? i18n.t("postCard.updating") : i18n.t("postCard.update")}
                      onPress={async () => {
                        if (!editedComment.trim()) return;
                        setIsSubmitting(true);
                        try {
                          await updateDoc(doc(db, 'posts', item.id, 'comments', comment.id), {
                            content: editedComment.trim()
                          });
                          setEditingCommentId(null);
                          setEditedComment('');
                          const q = query(
                            collection(db, 'posts', item.id, 'comments'),
                            orderBy('timestamp', 'desc'),
                            limit(3)
                          );
                          const snapshot = await getDocs(q);
                          const recent = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                          setComments(recent.reverse());
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <Button
                      title={i18n.t("postCard.cancel")}
                      color="gray"
                      onPress={() => {
                        setEditingCommentId(null);
                        setEditedComment('');
                      }}
                      disabled={isSubmitting}
                    />
                  </View>
                </>
              ) : (
                <Text>{comment.content}</Text>
              )}

              {comment.userId === user.uid && editingCommentId !== comment.id && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <TouchableOpacity onPress={() => {
                    setEditingCommentId(comment.id);
                    setEditedComment(comment.content);
                  }}>
                    <Text style={styles.editText}>{i18n.t("postCard.edit")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={async () => {
                    await deleteDoc(doc(db, 'posts', item.id, 'comments', comment.id));
                    await updateDoc(doc(db, 'posts', item.id), {
                      commentCount: increment(-1)
                    });
                    const q = query(
                      collection(db, 'posts', item.id, 'comments'),
                      orderBy('timestamp', 'desc'),
                      limit(3)
                    );
                    const snapshot = await getDocs(q);
                    const recent = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setComments(recent.reverse());
                    setCommentCount(prev => Math.max(prev - 1, 0));
                  }}>
                    <Text style={styles.deleteText}>{i18n.t("postCard.delete")}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {commentCount > 3 && (
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={styles.viewAllCommentsText}>
                {i18n.t("postCard.viewAll", { count: commentCount })}
              </Text>
            </TouchableOpacity>
          )}

          <CommentsModal
            visible={modalVisible}
            onClose={async () => {
              setModalVisible(false);
              await refreshCommentCount();
            
              if (showComments) {
                const q = query(
                  collection(db, 'posts', item.id, 'comments'),
                  orderBy('timestamp', 'desc'),
                  limit(3)
                );
                const snapshot = await getDocs(q);
                const recent = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setComments(recent.reverse());
              }
            }}
            postId={item.id}
            currentUser={{
              uid: user.uid,
              name: user.name,
              avatar: user.avatar || '', // fallback if somehow undefined
            }}
            setCommentCount={setCommentCount}
            postOwnerId={item.user?.uid}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={100}
          >
            <View style={{ paddingBottom: 12 }}>
              <TextInput
                placeholder={
                  commentCount >= MAX_COMMENTS
                    ? i18n.t("postCard.maxReached")
                    : i18n.t("postCard.writePlaceholder")
                }
                value={newComment}
                onChangeText={text => setNewComment(text.slice(0, MAX_COMMENT_LENGTH))}
                style={styles.commentInput}
                editable={commentCount < MAX_COMMENTS && !isSubmitting}
              />
              <Text style={styles.charCount}>
                {newComment.length} / {MAX_COMMENT_LENGTH}
              </Text>

              <Button
                title={isSubmitting ? i18n.t("postCard.commenting") : i18n.t("postCard.comment")}
                onPress={handleAddComment}
                disabled={
                  isSubmitting ||
                  !newComment.trim() ||
                  commentCount >= MAX_COMMENTS
                }
              />
            </View>
          </KeyboardAvoidingView>

        </View>
      )}
    </View>
  );
};

export default React.memo(PostCard);

const styles = StyleSheet.create({
  postItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },  
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postDetails: {
    flexDirection: 'row',
    marginLeft: 4,
    flexShrink: 1,
  },
  userName: {
    fontWeight: 'bold',
    marginTop: 8,
    marginLeft: 6,
  },
  viewAllCommentsText: {
    color: '#007aff',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 6,
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
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 20,
    color: '#333',
  },
  postImageWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  
  deleteWrapper: {
    marginRight: 4,
    paddingVertical: 4,
  },
  
  ellipsisWrapper: {
    paddingVertical: 4,
  },

  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  commentCount: {
    marginLeft: 6,
    color: '#666',
    fontSize: 13,
  },
  commentsSection: {
    paddingTop: 6,
    paddingHorizontal: 12,
  },
  commentItem: {
    marginBottom: 6,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#007aff', // Added color to indicate it's tappable
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  deleteButton: {
    paddingVertical: 5,
    paddingHorizontal: 30,
    alignItems: 'flex-end',
    opacity: 1,
  },
  deleteText: {
    color: 'red',
    fontSize: 12,
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    marginRight: 2,
    marginBottom: 20,
  },
  moreIconInline: {
    padding: 2,
    marginBottom: 35,
  },
  charCount: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginBottom: 6,
  },
  warningText: {
    color: 'red',
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'center',
  },
  editText: {
    fontSize: 13,
    color: '#007aff',
  },
  copyMessage: {
    fontSize: 14,
    color: '#333',
    padding: 5,
    textAlign: 'center',
    backgroundColor: '#f4f4f4',
    borderRadius: 5,
    marginTop: 8,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 20,
    left: '10%',
    right: '10%',
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    zIndex: 999,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  fullScreenModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)'
  },
  videoContainer: {
    // flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Shady background for the modal
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',  // Make it take up the full width
    height: 200,  // Default height for video container when not in full-screen mode
    backgroundColor: 'black',  // Optionally, add a background color to make it stand out
  },
  video: {
    width: '100%',
    height: '100%',
  },
  fullScreenVideo: {
    width: '90%',
    height: '90%',  // Full-screen video size
  },
  playPauseButton: {
    position: 'absolute',
    bottom: 20,
    left: '40%',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
  },
  playPauseText: {
    color: 'white',
    fontSize: 15,
  },  
  fullScreenButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
  },
  // Expand/Contract Button Style
  expandButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Semi-transparent background
    padding: 10,
    borderRadius: 50,
    zIndex: 999,  // Ensure it appears on top of the video
  },
  fullScreenText: {
    color: 'white',
    fontSize: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  badgeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '500',
  },
  showcaseBorder: {
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  badgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start', // aligns each badge to the left
    marginTop: 0,
    marginLeft: 20, // you can adjust this spacing as needed
    gap: 4, // optional, if you want spacing between badges
  },
  ratingInline: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
    // gap: 4,
  },
});