const admin = require("firebase-admin");
const serviceAccount = require("C:\\Users\\gonza\\Downloads\\interzone-production-firebase-adminsdk-4pj40-827ed1addd.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'interzone-production'  // Specify your Firebase project ID here
  });

const db = admin.firestore();

const historyData = require('../src/utils/historyData').historyData.results; // Adjust path and property access based on your file structure

function shuffleArray(array) {
    for (let i = array.lengh - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j] = [array[j], array[i]]];
    }
}

async function uploadHistory() {
  const batch = db.batch();
  historyData.forEach((question, index) => {
    const docRef = db.collection('history').doc(`question${question.id}`); // Create a document for each question
    batch.set(docRef, {
        category: question.category,
        question: question.question,
        correct_answer: question.correct_answer,
        options: question.options,
    });
  });

  await batch.commit();
  console.log('History questions have been uploaded!');
}

uploadHistory().catch(console.error);
