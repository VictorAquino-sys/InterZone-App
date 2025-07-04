import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { deleteDoc, doc } from 'firebase/firestore';
import { ref as storageRef, deleteObject, getStorage } from 'firebase/storage';
import { Timestamp } from 'firebase/firestore';
import { User } from '@/contexts/UserContext';
import { deleteImageFromStorage, deleteVideoFromStorage } from '@/utils/storageUtils';
import { Post } from '@/contexts/PostsContext';
import { db } from '@/config/firebase';
import i18n from '@/i18n';

type UsePostActionsProps = {
    user: User | null;
    setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
    navigation: any;
    colors: any;
    onOpenImageModal: (url: string | null) => void;
};

export function usePostActions({
  setPosts,
  onOpenImageModal,
}: UsePostActionsProps) {
  // Modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // Date formatting
  const formatDate = useCallback((timestamp: Timestamp | null | undefined): string => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp.seconds * 1000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, []);

  // Delete post handler
  const handleDeletePost = useCallback((postId: string, imageUrls: string[] | null) => {
    Alert.alert(
      i18n.t('confirmDeleteTitle'),
      i18n.t('confirmDeleteMessage'),
      [
        { text: i18n.t('cancel'), onPress: () => {}, style: "cancel" },
        { text: i18n.t('ok'), onPress: () => deletePost(postId, imageUrls) },
      ],
      { cancelable: false }
    );
  }, []);

  // Actual delete logic
  const deletePost = async (postId: string, imageUrls: string[] | null, videoUrl?: string) => {
    // Delete images
    if (Array.isArray(imageUrls)) {
      for (const url of imageUrls) {
        await deleteImageFromStorage(url);
      }
    }
  
    // Delete video if present
    if (videoUrl) {
      await deleteVideoFromStorage(videoUrl);
    }
  
    try {
      await deleteDoc(doc(db, "posts", postId));
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      Alert.alert(i18n.t('deleteSuccessTitle'), i18n.t('deleteSuccessMessage'));
    } catch (error) {
      Alert.alert(i18n.t('deleteErrorTitle'), i18n.t('deleteErrorMessage'));
    }
  };

  // Edit post
  const handleEditPost = useCallback((postId: string, newContent: string) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? { ...p, content: newContent } : p
      )
    );
  }, [setPosts]);

  // Report modal
  const handleReportPress = useCallback((postId: string, postUserId: string) => {
    setSelectedPostId(postId);
    setSelectedUserId(postUserId);
    setReportModalVisible(true);
  }, []);

  // Full screen toggle
  const toggleFullScreen = useCallback(() => setIsFullScreen(prev => !prev), []);

  // Open image modal
  const openImageModal = useCallback((imageUrl: string | null) => {
    onOpenImageModal(imageUrl);
  }, [onOpenImageModal]);

  const closeImageModal = () => {
    setModalVisible(false);
  };

  return {
    reportModalVisible,
    setReportModalVisible,
    selectedPostId,
    setSelectedPostId,
    selectedUserId,
    setSelectedUserId,
    formatDate,
    handleDeletePost,
    handleEditPost,
    handleReportPress,
    openImageModal,
    isFullScreen,
    toggleFullScreen,
    closeImageModal
  };
}