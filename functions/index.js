const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { Expo } = require('expo-server-sdk');

initializeApp();
const db = getFirestore();
const expo = new Expo();

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

  const pushMessage = {
    to: receiver.expoPushToken,
    sound: "default",
    title: "💬 New Message",
    body: `New message from ${senderName}`,
    data: {
      type: "message",
      conversationId: message.conversationId
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

  const usersSnap = await db.collection("users").where("city", "==", city).get();
  const messages = [];

  usersSnap.forEach(doc => {
    const user = doc.data();
    if (user.uid !== posterUid && Expo.isExpoPushToken(user.expoPushToken)) {
      messages.push({
        to: user.expoPushToken,
        sound: "default",
        title: "🆕 New Post in Your City",
        body: `${posterName} just posted in ${city}`,
        data: {
          type: "post",
          postId: event.params.postId
        }
      });
    }
  });

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
