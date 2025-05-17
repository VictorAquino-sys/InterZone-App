// src/utils/businessRating.ts
import { db } from '@/config/firebase';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

/**
 * Submit or update a rating for a business
 */
export async function submitBusinessRating({
  businessId,
  userId,
  stars,
  review,
  userName,
  userAvatar,
}: {
  businessId: string;
  userId: string;
  stars: number;
  review?: string;
  userName?: string;
  userAvatar?: string;
}) {
  const ratingRef = doc(db, 'businessProfiles', businessId, 'ratings', userId);
  await setDoc(ratingRef, {
    stars,
    review: review?.trim() || '',
    timestamp: serverTimestamp(),
    userName: userName || 'Anonymous',
    userAvatar: userAvatar || '',
  });
}

/**
 * Fetch a user's rating for a specific business
 */
export async function getUserBusinessRating({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const docRef = doc(db, 'businessProfiles', businessId, 'ratings', userId);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

/**
 * Recalculate the average rating for a business
 */
export async function updateBusinessRatingStats(businessId: string) {
    const ratingsSnap = await getDocs(
      collection(db, 'businessProfiles', businessId, 'ratings')
    );
    const allStars = ratingsSnap.docs.map(doc => doc.data().stars);
    const ratingCount = allStars.length;
    const average =
      ratingCount > 0
        ? allStars.reduce((a, b) => a + b, 0) / ratingCount
        : 0;
  
    await setDoc(doc(db, 'businessProfiles', businessId), {
      averageRating: parseFloat(average.toFixed(1)),
      ratingCount,
    }, { merge: true });
}