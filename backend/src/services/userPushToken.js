const { db } = require('./firebase');
const pushNotificationService = require('./pushNotification');

/**
 * Service to manage user push tokens
 */
class UserPushTokenService {
  constructor() {
    this.usersCollection = db.collection('users');
    this.pushTokensCollection = db.collection('push_tokens');
  }

  /**
   * Register a push token for a user
   * @param {string} userId - User ID
   * @param {string} pushToken - Expo push token
   * @param {Object} deviceInfo - Device information (optional)
   */
  async registerPushToken(userId, pushToken, deviceInfo = {}) {
    try {
      // Validate the push token
      if (!pushNotificationService.isValidPushToken(pushToken)) {
        throw new Error('Invalid push token format');
      }

      const tokenData = {
        userId,
        pushToken,
        deviceInfo: {
          platform: deviceInfo.platform || 'unknown',
          deviceId: deviceInfo.deviceId || null,
          deviceName: deviceInfo.deviceName || null,
          osVersion: deviceInfo.osVersion || null,
          appVersion: deviceInfo.appVersion || null,
          ...deviceInfo
        },
        isActive: true,
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      // Check if this token already exists
      const existingTokenQuery = await this.pushTokensCollection
        .where('pushToken', '==', pushToken)
        .get();

      if (!existingTokenQuery.empty) {
        // Update existing token
        const existingDoc = existingTokenQuery.docs[0];
        await existingDoc.ref.update({
          userId,
          deviceInfo: tokenData.deviceInfo,
          isActive: true,
          lastUpdated: new Date()
        });
        console.log(`Updated existing push token for user ${userId}`);
        return existingDoc.id;
      } else {
        // Create new token record
        const docRef = await this.pushTokensCollection.add(tokenData);
        console.log(`Registered new push token for user ${userId}`);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error registering push token:', error);
      throw error;
    }
  }

  /**
   * Get all active push tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of push tokens
   */
  async getUserPushTokens(userId) {
    try {
      const snapshot = await this.pushTokensCollection
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user push tokens:', error);
      throw error;
    }
  }

  /**
   * Get push token strings for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of push token strings
   */
  async getUserPushTokenStrings(userId) {
    try {
      const tokens = await this.getUserPushTokens(userId);
      return tokens.map(token => token.pushToken);
    } catch (error) {
      console.error('Error getting user push token strings:', error);
      throw error;
    }
  }

  /**
   * Get push tokens for multiple users
   * @param {Array} userIds - Array of user IDs
   * @returns {Promise<Array>} - Array of push token strings
   */
  async getMultipleUsersPushTokens(userIds) {
    try {
      const allTokens = [];
      
      // Process in batches to avoid Firestore 'in' query limit of 10
      const batchSize = 10;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        const snapshot = await this.pushTokensCollection
          .where('userId', 'in', batch)
          .where('isActive', '==', true)
          .get();

        const batchTokens = snapshot.docs.map(doc => doc.data().pushToken);
        allTokens.push(...batchTokens);
      }

      return allTokens;
    } catch (error) {
      console.error('Error getting multiple users push tokens:', error);
      throw error;
    }
  }

  /**
   * Deactivate a push token
   * @param {string} pushToken - Push token to deactivate
   */
  async deactivatePushToken(pushToken) {
    try {
      const snapshot = await this.pushTokensCollection
        .where('pushToken', '==', pushToken)
        .get();

      const promises = snapshot.docs.map(doc => 
        doc.ref.update({
          isActive: false,
          deactivatedAt: new Date()
        })
      );

      await Promise.all(promises);
      console.log(`Deactivated push token: ${pushToken}`);
    } catch (error) {
      console.error('Error deactivating push token:', error);
      throw error;
    }
  }

  /**
   * Remove a push token for a user
   * @param {string} userId - User ID
   * @param {string} pushToken - Push token to remove
   */
  async removePushToken(userId, pushToken) {
    try {
      const snapshot = await this.pushTokensCollection
        .where('userId', '==', userId)
        .where('pushToken', '==', pushToken)
        .get();

      const promises = snapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(promises);
      
      console.log(`Removed push token for user ${userId}`);
    } catch (error) {
      console.error('Error removing push token:', error);
      throw error;
    }
  }

  /**
   * Clean up inactive or invalid push tokens
   */
  async cleanupPushTokens() {
    try {
      // Remove tokens that have been inactive for more than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const inactiveSnapshot = await this.pushTokensCollection
        .where('isActive', '==', false)
        .where('deactivatedAt', '<', thirtyDaysAgo)
        .get();

      const deletePromises = inactiveSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);

      console.log(`Cleaned up ${inactiveSnapshot.docs.length} inactive push tokens`);
    } catch (error) {
      console.error('Error cleaning up push tokens:', error);
      throw error;
    }
  }

  /**
   * Update device info for a push token
   * @param {string} pushToken - Push token
   * @param {Object} deviceInfo - Updated device information
   */
  async updateDeviceInfo(pushToken, deviceInfo) {
    try {
      const snapshot = await this.pushTokensCollection
        .where('pushToken', '==', pushToken)
        .get();

      if (snapshot.empty) {
        throw new Error('Push token not found');
      }

      const promises = snapshot.docs.map(doc => 
        doc.ref.update({
          deviceInfo: {
            ...doc.data().deviceInfo,
            ...deviceInfo
          },
          lastUpdated: new Date()
        })
      );

      await Promise.all(promises);
      console.log(`Updated device info for push token: ${pushToken}`);
    } catch (error) {
      console.error('Error updating device info:', error);
      throw error;
    }
  }

  /**
   * Get all admin/restaurant push tokens
   * @returns {Promise<Array>} - Array of admin push token strings
   */
  async getAdminPushTokens() {
    try {
      // You can modify this query based on how you identify admin users
      // For example, if you have a user role field
      const adminUsersSnapshot = await this.usersCollection
        .where('role', '==', 'admin') // Adjust this based on your user schema
        .get();

      if (adminUsersSnapshot.empty) {
        return [];
      }

      const adminUserIds = adminUsersSnapshot.docs.map(doc => doc.id);
      return await this.getMultipleUsersPushTokens(adminUserIds);
    } catch (error) {
      console.error('Error getting admin push tokens:', error);
      return [];
    }
  }
}

module.exports = new UserPushTokenService();
