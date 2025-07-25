const express = require('express');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const router = express.Router();
const { db } = require('../services/firebase');
const { validateUser } = require('../middleware/validateUser');
// const { sendSms } = require('../services/sms');

router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  // Here you would integrate with an SMS service to send the OTP
  // For example, using Twilio or another SMS gateway

  // Simulating OTP sending
  // const otp = Math.floor(100000 + Math.random() * 900000); // Generate a random 6-digit OTP
  const otp = 123456;

  // Store the OTP in memory or a cache for verification later
  await db.collection('otps').doc(phone).set({
    otp,
    createdAt: new Date()
  });

  // In a real application, you would save this OTP in the database or cache for verification later
  // try {
  //   await sendSms(phone, `Tasdiqlash kodi: ${otp}`)
  // } catch (error) {
  //   return res.status(200).json({ message: 'Fake SMS sent successfully', status: 'fake' });
  // }

  res.status(200).json({ message: 'OTP sent successfully' });
});

router.post('/verify-otp', async (req, res) => {
  let { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Phone number and OTP are required' });
  }

  if (typeof otp === 'string') {
    otp = parseInt(otp, 10);
  }

  const otpDoc = await db.collection('otps').doc(phone).get();
  if (!otpDoc.exists || otpDoc.data().otp !== otp) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Invalid OTP' });
  }

  // Update or create user record in the database
  const userRef = db.collection('users').where('phone', '==', phone).limit(1);
  const userSnapshot = await userRef.get();
  let userDoc;
  if (userSnapshot.empty) {
    // Create a new user if not exists
    userDoc = await db.collection('users').add({
      phone,
      createdAt: new Date(),
      lastLogin: new Date(),
    });
    
    // Add uid field to the document
    await userDoc.update({
      uid: userDoc.id
    });
  } else {
    // Update existing user
    userDoc = userSnapshot.docs[0];
    await userDoc.ref.update({ lastLogin: new Date() });
  }

  // OTP is valid, generate JWT token
  const token = jwt.sign({ uid: userDoc.id }, JWT_SECRET_KEY, { expiresIn: '24h' });

  // Optionally, you can delete the OTP after verification
  await db.collection('otps').doc(phone).delete();

  res.status(200).json({ 
    status: 'success',
    message: 'OTP verified successfully',
    token,
    user: { ...userDoc.data(), uid: userDoc.id }
  });
});

// Login by phone with given secret
router.post('/login', async (req, res) => {
  const { phone, secret } = req.body;
  if (!phone || !secret) {
    return res.status(400).json({ message: 'Phone number and secret are required' });
  }
  const userRef = db.collection('users').where('phone', '==', phone).limit(1);
  const userSnapshot = await userRef.get();
  if (userSnapshot.empty) {
    return res.status(404).json({ message: 'User not found' });
  }
  const userDoc = userSnapshot.docs[0];
  const user = userDoc.data();
  if (user.secret !== secret) {
    return res.status(403).json({ message: 'Invalid secret' });
  }
  // Update last login time
  await userDoc.ref.update({ lastLogin: new Date() });
  // Generate JWT token
  const token = jwt.sign({ uid: userDoc.id }, JWT_SECRET_KEY, { expiresIn: '24h' });
  res.status(200).json({ message: 'Login successful', token, user: { ...user, uid: userDoc.id } });
});

// Refresh token endpoint
router.post('/refresh-token', validateUser, (req, res) => {
  const user = req.user;
  const newToken = jwt.sign({ uid: user.uid }, JWT_SECRET_KEY, { expiresIn: '24h' });
  res.status(200).json({ token: newToken, user });
});

// Get current user
router.get('/current-user', validateUser, (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.status(200).json(user);
});

// Update current user everything in body except phone and createdAt
router.put('/current-user', validateUser, async (req, res) => {
  const user = req.user;
  const updates = req.body;

  // Ensure we don't update phone or createdAt
  if (updates.phone || updates.createdAt) {
    return res.status(400).json({ message: 'Cannot update phone or createdAt' });
  }

  const userRef = db.collection('users').doc(user.uid);
  await userRef.update(updates);

  // Fetch updated user data
  const updatedUserDoc = await userRef.get();
  res.status(200).json(updatedUserDoc.data());
});

// Send request to become merchant
router.post('/become-merchant', validateUser, async (req, res) => {
  const user = req.user;
  const { businessName, businessAddress, secret } = req.body;

  if (!businessName || !businessAddress) {
    return res.status(400).json({ message: 'Business name and address are required' });
  }

  // Check if the user is already a merchant
  if (user.isMerchant) {
    return res.status(400).json({ message: 'You are already a merchant' });
  }
  // Optional: Validate secret if needed
  if (secret && secret !== process.env.MERCHANT_SECRET) {
    return res.status(403).json({ message: 'Invalid secret' });
  }

  // Update user to indicate they want to become a merchant
  await db.collection('users').doc(user.uid).update({
    isMerchant: true,
    businessName,
    businessAddress,
    merchantRequestDate: new Date(),
  });

  res.status(200).json({ message: 'Merchant request submitted successfully' });
});

module.exports = router;
