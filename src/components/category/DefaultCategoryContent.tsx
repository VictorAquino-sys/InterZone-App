import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import LikeButton from '@/components/LikeButton';
import Avatar from '@/components/Avatar';
import Video from 'react-native-video';
import i18n from '@/i18n';

type Post = {
  id: string;
  content: string;
  user: {
    name: string;
    uid: string;
    avatar?: string;
  };
  imageUrl?: string | null;
  videoUrl?: string | null;
  city?: string;
  timestamp?: any;
};

type Props = {
  posts: Post[];
  currentUserId: string;
  onDeletePost: (postId: string, imageUrl: string | null) => void;
  onOpenImageModal: (url: string | null) => void;
};

const DefaultCategoryContent: React.FC<Props> = ({
  posts,
  currentUserId,
  onDeletePost,
  onOpenImageModal,
}) => {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      removeClippedSubviews={true}              // Detach views off-screen
      initialNumToRender={5}                    // Render only 5 initially
      maxToRenderPerBatch={6}                   // Render max 8 per batch
      updateCellsBatchingPeriod={50}            // Wait 50ms between batches
      windowSize={7}                            // Render a few extra items around the viewport
      renderItem={({ item }) => (
        <View style={styles.postItem}>
          <View style={styles.userContainer}>
            <TouchableOpacity onPress={() => onOpenImageModal(item.user?.avatar ?? null)}>
              <Avatar name={item.user?.name} imageUri={item.user?.avatar} />
            </TouchableOpacity>
            <View style={styles.postDetails}>
              <Text style={styles.userName}>{item.user?.name}</Text>
              <Text style={styles.postCity}>{item.city || i18n.t('unknown')}</Text>
              <Text style={styles.postTimestamp}>{formatDate(item.timestamp)}</Text>
            </View>
          </View>

          <Text style={styles.postText}>{item.content}</Text>

          {item.imageUrl && (
            <TouchableOpacity onPress={() => onOpenImageModal(item.imageUrl ?? null)}>
              <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
            </TouchableOpacity>
          )}

          {item.videoUrl && (
            <View style={styles.videoWrapper}>
              <Video
                source={{ uri: item.videoUrl }}
                style={styles.video}
                controls
                paused
                resizeMode="cover"
              />
            </View>
          )}

          <LikeButton postId={item.id} userId={currentUserId} />

          {currentUserId === item.user.uid && (
            <TouchableOpacity
              onPress={() => onDeletePost(item.id, item.imageUrl || null)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>{i18n.t('deletePost')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyCategoryText}>{i18n.t('EmptyCategoryScreen')}</Text>}
    />
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 10,
  },
  postDetails: {
    marginLeft: 10,
    flexDirection: 'column',
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
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
  postImage: {
    width: '100%',
    height: 200,
    marginTop: 10,
    borderRadius: 10,
  },
  videoWrapper: {
    marginTop: 10,
    width: '100%',
    height: 200,
    backgroundColor: 'black',
    borderRadius: 10,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    paddingVertical: 5,
    paddingHorizontal: 30,
    alignItems: 'flex-end',
  },
  deleteText: {
    color: 'red',
    fontSize: 12,
  },
  emptyCategoryText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default DefaultCategoryContent;
