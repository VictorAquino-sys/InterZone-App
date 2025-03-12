import React, { useState, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from '../../config/firebase';

const LikeButton = ({ postId, userId }) => {
    const [liked, setLiked] = useState(false);

    useEffect(() => {
        const fetchLikeStatus = async () => {
            const postRef = doc(db, "posts", postId);
            const postSnap = await getDoc(postRef);
            if (postSnap.exists()) {
                const likes = postSnap.data().likedBy || [];
                setLiked(likes.includes(userId));
            }
        };

        fetchLikeStatus();
    }, [postId, userId]);

    const toggleLike = async () => {
        const postRef = doc(db, "posts", postId);
        setLiked(!liked);  // Optimistic update
        if (liked) {
            await updateDoc(postRef, {
                likedBy: arrayRemove(userId)
            }).catch(() => setLiked(true)); // Revert on error
        } else {
            await updateDoc(postRef, {
                likedBy: arrayUnion(userId)
            }).catch(() => setLiked(false)); // Revert on error
        }
    };

    return (
        <TouchableOpacity onPress={toggleLike}>
            <FontAwesome name={liked ? 'heart' : 'heart-o'} size={24} color={liked ? 'red' : 'grey'} />
        </TouchableOpacity>
    );
};

export default LikeButton;