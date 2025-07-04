import { doc, getDoc, updateDoc } from "firebase/firestore";
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { format, isYesterday, parseISO } from "date-fns";
import { db } from "../config/firebase";

/**
 * Updates the daily posting streak for a business user.
 * If a streak of 5 is reached, sets isFeatured=true.
 * @param userId string - Business user's UID
 * @param currentCity string - City label of the current post
 */
export const updateBusinessPostStreak = async (
  userId: string,
  currentCity: string
) => {
  if (!userId || !currentCity) return;

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const businessProfile = userSnap.data().businessProfile || {};
  const postStreak = businessProfile.postStreak || {};
  const today = format(new Date(), "yyyy-MM-dd");

  let { count = 0, lastPostDate = null, city = "", isFeatured = false, featuredSince = null } = postStreak;

  // Save original featured state for later comparison
  const wasFeatured = isFeatured;

  if (city !== currentCity) {
    // City changed: reset streak
    count = 0;
    city = currentCity;
    lastPostDate = null;
    isFeatured = false;
    featuredSince = null;
  }

  if (lastPostDate === today) {
    // Already posted today, do nothing
    return;
  } else if (lastPostDate && isYesterday(parseISO(lastPostDate))) {
    count += 1;
  } else {
    count = 1;
  }

  lastPostDate = today;

  // If streak hits 5 and not already featured, update featured fields
  if (count >= 5 && !isFeatured) {
    isFeatured = true;
    featuredSince = new Date().toISOString();
  }

  // If streak is broken and business was featured, remove feature
  if (count < 5 && isFeatured) {
    isFeatured = false;
    featuredSince = null;
  }

  // Always update the streak info
  await updateDoc(userRef, {
    "businessProfile.postStreak": {
      count,
      lastPostDate,
      city,
      isFeatured,
      featuredSince: isFeatured ? featuredSince : null,
    },
  });

  // ✅ Only update posts if the featured status actually changed
  if (wasFeatured !== isFeatured) {
    await setBusinessFeaturedForPosts(userId, isFeatured);
  }
};

/**
 * Batch update all posts by the business to set isBusinessFeatured.
 * @param businessUid string - Business user's UID
 * @param isFeatured boolean
 */
export async function setBusinessFeaturedForPosts(businessUid: string, isFeatured: boolean) {
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, where('user.uid', '==', businessUid));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  snapshot.forEach(docSnap => {
    batch.update(docSnap.ref, { isBusinessFeatured: isFeatured });
  });

  await batch.commit();
}