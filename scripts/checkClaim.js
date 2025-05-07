// scripts/checkClaim.js

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

const serviceAccount = require(path.resolve('C:\\Users\\gonza\\Downloads\\interzone-production-firebase-adminsdk-4pj40-827ed1addd.json'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'interzone-production'
});

const auth = getAuth();
const uid = 'EOedrEXbw2WHl0WVRQiIwBlUO6o1'; // Replace with the UID you want to check

auth.getUser(uid)
  .then(userRecord => {
    console.log(`Custom claims for UID ${uid}:`, userRecord.customClaims);
  })
  .catch(error => {
    console.error('Error fetching user data:', error);
  });
