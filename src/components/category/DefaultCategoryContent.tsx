import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { usePostActions } from '@/hooks/usePostActions';
import { Post, usePosts } from '@/contexts/PostsContext';
import PostCard from '../PostCard';
import i18n from '@/i18n';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';
import { themeColors } from '@/theme/themeColors';
import { useUser } from '@/contexts/UserContext';
import type { RootStackParamList } from '@/navigationTypes';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const DefaultCategoryContent: React.FC<{ 
  categoryKey?: string; 
  onOpenImageModal: (url:string | null) => void; 
}> = ({ categoryKey, onOpenImageModal }) => {
  const { resolvedTheme } = useTheme();
  const colors = themeColors[resolvedTheme];
  const { posts, setPosts } = usePosts();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useUser();

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const {
    formatDate,
    handleDeletePost,
    handleEditPost,
    handleReportPress,
    isFullScreen,
    toggleFullScreen,
  } = usePostActions({
    user,
    setPosts,
    navigation,
    colors,
    onOpenImageModal: setSelectedImageUrl,
  });

  const memoizedRenderItem = React.useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        item={item}
        userId={user?.uid ?? ''}
        user={{
          uid: user?.uid ?? '',
          name: user?.name ?? '',
          avatar: user?.avatar ?? '',
        }}
        onDelete={handleDeletePost}
        onReport={handleReportPress}
        onOpenImage={onOpenImageModal} 
        onUserProfile={(userId: string) => {
          if (item.user.mode === 'business') {
            navigation.navigate('BusinessChannel', { businessUid: userId });
          } else {
            navigation.navigate('UserProfile', { userId });
          }
        }}
        formatDate={formatDate}
        isFullScreen={isFullScreen}
        toggleFullScreen={toggleFullScreen}
        onEdit={handleEditPost}
        cardColor={colors.card}
        textColor={colors.text}
      />
    ),
    [
      user?.uid,
      user?.name,
      user?.avatar,
      handleDeletePost,
      handleReportPress,
      onOpenImageModal,
      formatDate,
      isFullScreen,
      toggleFullScreen,
      navigation,
    ]
  );

  const filteredPosts = posts
  .filter(post => post.categoryKey === categoryKey)
  .sort((a, b) => {
    const dateA = a.timestamp ? a.timestamp?.toDate() : new Date(0);
    const dateB = b.timestamp ? b.timestamp?.toDate() : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  if (categoryKey === 'universities') return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlashList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        estimatedItemSize={280} // Or another good average for your post height
        renderItem={memoizedRenderItem}
        ListEmptyComponent={
          categoryKey !== 'universities' ? (
            <Text style={[styles.emptyCategoryText, { color: colors.text}]}>{i18n.t('EmptyCategoryScreen')}</Text>
          ) : null
        }
        />
    </View>
  );
};

const styles = StyleSheet.create({
  emptyCategoryText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default DefaultCategoryContent;