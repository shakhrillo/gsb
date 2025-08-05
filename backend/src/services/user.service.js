/**
 * User Service
 * 
 * Handles user management operations including login, user updates,
 * and merchant functionality.
 */

const { db } = require('./firebase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authService = require('./auth.service');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

class UserService {
  /**
   * Generate refresh token for user
   * @param {string} uid - User ID
   * @returns {string} - New JWT token
   */
  generateRefreshToken(uid) {
    return jwt.sign({ uid }, JWT_SECRET_KEY, { expiresIn: '24h' });
  }

  /**
   * Update user data
   * @param {string} uid - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async updateUser(uid, updates) {
    try {
      // Ensure we don't update protected fields
      if (updates.phone || updates.createdAt || updates.uid) {
        return { success: false, error: 'Cannot update protected fields (phone, createdAt, uid)' };
      }

      const userRef = db.collection('users').doc(uid);
      await userRef.update(updates);

      // Fetch updated user data
      const updatedUserDoc = await userRef.get();
      
      if (!updatedUserDoc.exists) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, data: updatedUserDoc.data() };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Request to become merchant
   * @param {string} uid - User ID
   * @param {Object} merchantData - Merchant registration data
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async requestMerchantStatus(merchantData) {
    try {
      const {
        businessName,
        businessAddress,
        businessType,
        businessOwnerName,
        businessOwnerEmail,
        businessOwnerPhone
      } = merchantData;

      console.log('Merchant request data:', merchantData);

      const dataExample = {
        "businessName": "Example Business",
        "businessAddress": "123 Example St, City, Country",
        "businessType": "Retail",
        "businessOwnerName": "John Doe",
        "businessOwnerEmail": "john.doe@example.com",
        "businessOwnerPhone": "+998914446595"
      };

      if (!businessName || !businessAddress || !businessType || !businessOwnerName || !businessOwnerPhone) {
        return { success: false, error: 'Business name, address, type, owner name, and owner phone are required' };
      }

      // Validate phone number format
      const isValidPhone = authService.validatePhoneNumber(businessOwnerPhone);
      if (!isValidPhone) {
        return { success: false, error: 'Invalid phone number format' };
      }

      const uid = businessOwnerPhone.replace(/\D/g, '');

      // Get current user data
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (userDoc.exists && userDoc.data().isMerchant) {
        return { success: false, error: 'You are already a merchant' };
      }

      // Update user to indicate they want to become a merchant
      await userRef.set({
        isMerchant: true,
        businessName,
        businessAddress,
        businessType,
        businessOwnerName,
        businessOwnerEmail: businessOwnerEmail || '',
        businessOwnerPhone,
        merchantRequestStatus: 'pending',
        merchantRequestDate: new Date(),
        uid,
        createdAt: new Date()
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Merchant request error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get user by ID
   * @param {string} uid - User ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async getUserById(uid) {
    try {
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, data: userDoc.data() };
    } catch (error) {
      console.error('Get user error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - True if passwords match
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
}

// Create singleton instance
const userService = new UserService();

module.exports = userService;
