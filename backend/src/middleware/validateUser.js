const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const { db, auth } = require('../services/firebase');
const tokenBlacklistService = require('../services/tokenBlacklist.service');

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
    
    // Check if token is blacklisted (if jti is present)
    if (decoded.jti) {
      const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(decoded.jti);
      if (isBlacklisted) {
        return res.status(401).json({ 
          status: 'error',
          message: 'Token has been revoked' 
        });
      }
    }
    
    const userRef = db.collection('users').doc(decoded.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(401).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    const userData = userDoc.data();
    
    // Check if user's tokens have been invalidated (tokenVersion check)
    if (userData.tokenVersion && decoded.iat < userData.tokenVersion / 1000) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Token has been invalidated. Please login again.' 
      });
    }

    req.user = {
      ...userData,
      uid: userDoc.id,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 'error',
        message: 'Token has expired. Please login again.' 
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid token. Please login again.' 
      });
    }
    
    console.error('Token validation error:', err);
    res.status(401).json({ 
      status: 'error',
      message: 'Token validation failed' 
    });
  }
};

module.exports = {
  validateUser
};