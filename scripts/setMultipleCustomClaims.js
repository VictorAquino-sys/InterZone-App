// scripts/setMultipleCustomClaims.js
// from /scripts run as:
// node setMultipleCustomClaims.js
// or /InterZone-App
// node scripts/setMultipleCustomClaims.js

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

// Define users with specific custom claims
const userClaims = {
  'EOedrEXbw2WHl0WVRQiIwBlUO6o1': {
    admin: true,
    isQrDistributor: true,
    canReviewProfessors: true, // ✅ Added
  }, // Victor Aquino

  'WonrTPp5mvdQkNLNF8uh7KKUkJG3': {
    admin: true,
    isQrDistributor: true,
    canReviewProfessors: true, // ✅ Optional, if Hector needs it
  }, // Hector Aquino

  'KBGirGICA6hPOx3fspzCZtZ6Q092': {
    admin: true,
    isQrDistributor: true,
    canReviewProfessors: true, // ✅ Optional, if Diana needs it
  }, // Diana Aquino

  '3q4gfcQ7YdftSMrlshKGoN7J4QO2': {
    isQrDistributor: true,
    canReviewBusiness: true // Kaina Rojas - limited scoped access
  },
  'qExFO5HwRBTQa7Lq7ShXBFzo9I53': { // Sheyla blues
    premium: true,
  },
  '5YB5xUGdzsa5xfyQ3WLeLPMpS0w2': { // Lina Maria
    premium: true,
  },
  '6kxnKnNJMeMdL6rxtOwA7GBM8ME3': { // Lina Maria
    premium: true,
  },
  '2Sjf5Y1oFOfwfX3cjipLicQpRjV2': { // Teddy
    premium: true,
  },
  '1J5eld53XMWOntFLjdzwyK1pK2N2': { // Ragazzi negocio constante de la 24.
    premium: true,
  },
  'fys6JZLNW6TVgFFiaA0y3JGlZ792': { // Gregory italia
    premium: true,
  },
  'JnEnWIbseURXv9LBXL7YvOZ4mEh1': { // Jan Anacata
    premium: true,
  },
};

(async () => {
  for (const [uid, claims] of Object.entries(userClaims)) {
    if (!uid || typeof uid !== 'string' || uid.length > 128) {
      console.error(`❌ Skipping invalid UID: "${uid}"`);
      continue;
    }

    try {
      await auth.setCustomUserClaims(uid, claims);
      console.log(`✅ Set claims for UID ${uid}:`, claims);
    } catch (error) {
      console.error(`❌ Failed to set claims for UID ${uid}:`, error.message);
    }
  }

  console.log('🎉 Finished assigning custom claims.');
})();
