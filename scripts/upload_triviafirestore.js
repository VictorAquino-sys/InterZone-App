const admin = require("firebase-admin");
const serviceAccount = require("C:\\Users\\gonza\\Downloads\\interzone-production-firebase-adminsdk-4pj40-827ed1addd.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'interzone-production'  // Specify your Firebase project ID here
  });

const db = admin.firestore();

const triviaData = require('../src/utils/triviaData').triviaData.results; // Adjust path and property access based on your file structure

async function uploadTrivia() {
  const batch = db.batch();
  triviaData.forEach((question, index) => {
    const docRef = db.collection('trivia').doc(`question${index + 1}`); // Create a document for each question
    batch.set(docRef, {
      category: question.category,
      type: question.type,
      difficulty: question.difficulty,
      question: {
        en: question.question.en,
        es: question.question.es
      },
      correct_answer: {
        en: question.correct_answer.en,
        es: question.correct_answer.es
      },
      incorrect_answers: question.incorrect_answers.map(answer => ({
        en: answer.en,
        es: answer.es
      }))
    });
  });

  await batch.commit();
  console.log('Trivia questions have been uploaded!');
}

uploadTrivia().catch(console.error);
