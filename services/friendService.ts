import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    setDoc,
    deleteDoc,
    serverTimestamp
  } from 'firebase/firestore';
  import { db } from '../src/config/firebase';


/**
 * Sends a friend request if it passes all validation checks.
 * @param fromUserId - The user sending the request
 * @param toUserId - The user to receive the request
 * @returns A status code indicating the result
 */
export const sendFriendRequest = async (
  fromUserId: string,
  toUserId: string
): Promise<
  | 'success'
  | 'self_request_not_allowed'
  | 'already_friends'
  | 'request_already_sent'
  | 'reverse_request_exists'
  | 'error'
> => {
  try {
    if (fromUserId === toUserId) {
      console.log("You can't send a friend request to yourself.");
      return 'self_request_not_allowed';
    }

    // 🔍 Check if already friends
    const friendRef = doc(db, `users/${fromUserId}/friends`, toUserId);
    const friendSnap = await getDoc(friendRef);
    if (friendSnap.exists()) {
      console.log('Users are already friends.');
      return 'already_friends';
    }

    // 🔍 Check for existing outgoing request
    const q = query(
      collection(db, 'friend_requests'),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      console.log('Friend request already sent');
      return 'request_already_sent';
    }

    // 🔍 Check for reverse incoming request
    const reverseQ = query(
      collection(db, 'friend_requests'),
      where('fromUserId', '==', toUserId),
      where('toUserId', '==', fromUserId)
    );
    const reverseSnap = await getDocs(reverseQ);
    if (!reverseSnap.empty) {
      console.log('Friend request already exists in reverse direction');
      return 'reverse_request_exists';
    }

    // ✅ Create the request
    await addDoc(collection(db, 'friend_requests'), {
      fromUserId,
      toUserId,
      timestamp: serverTimestamp()
    });

    console.log('Friend request sent!');
    return 'success';
  } catch (error) {
    console.error('Error sending friend request:', error);
    return 'error';
  }
};

  /**
 * Removes a friendship between two users by deleting both friend records.
 * @param {string} userA - One user's ID.
 * @param {string} userB - The other user's ID.
 * @returns {'success' | 'error'}
 */
export const unfriendUser = async (
  userA: string,
  userB: string
): Promise<'success' | 'error'> => {
  try {
    const refAtoB = doc(db, `users/${userA}/friends`, userB);
    const refBtoA = doc(db, `users/${userB}/friends`, userA);

    await Promise.all([deleteDoc(refAtoB), deleteDoc(refBtoA)]);

    console.log(`Unfriended: ${userA} <-> ${userB}`);
    return 'success';
  } catch (error) {
    console.error('Error unfriending users:', error);
    return 'error';
  }
};

  
/**
 * Accepts a pending friend request by ID.
 * @param {string} requestId - The Firestore document ID of the friend request.
 */
export const acceptFriendRequest = async (requestId: string) => {
  try {
    const requestRef = doc(db, 'friend_requests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) return;

    const { fromUserId, toUserId } = requestSnap.data();

    // Add each user to the other's friends collection
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
  
/**
 * Declines (deletes) a friend request.
 * @param {string} requestId - The Firestore document ID of the friend request.
 */
export const declineFriendRequest = async (requestId: string) => {
  try {
    await deleteDoc(doc(db, 'friend_requests', requestId));
    console.log('Friend request declined');
  } catch (error) {
    console.error('Error declining request:', error);
  }
};

/**
 * Checks if two users are already friends.
 */
export const areUsersFriends = async (
  userA: string,
  userB: string
): Promise<boolean> => {
  try {
    const friendRef = doc(db, `users/${userA}/friends`, userB);
    const friendSnap = await getDoc(friendRef);
    return friendSnap.exists();
  } catch (error) {
    console.error('Error checking friendship:', error);
    return false;
  }
};

/**
 * Checks if a friend request has already been sent.
 */
export const hasSentFriendRequest = async (
  fromUserId: string,
  toUserId: string
): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'friend_requests'),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking existing friend request:', error);
    return false;
  }
};