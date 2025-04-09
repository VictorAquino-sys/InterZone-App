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
} from 'firebase/firestore';

export const getOrCreateConversation = async (user1Id: string, user2Id: string) => {
  const conversationsRef = collection(db, 'conversations');

  const q = query(
    conversationsRef,
    where('participants', 'array-contains', user1Id)
  );

  const snapshot = await getDocs(q);

  for (let docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.participants.includes(user2Id)) {
      return { id: docSnap.id, ...data };
    }
  }

  // If no conversation exists, create one
  const newDocRef = await addDoc(conversationsRef, {
    participants: [user1Id, user2Id],
    lastMessage: '',
    lastTimestamp: serverTimestamp(),
  });

  return {
    id: newDocRef.id,
    participants: [user1Id, user2Id],
    lastMessage: '',
    lastTimestamp: Timestamp.now(),
  };
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string
) => {
  const messagesRef = collection(db, `conversations/${conversationId}/messages`);

  await addDoc(messagesRef, {
    senderId,
    text,
    timestamp: serverTimestamp(),
  });

  await setDoc(
    doc(db, 'conversations', conversationId),
    {
      lastMessage: text,
      lastTimestamp: serverTimestamp(),
    },
    { merge: true }
  );
};

export const fetchMessages = async (conversationId: string) => {
  const messagesRef = collection(db, `conversations/${conversationId}/messages`);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};
