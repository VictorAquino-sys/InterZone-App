const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { Expo } = require('expo-server-sdk');
const functions = require("firebase-functions");
const crypto = require("crypto");
const { getStorage } = require('firebase-admin/storage'); // Add this line to import Firebase Storage

initializeApp();
const db = getFirestore();
const storage = getStorage(); // Initialize Firebase Storage
const expo = new Expo();

const i18n = {
  en: {
    notification: {
      newMessageTitle: "💬 New Message",
      newMessageBody: "New message from",
      newPostTitle: "🆕 New Post in Your City",
      newPostBody: "just posted in",
    },
  },

  es: {
    notification: {
      newMessageTitle: "💬 Nuevo mensaje",
      newMessageBody: "Nuevo mensaje de",
      newPostTitle: "🆕 Nueva publicación en tu ciudad",
      newPostBody: "acaba de publicar en",
    },
  }
};

exports.notifyNewMessage = onDocumentCreated("messages/{messageId}", async (event) => {
  const message = event.data.data();
  const receiverId = message.receiverId;
  const senderName = message.senderName;

  console.log(`📩 New message created. From: ${senderName}, To: ${receiverId}`);

  const receiverSnap = await db.collection("users").doc(receiverId).get();
  const receiver = receiverSnap.data();

  if (!receiver?.expoPushToken || !Expo.isExpoPushToken(receiver.expoPushToken)) {
    console.log("❌ Invalid or missing Expo token for receiver");
    return;
  }

  const lang = receiver.language || 'en';

  const pushMessage = {
    to: receiver.expoPushToken,
    sound: "default",
    title: i18n[lang].notification.newMessageTitle,
    body: message.text || `${i18n[lang].notification.newMessageBody} ${senderName}`,
    data: {
      type: "message",
      conversationId: message.conversationId,
      url: `interzone://chat/${message.conversationId}`
    }
  };

  try {
    const tickets = await expo.sendPushNotificationsAsync([pushMessage]);
    console.log(`✅ Push sent to ${receiverId}`);

    // 🔁 Add receipt handling here
    const receiptIds = tickets
      .filter(ticket => ticket.status === 'ok' && ticket.id)
      .map(ticket => ticket.id);

    const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (const chunk of receiptChunks) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        for (const receiptId in receipts) {
          const { status, message, details } = receipts[receiptId];
          if (status === 'error') {
            console.error(`❌ Receipt error for ${receiptId}: ${message}`, details);
            // Optional: remove invalid tokens from Firestore here
          }
        }
      } catch (err) {
        console.error('❌ Failed to fetch Expo receipts:', err);
      }
    }
  } catch (error) {
    console.error("❌ Push error:", error);
  }
});

exports.notifyNewPost = onDocumentCreated("posts/{postId}", async (event) => {
  const post = event.data.data();
  const cityLabel = post.city; // This should match `lastKnownLocation.label`
  const posterUid = post.user.uid;
  const posterName = post.user.name;
  const postId = event.params.postId;

  console.log(`📬 New post created in city: ${cityLabel} by ${posterName} (uid: ${posterUid})`);

  const usersSnap = await db.collection("users").get();

  const messages = [];

  usersSnap.forEach(doc => {
    const user = doc.data();
    const { uid, expoPushToken, language = 'en' } = user;

    const userLocationLabel = user.lastKnownLocation?.label;
    const tokenValid = expoPushToken && Expo.isExpoPushToken(expoPushToken);

    if (
      uid !== posterUid &&
      userLocationLabel &&
      tokenValid &&
      userLocationLabel.toLowerCase() === cityLabel.toLowerCase()
    ) {
      messages.push({
        to: expoPushToken,
        sound: "default",
        title: i18n[language].notification.newPostTitle,
        body: `${posterName} ${i18n[language].notification.newPostBody} ${cityLabel}`,
        data: {
          type: "post",
          postId: postId,
          url: `interzone://post/${postId}`
        }
      });
    }
  });

  if (messages.length === 0) {
    console.log("❗ No valid users to notify.");
    return;
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log("✅ Sent chunk:", ticketChunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("❌ Error sending push chunk:", error);
    }
  }

  const receiptIds = tickets
    .filter(ticket => ticket.status === 'ok' && ticket.id)
    .map(ticket => ticket.id);

  const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  for (const chunk of receiptChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const receiptId in receipts) {
        const { status, message, details } = receipts[receiptId];
        if (status === 'error') {
          console.error(`❌ Receipt error for ${receiptId}: ${message}`, details);
        }
      }
    } catch (err) {
      console.error("❌ Failed to fetch Expo receipts:", err);
    }
  }
});


