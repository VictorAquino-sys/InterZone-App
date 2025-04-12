import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Avatar from './Avatar';
import LikeButton from './LikeButton';
import i18n from '@/i18n';
import { Post } from '../contexts/PostsContext';
import { Timestamp } from 'firebase/firestore';
import { getCategoryByKey } from '@/config/categoryData';

interface PostCardProps {
    item: Post; // ✅ Strong type from your Post model
    userId: string;
    onDelete: (postId: string, imageUrl: string | null) => void;
    onReport: (postId: string, userId: string) => void;
    onOpenImage: (imageUrl: string) => void;
    onUserProfile: (userId: string) => void;
    formatDate: (timestamp: Timestamp | null | undefined) => string;
}

const PostCard: React.FC<PostCardProps> = ({
  item,
  userId,
  onDelete,
  onReport,
  onOpenImage,
  onUserProfile,
  formatDate
}) => {
    const category = getCategoryByKey(item.categoryKey);

  return (
    <View style={styles.postItem}>
      <View style={styles.postHeader}>
        <View style={styles.userContainer}>
          <TouchableOpacity
            onPress={() => {
              if (item.user?.avatar) {
                onOpenImage(item.user.avatar);
              } else {
                Alert.alert(i18n.t('NoPhoto'));
              }
            }}
          >
            <Avatar
              key={item.id}
              name={item.user?.name}
              imageUri={item.user?.avatar || undefined}
            />
          </TouchableOpacity>

          <View style={styles.postDetails}>
            <TouchableOpacity
              onPress={() => onUserProfile(item.user?.uid)}
            >
              <Text style={styles.userName}>{item.user?.name || i18n.t('anonymous')}</Text>
            </TouchableOpacity>
            <Text style={styles.postCity}>{item.city || i18n.t('unknown')}</Text>
            <Text style={styles.postTimestamp}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>

        <View style={styles.topRightIcons}>
            {category && (
                <Image source={category.icon} style={styles.categoryIcon} />
            )}
          <TouchableOpacity onPress={() => onReport(item.id, item.user.uid)}>
            <Ionicons name="ellipsis-vertical" size={20} color="#888" style={styles.moreIconInline} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.postText}>{item.content}</Text>

      {item.imageUrl && (
        <TouchableOpacity onPress={() => onOpenImage(item.imageUrl)}>
          <View style={styles.postImageWrapper}>
            <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode='cover' />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.likeButtonWrapper}>
        <LikeButton postId={item.id} userId={userId} />
      </View>

      {userId === item.user?.uid && (
        <TouchableOpacity onPress={() => onDelete(item.id, item.imageUrl)} style={styles.deleteButton}>
          <Text style={styles.deleteText}>{i18n.t('deletePost')}</Text>
        </TouchableOpacity>
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
    marginLeft: 10,
    flexShrink: 1,
  },
  userName: {
    fontWeight: 'bold',
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
  likeButtonWrapper: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    paddingVertical: 5,
    paddingHorizontal: 30,
    alignItems: 'flex-end'
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
    marginRight: 8,
    marginBottom: 20,
  },
  moreIconInline: {
    padding: 2,
    marginBottom: 35,
  },
});
