const admin = require('firebase-admin');
// const firebasekeysPath = require('../../yolda-e6aae-c6831b5fbb58.json');
const firebaseProjectId = process.env.APP_FIREBASE_PROJECT_ID;
const TYPE = process.env.TYPE;
const PROJECT_ID = process.env.PROJECT_ID;
const PRIVATE_KEY_ID = process.env.PRIVATE_KEY_ID;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CLIENT_EMAIL = process.env.CLIENT_EMAIL;
const CLIENT_ID = process.env.CLIENT_ID;
const AUTH_URI = process.env.AUTH_URI;
const TOKEN_URI = process.env.TOKEN_URI;
const AUTH_PROVIDER_X509_CERT_URL = process.env.AUTH_PROVIDER_X509_CERT_URL;
const CLIENT_X509_CERT_URL = process.env.CLIENT_X509_CERT_URL;
const UNIVERSE_DOMAIN = process.env.UNIVERSE_DOMAIN;

const firebasekeys = {
  "type": TYPE,
  "project_id": PROJECT_ID,
  "private_key_id": PRIVATE_KEY_ID,
  "private_key": PRIVATE_KEY,
  "client_email": CLIENT_EMAIL,
  "client_id": CLIENT_ID,
  "auth_uri": AUTH_URI,
  "token_uri": TOKEN_URI,
  "auth_provider_x509_cert_url": AUTH_PROVIDER_X509_CERT_URL,
  "client_x509_cert_url": CLIENT_X509_CERT_URL,
  "universe_domain": UNIVERSE_DOMAIN,
};

try {
  admin.initializeApp({
    projectId: `${process.env.APP_FIREBASE_PROJECT_ID}`,
    credential: admin.credential.cert(firebasekeys),
    storageBucket: `gs://${firebaseProjectId}.firebasestorage.app`,
  });
} catch (error) {
  console.error("Firebase initialization error", error);
}


const db = admin.firestore();
const auth = admin.auth();

// Export FieldValue for atomic operations
const FieldValue = admin.firestore.FieldValue;

module.exports = { admin, db, auth, FieldValue };
