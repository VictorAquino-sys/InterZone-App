import { db } from '../src/config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

/**
 * Get or create a conversation between two users.
 * Ensures `users` field is used (not `participants`) for Firestore rules.
 */
export const getOrCreateConversation = async (user1Id: string, user2Id: string) => {
  const conversationsRef = collection(db, 'conversations');

  // Sort to ensure consistent key order
  const sortedUsers = [user1Id, user2Id].sort();

  // Find existing convo
  const q = query(
    conversationsRef,
    where('users', 'array-contains', user1Id)
  );

  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (Array.isArray(data.users) && data.users.length === 2 && data.users.includes(user2Id)) {
      return { id: docSnap.id, ...data };
    }
  }

  // If no conversation exists, create one
  const newConvoId = `${sortedUsers[0]}_${sortedUsers[1]}`;
  const newDocRef = doc(conversationsRef, newConvoId);
  
  await setDoc(newDocRef, {
    users: sortedUsers,
    updatedAt: serverTimestamp(),
    lastMessage: '',
  });
  
  return {
    id: newDocRef.id,
    users: sortedUsers,
    updatedAt: Timestamp.now(),
    lastMessage: '',
  };
};

/**
 * Send a message to a conversation.
 * Also updates conversation metadata (lastMessage, updatedAt).
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string,
  senderName?: string
) => {
  const convoRef = doc(db, 'conversations', conversationId);
  const convoSnap = await getDoc(convoRef);
  const convoData = convoSnap.data();

  if (!convoData?.users || convoData.users.length !== 2) throw new Error('Invalid conversation');

  // Receiver is the user who is NOT the sender
  const receiverId = convoData.users.find((uid: string) => uid !== senderId);

  const messagesRef = collection(db, `conversations/${conversationId}/messages`);

  // Add the message to the subcollection
  await addDoc(messagesRef, {
    senderId,
    receiverId,
    ...(senderName && { senderName }),
    text,
    timestamp: serverTimestamp(),
  });

  // Update the conversation metadata
  await updateDoc(convoRef, {
    lastMessage: text,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Fetch messages in ascending order.
 */
export const fetchMessages = async (conversationId: string) => {
  const messagesRef = collection(db, `conversations/${conversationId}/messages`);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};