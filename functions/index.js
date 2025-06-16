// To deploy, run the following command:
// firebase deploy --only functions

const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { Expo } = require('expo-server-sdk');
const crypto = require("crypto");
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { defineSecret } = require('firebase-functions/params');

const { getStorage } = require('firebase-admin/storage'); // Add this line to import Firebase Storage

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
const PROMO_HMAC_SECRET = defineSecret("PROMO_HMAC_SECRET");
const sgMail = require('@sendgrid/mail');

initializeApp();
const db = getFirestore();
const storage = getStorage(); // Initialize Firebase Storage
const expo = new Expo();
const auth = getAuth();

const i18n = {
  en: {
    notification: {
      newMessageTitle: "💬 New Message",
      newMessageBody: "New message from",
      newPostTitle: "🆕 New Post in Your City",
      newPostBody: "just posted in",
      likeTitle: "👍 New Like!",
      likeBody: "liked your post.",
      someone: "Someone",
      businessApprovedTitle: "✅ Business Approved!",
      businessApprovedBody: name => `Your business "${name}" has been approved and is now live on InterZone.`,
      musicApprovedTitle: "🎶 Song Approved!",
      musicApprovedBody: (title, city) => `Your song "${title}" is now live in ${city}.`,
    },
    promo: {
      promoRedeemedTitle: "Discount Redeemed!",
      promoRedeemedBody: "Your code was validated at the business.",
      redemptionFailedTitle: "Redemption Failed",
      redemptionFailed: "This claim is not active.",
      codeExpired: "This code has expired. Please claim a new one.",
      notYourPromo: "You don't own this promo.",
      invalidArgument: "Missing QR code or code data.",
      notFound: "Claim not found.",
      invalidSignature: "Invalid QR code signature.",
    }
  },

  es: {
    notification: {
      newMessageTitle: "💬 Nuevo mensaje",
      newMessageBody: "Nuevo mensaje de",
      newPostTitle: "🆕 Nueva publicación en tu ciudad",
      newPostBody: "acaba de publicar en",
      likeTitle: "👍 Nuevo Me Gusta!",
      likeBody: "le dio me gusta a tu publicación.",
      someone: "Alguien",
      businessApprovedTitle: "✅ Negocio Aprobado",
      businessApprovedBody: name => `Tu perfil de negocio "${name}" ha sido aprobado y ya está visible en InterZone.`,
      musicApprovedTitle: "🎶 Canción Aprobada",
      musicApprovedBody: (title, city) => `Tu canción "${title}" ya está disponible en ${city}.`,
    },
    promo: {
      promoRedeemedTitle: "¡Descuento canjeado!",
      promoRedeemedBody: "Tu código fue validado en el negocio.",
      redemptionFailedTitle: "Canje fallido",
      redemptionFailed: "Esta reclamación no está activa.",
      codeExpired: "Este código ha expirado. Reclama uno nuevo.",
      notYourPromo: "No eres dueño de esta promoción.",
      invalidArgument: "Faltan datos del código QR o del código.",
      notFound: "Reclamación no encontrada.",
      invalidSignature: "Firma del código QR no válida.",
    }
  }
};

