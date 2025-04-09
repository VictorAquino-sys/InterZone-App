import { collection, addDoc, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/config/firebase';

export const sendFriendRequest = async (fromUserId, toUserId) => {
    try {
        await addDoc(collection(db, 'friend_requests'), {
            fromUserId,
            toUserId,
            timestamp: serverTimestamp()
        });
        console.log("Friend request sent!");
    } catch (error) {
        console.error("Error sending friend request:", error);
    }
};

export const acceptFriendRequest = async (requestId) => {
    try {
        const requestRef = doc(db, 'friend_requests', requestId);
        const requestSnap = await getDoc(requestRef);
        
        if (!requestSnap.exists()) return;

        const { fromUserId, toUserId } = requestSnap.data();

        await setDoc(doc(db, `users/${fromUserId}/friends`, toUserId), {
            friendId: toUserId,
            since: serverTimestamp()
        });

        await setDoc(doc(db, `users/${toUserId}/friends`, fromUserId), {
            friendId: fromUserId,
            since: serverTimestamp()
        });

        await deleteDoc(requestRef);

        console.log('Friend request accepted');
    } catch (error) {
        console.error('Error accepting friend request:', error);
    }
};

export const declineFriendRequest = async (requestId) => {
    try {
        await deleteDoc(doc(db, 'friend_requests', requestId));
        console.log('Friend request declined');
    } catch (error) {
        console.error('Error declining request:', error);
    }
};