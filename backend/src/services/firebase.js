const admin = require('firebase-admin');
// const serviceAccount = require('../../gsb-peshku-e85e1ce881b1.json');
const firebasekeysPath = require('../../yolda-e6aae-c6831b5fbb58.json');
const environment = process.env.APP_ENVIRONMENT;
const firebaseProjectId = process.env.APP_FIREBASE_PROJECT_ID;
const firebaseUrl = process.env.APP_FIREBASE_IPV4_ADDRESS;

try {
  // admin.initializeApp({
  //   projectId: "gsb-peshku",
  //   storageBucket: "gsb-peshku.appspot.com",
  // })
  admin.initializeApp({
    projectId: `${process.env.APP_FIREBASE_PROJECT_ID}`,
    credential: admin.credential.cert(firebasekeysPath),
    storageBucket: `gs://${firebaseProjectId}.firebasestorage.app`,
  });
} catch (error) {
  console.error("Firebase initialization error", error);
}

const db = admin.firestore();
// db.settings({
//   host: "localhost:8080",
//   ssl: false
// });

// Auth
const auth = admin.auth();
// auth.useEmulator && auth.useEmulator('localhost', 9099);

module.exports = { admin, db, auth };