// Add reverse friendship
exports.addReverseFriend = onDocumentCreated("users/{userId}/friends/{friendId}", async (event) => {
  const { userId, friendId } = event.params;
  const reverseRef = db.doc(`users/${friendId}/friends/${userId}`);

  try {
    const reverseSnap = await reverseRef.get();
    if (!reverseSnap.exists) {
      await reverseRef.set({ createdAt: FieldValue.serverTimestamp() });
      console.log(`✅ Added reverse friend: ${friendId} -> ${userId}`);
    }
  } catch (error) {
    console.error("❌ Error adding reverse friend:", error);
  }
});

// Remove reverse friendship
exports.removeReverseFriend = onDocumentDeleted("users/{userId}/friends/{friendId}", async (event) => {
  const { userId, friendId } = event.params;
  const reverseRef = db.doc(`users/${friendId}/friends/${userId}`);

  try {
    await reverseRef.delete();
    console.log(`🗑️ Removed reverse friendship: ${friendId} → ${userId}`);
  } catch (error) {
    console.error("❌ Failed to remove reverse friend:", error);
  }
});

// Delete conversation on unfriend
exports.deleteConversationOnUnfriend = onDocumentDeleted("users/{userId}/friends/{friendId}", async (event) => {
  const { userId, friendId } = event.params;

  const conversationsRef = db.collection("conversations")
    .where("participants", "array-contains", userId);

  try {
    const snapshot = await conversationsRef.get();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      if (data.participants.includes(friendId)) {
        const messagesRef = db.collection(`conversations/${doc.id}/messages`);
        const messagesSnap = await messagesRef.get();

        const batch = db.batch();
        messagesSnap.forEach(msg => batch.delete(msg.ref));

        await batch.commit();
        console.log(`🗑️ Deleted ${messagesSnap.size} messages from conversation ${doc.id}`);

        await db.collection("conversations").doc(doc.id).delete();
        console.log(`🗑️ Deleted conversation between ${userId} and ${friendId}`);
      }
    }

  } catch (error) {
    console.error("❌ Failed to delete conversation on unfriend:", error);
  }
});

exports.cleanUpReportsOnCommentDelete = onDocumentDeleted("posts/{postId}/comments/{commentId}", async (event) => {
  const { commentId } = event.params;
  const reportsRef = db.collection("reports");

  try {
    const snapshot = await reportsRef.where("commentId", "==", commentId).get();

    if (snapshot.empty) {
      console.log(`📭 No reports found for deleted comment ${commentId}`);
      return;
    }

    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`🧹 Cleaned up ${snapshot.size} report(s) for deleted comment ${commentId}`);
  } catch (error) {
    console.error(`❌ Failed to clean reports for comment ${commentId}:`, error);
  }
});


exports.cleanUpPostMediaOnDelete = onDocumentDeleted("posts/{postId}", async (event) => {
  const post = event.data?.data();
  const postId = event.params.postId;

  if (!post) {
    console.log(`🫥 Post ${postId} deleted but no data found.`);
    return;
  }

  const bucket = storage.bucket();

  // 🧹 Delete image if it exists
  if (post.imagePath) {
    try {
      await bucket.file(post.imagePath).delete();
      console.log(`🗑️ Deleted image: ${post.imagePath} for post ${postId}`);
    } catch (error) {
      if (error.code === 404) {
        console.warn(`⚠️ Image not found: ${post.imagePath}`);
      } else {
        console.error(`❌ Failed to delete image ${post.imagePath}:`, error);
      }
    }
  }

  // 🧹 Delete video if it exists
  if (post.videoPath) {
    try {
      await bucket.file(post.videoPath).delete();
      console.log(`🗑️ Deleted video: ${post.videoPath} for post ${postId}`);
    } catch (error) {
      if (error.code === 404) {
        console.warn(`⚠️ Video not found: ${post.videoPath}`);
      } else {
        console.error(`❌ Failed to delete video ${post.videoPath}:`, error);
      }
    }
  }
});

// \ud83d\udd10 Generate QR Code Verification
exports.generateVerificationCode = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  const isQrDistributor = context.auth?.token?.isQrDistributor;

  if (!uid || !isQrDistributor) {
    throw new functions.https.HttpsError('permission-denied', 'Only authorized users can generate verification codes.');
  }

  const validTypes = ['business', 'musician', 'tutor'];
  const type = data.type;

  if (!validTypes.includes(type)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid verification type.');
  }

  const code = crypto.randomBytes(5).toString('hex');
  const createdAt = Timestamp.now();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  await db.collection('verifications').doc(code).set({
    createdAt,
    expiresAt,
    used: false,
    usedBy: null,
    generatedBy: uid,
    type, // 🟢 Store the type
  });

  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(code)}`;

  return {
    code,
    qrUrl,
    expiresAt: expiresAt.toDate().toISOString(),
  };
});
