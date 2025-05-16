import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from '../config/firebase';

type LikeButtonProps = {
  postId: string;
  userId: string;
  likedCount?: number;
};

const LikeButton: React.FC<LikeButtonProps> = ({ postId, userId, likedCount = 0 }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likedCount);
  const [loading, setLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchLikeStatus = async () => {
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const likes = postSnap.data().likedBy || [];
        setLiked(likes.includes(userId));
        setLikeCount(likes.length);
      }
    };

    fetchLikeStatus();
  }, [postId, userId]);

  const bounceAnimation = () => {
    scaleAnim.setValue(1); // Reset scale
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.4,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleLike = async () => {
    if (loading) return;
    setLoading(true);

    const postRef = doc(db, "posts", postId);

    try {
      const postSnap = await getDoc(postRef);
      const currentLikes = postSnap.data()?.likedBy || [];

      const newLiked = !liked;
      const updatedLikes = newLiked
        ? [...new Set([...currentLikes, userId])]
        : currentLikes.filter((uid: string) => uid !== userId);

      setLiked(newLiked);
      setLikeCount(updatedLikes.length);

      if (newLiked) bounceAnimation();

      await updateDoc(postRef, {
        likedBy: updatedLikes,
      });
    } catch (error) {
      console.error("❌ Error toggling like:", error);
      setLiked(prev => !prev);
      setLikeCount(prev => liked ? prev - 1 : prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity onPress={toggleLike} style={styles.button} disabled={loading}>
      {loading ? (
        <ActivityIndicator size="small" color="grey" style={{ marginRight: 6 }} />
      ) : (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <FontAwesome name={liked ? 'heart' : 'heart-o'} size={21} color={liked ? 'red' : 'grey'} />
        </Animated.View>
      )}
      <Text style={styles.count}>{likeCount}</Text>
    </TouchableOpacity>
  );
};

export default LikeButton;

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  count: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    paddingTop: 1,
  },
});
