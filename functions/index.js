const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { Expo } = require('expo-server-sdk');

initializeApp();
const db = getFirestore();
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
  const city = post.city;
  const posterUid = post.user.uid;
  const posterName = post.user.name;
  const postId = event.params.postId;

  console.log(`📬 New post created in city: ${city} by ${posterName} (uid: ${posterUid})`);

  const usersSnap = await db.collection("users").where("city", "==", city).get();

  console.log(`👥 Users in same city: ${usersSnap.size}`);

  const messages = [];

  usersSnap.forEach(doc => {
    const user = doc.data();
    const { uid, expoPushToken, language = 'en' } = user;

    if (uid !== posterUid && Expo.isExpoPushToken(expoPushToken)) {
      messages.push({
        to: expoPushToken,
        sound: "default",
        title: i18n[language].notification.newPostTitle,
        body: `${posterName} ${i18n[language].notification.newPostBody} ${city}`,
        data: {
          type: "post",
          postId: postId,
          url: `interzone://post/${postId}`, // Deep link to PostDetail
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

  // 🔁 Add receipt handling after sending
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
          // Optional: disable or clean up invalid Expo push tokens in Firestore
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


// Clean up Storage image when post is deleted
exports.cleanUpPostImageOnDelete = onDocumentDeleted("posts/{postId}", async (event) => {
  const post = event.data?.data();
  const postId = event.params.postId;

  if (!post?.imagePath) {
    console.log(`🫼 Post ${postId} deleted without image — nothing to clean.`);
    return;
  }

  const bucket = storage.bucket();
  const file = bucket.file(post.imagePath);

  try {
    await file.delete();
    console.log(`🗑️ Deleted image: ${post.imagePath} for post ${postId}`);
  } catch (error) {
    if (error.code === 404) {
      console.warn(`⚠️ Image not found: ${post.imagePath}`);
    } else {
      console.error(`❌ Failed to delete image ${post.imagePath}:`, error);
    }
  }
});