exports.notifyNewMessage = onDocumentCreated("conversations/{conversationId}/messages/{messageId}", async (event) => {
  const message = event.data.data();
  const conversationId = event.params.conversationId;
  const senderId = message.senderId;
  let receiverId = message.receiverId;

  // If receiverId is not present, fetch from conversation doc
  if (!receiverId) {
    const convoSnap = await db.collection("conversations").doc(conversationId).get();
    const convo = convoSnap.data();
    if (!convo?.users) return;
    receiverId = convo.users.find(uid => uid !== senderId);
  }
  
  // Fetch sender's name
  let senderName = message.senderName;
  if (!senderName) {
    const senderSnap = await db.collection("users").doc(senderId).get();
    senderName = senderSnap.data()?.name || "Someone";
  }

  // Fetch receiver data
  const receiverSnap = await db.collection("users").doc(receiverId).get();
  const receiver = receiverSnap.data();

  if (!receiver?.expoPushToken || !Expo.isExpoPushToken(receiver.expoPushToken)) {
    console.log("❌ Invalid or missing Expo token for receiver");
    return;
  }

  const lang = receiver?.language && i18n[receiver.language] ? receiver.language : 'en';

  const pushMessage = {
    to: receiver.expoPushToken,
    sound: "default",
    title: i18n[lang].notification.newMessageTitle,
    body: message.text ? `${senderName}: ${message.text}` : `${i18n[lang].notification.newMessageBody} ${senderName}`,
    data: {
      type: "message",
      conversationId: conversationId,
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

    const lang = language && i18n[language] ? language : 'en';

    if (
      uid !== posterUid &&
      userLocationLabel &&
      tokenValid &&
      userLocationLabel.toLowerCase() === cityLabel.toLowerCase()
    ) {
      messages.push({
        to: expoPushToken,
        sound: "default",
        title: i18n[lang].notification.newPostTitle,
        body: `${posterName} ${i18n[lang].notification.newPostBody} ${cityLabel}`,
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

exports.notifyNewSongInCity = onDocumentUpdated("songs/{songId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Only trigger when status goes from 'pending' to 'approved'
  if (before.status === 'pending' && after.status === 'approved') {
    const cityLabel = after.city; // The city the song is for
    const songTitle = after.title || 'a new song';
    const artist = after.artist || '';
    const songId = event.params.songId;

    // Fetch all users in that city
    const usersSnap = await db.collection("users").get();

    const messages = [];
    usersSnap.forEach(doc => {
      const user = doc.data();
      const { expoPushToken, language = 'en', lastKnownLocation } = user;
      const tokenValid = expoPushToken && Expo.isExpoPushToken(expoPushToken);

      const userCity = lastKnownLocation?.label;
      const lang = i18n[language] ? language : "en";

      // Only notify users in the same city, with valid tokens
      if (userCity && tokenValid && userCity.toLowerCase() === cityLabel.toLowerCase()) {
        messages.push({
          to: expoPushToken,
          sound: "default",
          title: lang === 'es' ? `🎶 Nueva canción en ${cityLabel}!` : `🎶 New Song in ${cityLabel}!`,
          body: lang === 'es'
            ? `Ya puedes escuchar "${songTitle}" de ${artist}.`
            : `Listen to "${songTitle}" by ${artist} now.`,
          data: {
            type: "music",
            songId,
            city: cityLabel,
            url: `interzone://music?city=${encodeURIComponent(cityLabel)}`
          }
        });
      }
    });

    if (messages.length === 0) {
      console.log("No users to notify for new song in city:", cityLabel);
      return;
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
        console.log(`✅ Sent new music notification to ${chunk.length} users in ${cityLabel}`);
      } catch (err) {
        console.error("❌ Error sending song notifications:", err);
      }
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
exports.generateVerificationCode = onCall(async (request) => {
  const uid = request.auth?.uid;
  const isQrDistributor = request.auth?.token?.isQrDistributor === true;

  console.log('🛂 Auth UID:', uid);
  console.log('🛂 Token claims:', request.auth?.token);

  if (!uid || !isQrDistributor) {
    console.warn('❌ Unauthorized attempt:', { uid, isQrDistributor });
    throw new HttpsError('permission-denied', 'Only authorized users can generate verification codes.');
  }

  const validTypes = ['business', 'musician', 'tutor'];
  const type = request.data.type;

  if (!validTypes.includes(type)) {
    throw new HttpsError('invalid-argument', 'Invalid verification type.');
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

exports.notifyPostLike = onDocumentUpdated("posts/{postId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Check if likedBy array increased in length (someone liked)
  if ((before.likedBy?.length ?? 0) < (after.likedBy?.length ?? 0)) {
    // Find which user(s) liked
    const oldSet = new Set(before.likedBy ?? []);
    const newLikes = (after.likedBy ?? []).filter(uid => !oldSet.has(uid));
    if (!newLikes.length) return;

    // Only notify the post owner, not the liker themself
    const postOwner = after.user?.uid;
    for (const likerUid of newLikes) {
      if (likerUid === postOwner) continue; // Don’t notify on self-likes

      // Get post owner user doc (to get expoPushToken and language)
      const ownerSnap = await db.collection("users").doc(postOwner).get();
      const owner = ownerSnap.data();
      if (!owner?.expoPushToken || !Expo.isExpoPushToken(owner.expoPushToken)) continue;

      // Get the liker’s name
      const likerSnap = await db.collection("users").doc(likerUid).get();
      const liker = likerSnap.data();

      const lang = i18n[owner.language] ? owner.language : "en";
      const likerName = liker?.name || i18n[lang].notification.someone;

      const message = {
        to: owner.expoPushToken,
        sound: "default",
        title: i18n[lang].notification.likeTitle || "👍 New Like!",
        body: `${likerName} ${i18n[lang].notification.likeBody}`,
        data: {
          type: "like",
          postId: event.params.postId,
          url: `interzone://post/${event.params.postId}`
        }
      };

      await expo.sendPushNotificationsAsync([message]);
    }
  }
});

exports.createPromoClaim = onCall({ secrets: [PROMO_HMAC_SECRET] }, async (request) => {
  const { postId } = request.data;
  const userId = request.auth?.uid;

  if (!userId || !postId) {
    throw new HttpsError("invalid-argument", "Missing user or post ID.");
  }

  const postRef = db.collection("posts").doc(postId);
  const claimsRef = db.collection("claims");

  const generateShortCode = (length = 6) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return await db.runTransaction(async (tx) => {
    const postDoc = await tx.get(postRef);
    if (!postDoc.exists) {
      throw new HttpsError("not-found", "Post not found.");
    }

    const postData = postDoc.data();
    const promo = postData.promo;

    if (!promo?.enabled || promo.claimed >= promo.total) {
      throw new HttpsError("failed-precondition", "Promo no longer available.");
    }

    // Check for existing claim
    const existingClaim = await claimsRef
      .where("userId", "==", userId)
      .where("postId", "==", postId)
      .limit(1)
      .get();

    if (!existingClaim.empty) {
      throw new HttpsError("already-exists", "User already claimed this promo.");
    }

    // Generate claim
    const claimId = crypto.randomUUID();
    const shortCode = generateShortCode();
    const qrCodeData = claimId;
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

    const claimData = {
      userId,
      postId,
      createdAt: Timestamp.now(),
      expiresAt: expiresAt,
      redeemedAt: null,
      status: "active",
      shortCode,
      qrCodeData,
    };

    tx.set(claimsRef.doc(claimId), claimData);
    tx.update(postRef, {
      "promo.claimed": FieldValue.increment(1),
    });

    return {
      success: true,
      shortCode,
      qrCodeData,
      claimId,
    };
  });
});

exports.redeemPromoClaim = onCall({ secrets: [PROMO_HMAC_SECRET] }, async (request) => {
  const businessId = request.auth?.uid;
  const { qrCodeData, shortCode } = request.data;

  let lang = "en";
  if (businessId) {
    const businessDoc = await db.collection("users").doc(businessId).get();
    lang = (businessDoc.data()?.language && i18n[businessDoc.data().language]) ? businessDoc.data().language : "en";
  }

  if (!businessId || (!qrCodeData && !shortCode)) {
    throw new HttpsError("invalid-argument", i18n[lang]?.promo?.invalidArgument || "Missing QR or code data.");
  }

  let claimDoc;

  if (qrCodeData) {
    claimDoc = await db.collection("claims").doc(qrCodeData).get();
  } else if (shortCode) {
    const query = await db.collection("claims")
      .where("shortCode", "==", shortCode.toUpperCase())
      .limit(1)
      .get();
    if (query.empty) 
      throw new HttpsError("not-found", i18n[lang]?.promo?.notFound || "Claim not found.");
    claimDoc = query.docs[0];
  } else {
    throw new HttpsError("invalid-argument", i18n[lang]?.promo?.invalidArgument || "Missing QR or code data.");
  }

  const claim = claimDoc.data();

  if (claim?.userId) {
    const customerDoc = await db.collection("users").doc(claim.userId).get();
    lang = (customerDoc.data()?.language && i18n[customerDoc.data().language]) ? customerDoc.data().language : "en";
  }

  if (!claim || claim.status !== "active") {
    throw new HttpsError("failed-precondition", i18n[lang]?.promo?.redemptionFailed || "Claim is not active.");
  }

  if (claim.expiresAt && claim.expiresAt.toDate() < new Date()) {
    // Expired
    throw new HttpsError("failed-precondition", i18n[lang]?.promo?.codeExpired || "This code has expired. Please claim a new one.");
  }

  const postSnap = await db.collection("posts").doc(claim.postId).get();
  const post = postSnap.data();
  if (!post || post.user?.uid !== businessId) {
    throw new HttpsError("permission-denied", i18n[lang]?.promo?.notYourPromo || "You don't own this promo.");
  }

  await claimDoc.ref.update({
    redeemedAt: Timestamp.now(),
    status: "redeemed",
    redeemedBy: businessId
  });

  const customerDoc = await db.collection("users").doc(claim.userId).get();
  const customer = customerDoc.data();
  if (customer?.expoPushToken && Expo.isExpoPushToken(customer.expoPushToken)) {
    const lang = i18n[customer.language] ? customer.language : "en";
    const message = {
      to: customer.expoPushToken,
      sound: "default",
      title: i18n[lang]?.promo?.promoRedeemedTitle || "¡Descuento canjeado!",
      body: i18n[lang]?.promo?.promoRedeemedBody || "Tu código fue validado en el negocio.",
      data: {
        type: "promo_redeemed",
        postId: claim.postId,
        claimId: claimDoc.id,
        status: "redeemed"
      }
    };
    await expo.sendPushNotificationsAsync([message]);
  }

  return {
    success: true,
    userId: claim.userId,
    postId: claim.postId,
    redeemedAt: new Date().toISOString(),
    message: i18n[lang]?.promo?.promoRedeemedTitle
  };
});

exports.sendApprovalNotification = onCall(async (request) => {
  const { userId, type, extraData = {} } = request.data;

  if (!userId || !type) {
    throw new HttpsError("invalid-argument", "Missing userId or type.");
  }

  const userDoc = await db.collection("users").doc(userId).get();
  const user = userDoc.data();

  if (!user?.expoPushToken || !Expo.isExpoPushToken(user.expoPushToken)) {
    console.warn(`❌ Invalid or missing Expo token for user: ${userId}`);
    return { success: false, message: "Invalid or missing push token." };
  }

  const lang = user.language && i18n[user.language] ? user.language : 'en';
  const t = i18n[lang].notification;

  let title = '';
  let body = '';

  if (type === 'business') {
    title = t.businessApprovedTitle;
    body = t.businessApprovedBody(extraData.name || 'your business');
  } else if (type === 'music') {
    title = t.musicApprovedTitle;
    body = t.musicApprovedBody(extraData.title || 'your song', extraData.city || 'your city');
  } else {
    throw new HttpsError('invalid-argument', 'Invalid notification type.');
  }

  const message = {
    to: user.expoPushToken,
    sound: 'default',
    title,
    body,
    data: {
      type,
      userId,
      ...(extraData?.songId && { songId: extraData.songId }),
    },
  };

  try {
    await expo.sendPushNotificationsAsync([message]);
    console.log(`✅ Sent approval notification to ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending approval notification:', error);
    throw new HttpsError('internal', 'Failed to send push notification.');
  }
});
