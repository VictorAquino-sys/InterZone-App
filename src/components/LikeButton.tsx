import React, { useState, useEffect, FunctionComponent } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from '../config/firebase';

type LikeButtonProps = {
    postId: string;
    userId: string;
    likedCount?: number;  // Suggest renaming for clarity
}

const LikeButton: FunctionComponent<LikeButtonProps> = ({ postId, userId, likedCount = 0 }) => {
    const [liked, setLiked] = useState<boolean>(false);
    const [likeCount, setLikeCount] = useState<number>(likedCount);

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

    const toggleLike = async () => {
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
        
            await updateDoc(postRef, {
              likedBy: updatedLikes
            }); 

        } catch (error) {
            console.error("❌ Error toggling like:", error);
            setLiked(prev => !prev);
            setLikeCount(prev => liked ? prev - 1 : prev + 1);
        }
    };

    return (
        <TouchableOpacity onPress={toggleLike} style={styles.button}>
            <FontAwesome name={liked ? 'heart' : 'heart-o'} size={21} color={liked ? 'red' : 'grey'} />
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
      paddingTop: 1, // minor alignment tweak
    },
  });