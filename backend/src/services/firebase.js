const admin = require('firebase-admin');
const serviceAccount = require('../../gsb-peshku-e85e1ce881b1.json');
// const serviceAccount = require('../../gsb-peshku-1d0b0c15f22f.json');

try {
  admin.initializeApp({
    projectId: "gsb-peshku"
  })
  // admin.initializeApp({
  //   credential: admin.credential.cert(serviceAccount),
  //   databaseURL: "https://gsb-peshku.firebaseio.com"
  // })
} catch (error) {
  console.error("Firebase initialization error", error);
}

const db = admin.firestore();
db.settings({
  host: "localhost:8080",
  ssl: false
});

// Auth
const auth = admin.auth();
auth.useEmulator && auth.useEmulator('localhost', 9099);

module.exports = { admin, db, auth };
