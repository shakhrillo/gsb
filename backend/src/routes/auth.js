const express = require('express');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const router = express.Router();
const { db } = require('../services/firebase');
const { validateUser } = require('../middleware/validateUser');

router.post('/login', async (req, res) => {

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();
  
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
  
    const user = userDoc.data();
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ email }, JWT_SECRET_KEY, { expiresIn: '300h' });
    
    delete user.password;
    res.json({ ...user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/register', async (req, res) => {
  const { email, password, type } = req.body;
  
  const userRef = db.collection('users').doc(email);
  const userDoc = await userRef.get();
  if (userDoc.exists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  await db.collection('users').doc(email).set({ email, type, password: hashed });

  res.status(201).json({
    message: 'User registered successfully',
    email,
    type
  });
});

router.put('/update', validateUser, async (req, res) => {
  const user = req.user;
  let data = req.body;
  data = Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'email' && key !== 'password'));

  try {
    await db.collection('users').doc(user.email).update(data);
    res.status(200).json({ message: 'User updated' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.get('/profile', validateUser, async (req, res) => {
  const user = req.user;

  try {
    const userDoc = await db.collection('users').doc(user.email).get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });

    const userData = userDoc.data();
    delete userData.password;
    res.status(200).json(userData);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
