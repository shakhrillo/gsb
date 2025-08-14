/**
 * User Service
 * 
 * Handles user management operations including login, user updates,
 * and merchant functionality.
 */

const { db } = require('./firebase');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authService = require('./auth.service');
const geofire = require('geofire-common');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

class UserService {
  /**
   * Generate refresh token for user with enhanced security
   * @param {string} uid - User ID
   * @param {Object} options - Additional options for token generation
   * @returns {string} - New JWT token
   */
  generateRefreshToken(uid, options = {}) {
    const payload = {
      uid,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      jti: this.generateTokenId(), // Unique token identifier for revocation if needed
      ...options.additionalClaims
    };

    const tokenOptions = {
      expiresIn: options.expiresIn || '24h',
      issuer: 'gsb-app',
      audience: 'gsb-users'
    };

    return jwt.sign(payload, JWT_SECRET_KEY, tokenOptions);
  }

  /**
   * Generate unique token ID for JWT tracking
   * @returns {string} - Unique token identifier
   */
  generateTokenId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
   * Register a new business for merchant
   * @param {string} uid - User ID from authenticated user
   * @param {Object} businessData - Business registration data
   * @returns {Promise<{success: boolean, businessId?: string, error?: string}>}
   */
  async registerBusiness(uid, businessData) {
    try {
      const {
        businessName,
        businessType,
        businessLocation,
        innPinfl,
        bankAccount,
        mfoCode,
        businessLicenseUrl,
        directorPassportUrl,
        businessLogoUrl
      } = businessData;

      console.log('Business registration data:', innPinfl);
      console.log('User ID:', uid);

      // Validate required fields
      if (!businessName || !businessType || !innPinfl || !bankAccount || !mfoCode || !businessLicenseUrl || !directorPassportUrl || !businessLogoUrl) {
        return { 
          success: false, 
          error: 'Business name, type, INN/PINFL, bank account, MFO code, business license URL, director passport URL, and business logo URL are required' 
        };
      }

      // Validate business location if provided
      if (businessLocation && (!businessLocation.latitude || !businessLocation.longitude)) {
        return { 
          success: false, 
          error: 'Business location must include both latitude and longitude' 
        };
      }

      // Check if innPinfl is already registered in businesses collection
      const existingBusinessQuery = await db.collection('businesses')
        .where('innPinfl', '==', innPinfl)
        .get();

      if (!existingBusinessQuery.empty) {
        const existingBusiness = existingBusinessQuery.docs[0];
        const existingData = existingBusiness.data();
        
        if (existingData.status === 'active') {
          return { 
            success: false, 
            error: 'This INN/PINFL is already registered as an active business' 
          };
        }
        
        if (existingData.status === 'pending') {
          return { 
            success: false, 
            error: 'This INN/PINFL already has a pending business registration request' 
          };
        }
      }

      // Get current user data
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return { success: false, error: 'User not found' };
      }

      // Create new business document
      const businessRef = db.collection('businesses').doc();
      const businessId = businessRef.id;

      // Prepare business data
      // const businessData = {
      //   businessId,
      //   ownerId: uid,
      //   businessName,
      //   businessType,
      //   businessLocation: businessLocation || null,
      //   innPinfl,
      //   bankAccount,
      //   mfoCode,
      //   businessLicenseUrl,
      //   directorPassportUrl,
      //   businessLogoUrl,
      //   status: 'pending', // pending, active, rejected
      //   requestDate: new Date(),
      //   createdAt: new Date(),
      //   updatedAt: new Date()
      // };

      const hash = geofire.geohashForLocation([businessLocation.latitude, businessLocation.longitude]);
      // businessData.geohash = hash;

      // // Add GeoPoint if location is provided
      // if (businessLocation && businessLocation.latitude && businessLocation.longitude) {
      //   businessData.geoLocation = new admin.firestore.GeoPoint(
      //     businessLocation.latitude,
      //     businessLocation.longitude
      //   );
      // }

      await businessRef.set({
        businessId,
        ownerId: uid,
        businessName,
        businessType,
        geohash: hash,
        businessLocation: businessLocation || null,
        innPinfl,
        bankAccount,
        mfoCode,
        businessLicenseUrl,
        directorPassportUrl,
        businessLogoUrl,
        status: 'pending', // pending, active, rejected
        requestDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update user to mark as having businesses (if not already)
      const userData = userDoc.data();
      if (!userData.hasBusiness) {
        await userRef.update({
          hasBusiness: true,
          updatedAt: new Date()
        });
      }

      return { success: true, businessId };
    } catch (error) {
      console.error('Business registration error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get user's businesses
   * @param {string} uid - User ID
   * @param {string} status - Filter by status (optional): 'pending', 'active', 'rejected'
   * @returns {Promise<{success: boolean, data?: any[], error?: string}>}
   */
  async getUserBusinesses(uid, status = null) {
    try {
      let query = db.collection('businesses').where('ownerId', '==', uid);
      
      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      
      if (snapshot.empty) {
        return { success: true, data: [] };
      }

      const businesses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, data: businesses };
    } catch (error) {
      console.error('Get user businesses error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Update business status (for admin approval/rejection)
   * @param {string} businessId - Business ID
   * @param {string} status - New status: 'active', 'rejected'
   * @param {string} rejectionReason - Reason for rejection (optional)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateBusinessStatus(businessId, status, rejectionReason = null) {
    try {
      const businessRef = db.collection('businesses').doc(businessId);
      const businessDoc = await businessRef.get();
      
      if (!businessDoc.exists) {
        return { success: false, error: 'Business not found' };
      }

      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'active') {
        updateData.approvedAt = new Date();
      } else if (status === 'rejected' && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
        updateData.rejectedAt = new Date();
      }

      await businessRef.update(updateData);

      return { success: true };
    } catch (error) {
      console.error('Update business status error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Request to become merchant (backward compatibility)
   * This is now just an alias for registerBusiness
   * @param {string} uid - User ID from authenticated user
   * @param {Object} merchantData - Merchant registration data
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async requestMerchantStatus(uid, merchantData) {
    const result = await this.registerBusiness(uid, merchantData);
    // Remove businessId from response to maintain backward compatibility
    if (result.success) {
      return { success: true };
    }
    return result;
  }

  /**
   * Check if user has any active businesses (merchant status)
   * @param {string} uid - User ID
   * @returns {Promise<{success: boolean, isMerchant?: boolean, activeBusinessCount?: number, error?: string}>}
   */
  async checkMerchantStatus(uid) {
    try {
      const activeBusinesses = await this.getUserBusinesses(uid, 'active');
      
      if (!activeBusinesses.success) {
        return activeBusinesses;
      }

      const isMerchant = activeBusinesses.data.length > 0;
      const activeBusinessCount = activeBusinesses.data.length;

      return { 
        success: true, 
        isMerchant, 
        activeBusinessCount,
        businesses: activeBusinesses.data 
      };
    } catch (error) {
      console.error('Check merchant status error:', error);
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
