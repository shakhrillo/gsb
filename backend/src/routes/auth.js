/**
 * Authentication Routes with Enhanced OTP System
 * 
 * Features:
 * - Secure OTP generation and validation
 * - Rate limiting for OTP requests
 * - OTP expiration (5 minutes)
 * - Attempt limiting (3 attempts max)
 * - Automatic cleanup of expired OTPs
 * - Phone number format validation
 * - OTP status checking
 * - Resend OTP functionality
 * - Production SMS integration with Eskiz.uz
 * - Development mode with console logging
 * 
 * Environment Variables Required:
 * - ESKIZ_LOGIN: Your Eskiz.uz account email
 * - ESKIZ_API_KEY: Your Eskiz.uz API key
 * - SKIP_SMS: Set to 'true' to skip SMS in development
 * - APP_ENVIRONMENT: 'development' or 'production'
 */

const express = require('express');
const { validateUser } = require('../middleware/validateUser');
const authService = require('../services/auth.service');
const userService = require('../services/user.service');

const router = express.Router();

router.post('/send-otp', async (req, res) => {
  try {
    let { phone } = req.body;
    
    // Validate phone number format
    if (!phone) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Phone number is required' 
      });
    }

    // Remove spaces
    phone = phone.replace(/\s+/g, '');

    // Basic phone number validation
    if (!authService.validatePhoneNumber(phone)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid phone number format' 
      });
    }

    // Check if OTP was recently sent (rate limiting)
    const { isInCooldown, remainingTime } = await authService.checkOtpCooldown(phone);
    if (isInCooldown) {
      return res.status(429).json({ 
        status: 'error',
        message: `Please wait ${remainingTime} seconds before requesting a new OTP`,
        remainingTime
      });
    }

    // Generate and store OTP
    const otp = authService.generateOtp();
    await authService.storeOtp(phone, otp);

    // Send SMS
    const { success, error } = await authService.sendOtpSms(phone, otp);
    if (!success) {
      // Clean up OTP if SMS fails in production
      await authService.cleanupOtp(phone);
      return res.status(500).json({ 
        status: 'error',
        message: 'Failed to send OTP. Please try again.' 
      });
    }

    res.status(200).json({ 
      status: 'success',
      message: 'OTP sent successfully',
      expiresIn: 300 // 5 minutes in seconds
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error' 
    });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    let { phone, otp } = req.body;

    // Validate input
    if (!phone || !otp) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Phone number and OTP are required' 
      });
    }

    // Remove spaces from phone number
    phone = phone.replace(/\s+/g, '');

    // Normalize OTP to number
    if (typeof otp === 'string') {
      otp = parseInt(otp, 10);
    }

    // Validate OTP format
    if (!authService.validateOtpFormat(otp)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'OTP must be a 6-digit number' 
      });
    }

    // Verify OTP
    const verificationResult = await authService.verifyOtp(phone, otp);
    if (!verificationResult.success) {
      const status = verificationResult.error.includes('Maximum') ? 429 : 400;
      const response = { 
        status: 'error',
        message: verificationResult.error
      };
      
      if (verificationResult.remainingAttempts !== undefined) {
        response.remainingAttempts = verificationResult.remainingAttempts;
      }
      
      return res.status(status).json(response);
    }

    // Create or update user and generate token
    const { userDoc, token } = await authService.createOrUpdateUser(phone);

    // Clean up OTP after successful verification
    await authService.cleanupOtp(phone);

    const firebaseToken = await authService.generateFirebaseToken(userDoc.id);

    res.status(200).json({ 
      status: 'success',
      message: 'OTP verified successfully',
      token,
      firebaseToken,
      user: { ...userDoc.data(), uid: userDoc.id }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error' 
    });
  }
});

// Refresh token endpoint
router.post('/refresh-token', validateUser, (req, res) => {
  try {
    const user = req.user;
    const newToken = userService.generateRefreshToken(user.uid);
    res.status(200).json({ 
      status: 'success',
      token: newToken, 
      user 
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error' 
    });
  }
});

// Get current user
router.get('/current-user', validateUser, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error' 
    });
  }
});

// Update current user
router.put('/current-user', validateUser, async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;

    const result = await userService.updateUser(user.uid, updates);
    
    if (!result.success) {
      return res.status(400).json({ 
        status: 'error',
        message: result.error 
      });
    }

    res.status(200).json({
      status: 'success',
      data: result.data
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error' 
    });
  }
});

// Send request to become merchant
router.post('/become-merchant', validateUser, async (req, res) => {
  try {
    const user = req.user;
    const merchantData = req.body;

    // Pass user information along with merchant data
    const result = await userService.requestMerchantStatus(user.uid, merchantData);
    
    if (!result.success) {
      console.error('Merchant request error:', result.error);
      return res.status(400).json({ 
        status: 'error',
        message: result.error 
      });
    }

    res.status(200).json({ 
      status: 'success',
      message: 'Merchant request submitted successfully' 
    });
  } catch (error) {
    console.error('Become merchant error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error' 
    });
  }
});

// Resend OTP endpoint
router.post('/resend-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Phone number is required' 
      });
    }

    // Check resend cooldown and existence
    const { isInCooldown, remainingTime, exists } = await authService.checkResendCooldown(phone);
    
    if (!exists) {
      return res.status(404).json({ 
        status: 'error',
        message: 'No OTP request found. Please request a new OTP.' 
      });
    }

    if (isInCooldown) {
      return res.status(429).json({ 
        status: 'error',
        message: `Please wait ${remainingTime} seconds before resending OTP`,
        remainingTime
      });
    }

    // Generate new OTP and update
    const otp = authService.generateOtp();
    await authService.updateOtp(phone, otp);

    // Send SMS
    const { success, error } = await authService.sendOtpSms(phone, otp, true);
    if (!success) {
      return res.status(500).json({ 
        status: 'error',
        message: 'Failed to resend OTP. Please try again.' 
      });
    }

    res.status(200).json({ 
      status: 'success',
      message: 'OTP resent successfully',
      expiresIn: 300
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error' 
    });
  }
});

// Check OTP status endpoint
router.get('/otp-status/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    if (!phone) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Phone number is required' 
      });
    }

    const result = await authService.getOtpStatus(phone);
    
    if (!result.success) {
      return res.status(404).json({ 
        status: 'error',
        message: result.error
      });
    }

    res.status(200).json({ 
      status: 'success',
      data: result.data
    });
  } catch (error) {
    console.error('OTP status error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error' 
    });
  }
});

module.exports = router;
