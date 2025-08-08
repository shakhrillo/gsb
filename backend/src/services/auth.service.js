/**
 * Authentication Service
 * 
 * Handles OTP generation, validation, user management, and SMS integration
 * for the authentication system.
 */

const { db, auth } = require('./firebase');
const { sendSms, sendTestSms } = require('./sms');
const jwt = require('jsonwebtoken');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const APP_ENVIRONMENT = process.env.APP_ENVIRONMENT || 'development';

class AuthService {
  constructor() {
    this.cooldownPeriod = 60000; // 1 minute for new OTP
    this.resendCooldown = 30000; // 30 seconds for resend
    this.otpExpiry = 5 * 60 * 1000; // 5 minutes
    this.maxAttempts = 3;
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Generate Firebase custom token for authentication
   * @param {string} uid - User identifier (phone number)
   * @param {Object} additionalClaims - Optional additional claims to include in the token
   * @returns {Promise<string>} - Firebase custom token
   */
  async generateFirebaseToken(uid, additionalClaims = {}) {
    try {
      const customToken = await auth.createCustomToken(uid, additionalClaims);
      return customToken;
    } catch (error) {
      console.error('Error generating Firebase custom token:', error);
      throw new Error('Failed to generate Firebase authentication token');
    }
  }

  /**
   * Validate phone number format for Uzbek numbers
   * @param {string} phone - Phone number to validate (must start with +998)
   * @returns {boolean} - True if valid Uzbek phone number
   */
  validatePhoneNumber(phone) {
    const phoneRegex = /^\+998[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Generate a secure 6-digit OTP
   * @returns {number} - 6-digit OTP
   */
  generateOtp() {
    if (APP_ENVIRONMENT === 'development') {
      return 123456;
    }
    
    return Math.floor(100000 + Math.random() * 900000);
  }

  /**
   * Check if OTP request is within cooldown period
   * @param {string} phone - Phone number
   * @returns {Promise<{isInCooldown: boolean, remainingTime: number}>}
   */
  async checkOtpCooldown(phone) {
    const existingOtpDoc = await db.collection('otps').doc(phone).get();
    
    if (existingOtpDoc.exists) {
      const existingOtp = existingOtpDoc.data();
      const timeDiff = new Date() - existingOtp.createdAt.toDate();
      
      if (timeDiff < this.cooldownPeriod) {
        const remainingTime = Math.ceil((this.cooldownPeriod - timeDiff) / 1000);
        return { isInCooldown: true, remainingTime };
      }
    }
    
    return { isInCooldown: false, remainingTime: 0 };
  }

  /**
   * Check if resend request is within cooldown period
   * @param {string} phone - Phone number
   * @returns {Promise<{isInCooldown: boolean, remainingTime: number, exists: boolean}>}
   */
  async checkResendCooldown(phone) {
    const existingOtpDoc = await db.collection('otps').doc(phone).get();
    
    if (!existingOtpDoc.exists) {
      return { isInCooldown: false, remainingTime: 0, exists: false };
    }

    const existingOtp = existingOtpDoc.data();
    const timeDiff = new Date() - existingOtp.createdAt.toDate();
    
    if (timeDiff < this.resendCooldown) {
      const remainingTime = Math.ceil((this.resendCooldown - timeDiff) / 1000);
      return { isInCooldown: true, remainingTime, exists: true };
    }
    
    return { isInCooldown: false, remainingTime: 0, exists: true };
  }

  /**
   * Store OTP in database
   * @param {string} phone - Phone number
   * @param {number} otp - OTP code
   * @returns {Promise<void>}
   */
  async storeOtp(phone, otp) {
    const expiresAt = new Date(Date.now() + this.otpExpiry);
    
    await db.collection('otps').doc(phone).set({
      otp,
      createdAt: new Date(),
      expiresAt,
      attempts: 0,
      maxAttempts: this.maxAttempts,
      isUsed: false
    });
  }

  /**
   * Update existing OTP with new values
   * @param {string} phone - Phone number
   * @param {number} otp - New OTP code
   * @returns {Promise<void>}
   */
  async updateOtp(phone, otp) {
    const expiresAt = new Date(Date.now() + this.otpExpiry);
    
    await db.collection('otps').doc(phone).update({
      otp,
      createdAt: new Date(),
      expiresAt,
      attempts: 0,
      isUsed: false
    });
  }

  /**
   * Send SMS with OTP
   * @param {string} phone - Phone number
   * @param {number} otp - OTP code
   * @param {boolean} isResend - Whether this is a resend request
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async sendOtpSms(phone, otp, isResend = false) {
    const isDevelopment = process.env.APP_ENVIRONMENT === 'development';
    const skipSms = process.env.SKIP_SMS === 'true';
    
    if (skipSms) {
      console.log(`DEV MODE - ${isResend ? 'Resent ' : ''}OTP for ${phone}: ${otp}`);
      return { success: true };
    }
    
    try {
      const message = isResend 
        ? `Your new verification code is: ${otp}. This code expires in 5 minutes.`
        : `Your verification code is: ${otp}. This code expires in 5 minutes.`;
      if (isDevelopment) {
        console.log(`DEV MODE - ${isResend ? 'Resent ' : ''}OTP for ${phone}: ${otp}`);
        // await sendTestSms(phone, message);
      } else {
        await sendSms(phone, message);
      }
      return { success: true };
    } catch (error) {
      console.error('SMS sending failed:', error);
      
      if (isDevelopment) {
        console.log(`DEV MODE - ${isResend ? 'Resent ' : ''}OTP for ${phone}: ${otp}`);
        return { success: true };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Get OTP data from database
   * @param {string} phone - Phone number
   * @returns {Promise<{exists: boolean, data?: any}>}
   */
  async getOtpData(phone) {
    const otpDoc = await db.collection('otps').doc(phone).get();
    
    if (!otpDoc.exists) {
      return { exists: false };
    }
    
    return { exists: true, data: otpDoc.data() };
  }

  /**
   * Validate OTP format
   * @param {any} otp - OTP to validate
   * @returns {boolean} - True if valid 6-digit number
   */
  validateOtpFormat(otp) {
    const otpNumber = typeof otp === 'string' ? parseInt(otp, 10) : otp;
    return !isNaN(otpNumber) && otpNumber >= 100000 && otpNumber <= 999999;
  }

  /**
   * Verify OTP against stored value
   * @param {string} phone - Phone number
   * @param {number} otp - OTP to verify
   * @returns {Promise<{success: boolean, error?: string, remainingAttempts?: number}>}
   */
  async verifyOtp(phone, otp) {
    const { exists, data: otpData } = await this.getOtpData(phone);
    
    if (!exists) {
      return { success: false, error: 'OTP not found. Please request a new one.' };
    }

    // Check if OTP is already used
    if (otpData.isUsed) {
      return { success: false, error: 'OTP has already been used. Please request a new one.' };
    }

    // Check if OTP has expired
    if (new Date() > otpData.expiresAt.toDate()) {
      await db.collection('otps').doc(phone).delete();
      return { success: false, error: 'OTP has expired. Please request a new one.' };
    }

    // Check attempt limits
    if (otpData.attempts >= otpData.maxAttempts) {
      await db.collection('otps').doc(phone).delete();
      return { success: false, error: 'Maximum verification attempts exceeded. Please request a new OTP.' };
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      // Increment attempt counter
      await db.collection('otps').doc(phone).update({
        attempts: otpData.attempts + 1
      });
      
      const remainingAttempts = otpData.maxAttempts - (otpData.attempts + 1);
      return { 
        success: false, 
        error: 'Invalid OTP',
        remainingAttempts: Math.max(0, remainingAttempts)
      };
    }

    // Mark OTP as used
    await db.collection('otps').doc(phone).update({
      isUsed: true,
      usedAt: new Date()
    });

    return { success: true };
  }

  /**
   * Create or update user after successful OTP verification
   * @param {string} phone - Phone number
   * @returns {Promise<{userDoc: any, token: string}>}
   */
  async createOrUpdateUser(phone) {
    phone = phone.replace(/\D/g, ''); // Normalize phone number by removing non-digit characters
    const userRef = db.collection('users').doc(phone);
    const userSnapshot = await userRef.get();
    let userDoc;
    
    if (!userSnapshot.exists) {
      // Create a new user if not exists
      await userRef.set({
        phone,
        createdAt: new Date(),
        lastLogin: new Date(),
        isVerified: true,
        uid: phone // Use phone as uid since it's the document ID
      }, { merge: true });
      
      // Get the created document snapshot
      userDoc = await userRef.get();
    } else {
      // Update existing user
      await userRef.update({ 
        lastLogin: new Date(),
        isVerified: true
      });
      
      // Refresh the document to get updated data
      userDoc = await userRef.get();
    }

    // Generate JWT token
    const token = jwt.sign({ uid: userDoc.id }, JWT_SECRET_KEY, { expiresIn: '24h' });

    return { userDoc, token };
  }

  /**
   * Get OTP status information
   * @param {string} phone - Phone number
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async getOtpStatus(phone) {
    const { exists, data: otpData } = await this.getOtpData(phone);
    
    if (!exists) {
      return { success: false, error: 'No OTP found for this phone number' };
    }

    const now = new Date();
    const isExpired = now > otpData.expiresAt.toDate();
    const remainingTime = isExpired ? 0 : Math.ceil((otpData.expiresAt.toDate() - now) / 1000);
    const remainingAttempts = Math.max(0, otpData.maxAttempts - otpData.attempts);

    return {
      success: true,
      data: {
        isExpired,
        isUsed: otpData.isUsed,
        remainingTime,
        remainingAttempts,
        canResend: !otpData.isUsed && (now - otpData.createdAt.toDate()) >= this.resendCooldown
      }
    };
  }

  /**
   * Clean up expired OTPs
   * @returns {Promise<void>}
   */
  async cleanupExpiredOtps() {
    try {
      const expiredOtpsQuery = db.collection('otps')
        .where('expiresAt', '<', new Date());
      
      const expiredOtps = await expiredOtpsQuery.get();
      
      const batch = db.batch();
      expiredOtps.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (!expiredOtps.empty) {
        await batch.commit();
        console.log(`Cleaned up ${expiredOtps.size} expired OTPs`);
      }
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }

  /**
   * Start automatic cleanup interval
   * @private
   */
  startCleanupInterval() {
    // Run cleanup every 10 minutes
    setInterval(() => {
      this.cleanupExpiredOtps();
    }, 10 * 60 * 1000);
  }

  /**
   * Clean up OTP after successful verification
   * @param {string} phone - Phone number
   * @returns {Promise<void>}
   */
  async cleanupOtp(phone) {
    await db.collection('otps').doc(phone).delete();
  }
}

// Create singleton instance
const authService = new AuthService();

module.exports = authService;
