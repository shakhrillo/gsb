const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const { db, auth } = require('../services/firebase');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const validateUser = async (req, res, next) => {
  const authorization = req.headers.authorization;
  console.log('Authorization header:', authorization);
  const isFirebaseToken = !authorization?.startsWith('Bearer ') && !!authorization;

  if (isFirebaseToken) {
    const firebaseToken = authorization;
    // get user by firebase token
    const decoded = await auth.verifyIdToken(firebaseToken);
    const userRef = db.collection('users').doc(decoded.uid);
    const userDoc = await userRef.get();

    req.user = userDoc.exists ? {
      ...userDoc.data(),
      uid: userDoc.id,
    } : null;

    console.log('User from Firebase:', req.user);

    next();
  }

  const token = authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    console.log('Decoded token:', decoded);
    const userRef = db.collection('users').doc(decoded.uid);
    const userDoc = await userRef.get();

    req.user = userDoc.exists ? {
      ...userDoc.data(),
      uid: userDoc.id,
    } : null;
    next();
  } catch (err) {
    res.status(401).json({ error: err });
  }
};

module.exports = {
  validateUser
};