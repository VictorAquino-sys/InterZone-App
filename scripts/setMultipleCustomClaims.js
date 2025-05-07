// scripts/setMultipleCustomClaims.js

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

// Load service account credentials
const serviceAccount = require(path.resolve('C:\\Users\\gonza\\Downloads\\interzone-production-firebase-adminsdk-4pj40-827ed1addd.json'));

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
  projectId: 'interzone-production'
});

const auth = getAuth();

// List of trusted user UIDs
const uids = [
  'EOedrEXbw2WHl0WVRQiIwBlUO6o1',  // Victor Aquino
  'WonrTPp5mvdQkNLNF8uh7KKUkJG3',  // Hector Aquino
  'KBGirGICA6hPOx3fspzCZtZ6Q092',  // Diana Aquino
  // Add more UIDs as needed
];

(async () => {
  for (const uid of uids) {
    if (!uid || typeof uid !== 'string' || uid.length > 128) {
      console.error(`❌ Skipping invalid UID: "${uid}"`);
      continue;
    }

    try {
      await auth.setCustomUserClaims(uid, { isQrDistributor: true });
      console.log(`✅ Custom claim set for UID: ${uid}`);
    } catch (error) {
      console.error(`❌ Failed to set custom claim for UID ${uid}:`, error.message);
    }
  }

  console.log('🎉 Finished setting custom claims.');
})();