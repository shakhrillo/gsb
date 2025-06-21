const admin = require('firebase-admin');
const firebasekeysPath = require('../../yolda-e6aae-c6831b5fbb58.json');
const firebaseProjectId = process.env.APP_FIREBASE_PROJECT_ID;

try {
  admin.initializeApp({
    projectId: `${process.env.APP_FIREBASE_PROJECT_ID}`,
    credential: admin.credential.cert(firebasekeysPath),
    storageBucket: `gs://${firebaseProjectId}.firebasestorage.app`,
  });
} catch (error) {
  console.error("Firebase initialization error", error);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
