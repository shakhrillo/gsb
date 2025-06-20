const express = require('express');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const router = express.Router();
const { admin, auth, db } = require('../services/firebase');

// Auth login with email and password
router.post('/login', async (req, res) => {

  try {
    const { email, password } = req.body;

    // Fetch user from Firestore
    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();
  
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
  
    const user = userDoc.data();
    const valid = await bcrypt.compare(password, user.password);
  
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
  
    // Sign JWT
    const token = jwt.sign({ email }, JWT_SECRET_KEY, { expiresIn: '300h' });
    res.json({ ...user, password: null, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);
  await db.collection('users').doc(email).set({ email, password: hashed });

  res.status(201).json({ message: 'User registered' });
});

router.post('/verify-token', async (req, res) => {
  const { token } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    res.status(200).json({ uid: decodedToken.uid });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
