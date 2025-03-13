import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from '../config/firebase';

const LikeButton = ({ postId, userId }) => {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

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
            const newLiked = !liked;
            setLiked(newLiked);
            await updateDoc(postRef, {
                likedBy: newLiked ? arrayUnion(userId) : arrayRemove(userId)
            });
            setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
        } catch (error) {
            console.error("Error toggling like:", error);
            setLiked(!newLiked); // Revert optimistic update on error
        }
    };

    return (
        <TouchableOpacity onPress={toggleLike} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome name={liked ? 'heart' : 'heart-o'} size={24} color={liked ? 'red' : 'grey'} />
            {likeCount > 0 && <Text>{likeCount}</Text>}
        </TouchableOpacity>
    );
};

export default LikeButton;