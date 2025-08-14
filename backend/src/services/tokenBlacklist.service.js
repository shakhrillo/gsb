/**
 * Token Blacklist Service
 * 
 * Manages token revocation and blacklisting for enhanced security.
 * Allows for immediate token invalidation when needed.
 */

const { db } = require('./firebase');

class TokenBlacklistService {
  constructor() {
    this.collection = 'blacklistedTokens';
    
    // Clean up expired blacklisted tokens periodically
    this.startCleanupInterval();
  }

  /**
   * Add a token to the blacklist
   * @param {string} jti - JWT ID (unique token identifier)
   * @param {Date} expiresAt - When the token naturally expires
   * @param {string} reason - Reason for blacklisting
   */
  async blacklistToken(jti, expiresAt, reason = 'revoked') {
    try {
      await db.collection(this.collection).doc(jti).set({
        jti,
        blacklistedAt: new Date(),
        expiresAt,
        reason
      });
      
      console.log(`Token ${jti} blacklisted: ${reason}`);
    } catch (error) {
      console.error('Error blacklisting token:', error);
      throw error;
    }
  }

  /**
   * Check if a token is blacklisted
   * @param {string} jti - JWT ID to check
   * @returns {Promise<boolean>} - True if token is blacklisted
   */
  async isTokenBlacklisted(jti) {
    try {
      const doc = await db.collection(this.collection).doc(jti).get();
      return doc.exists;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      // In case of error, allow the token (fail open for availability)
      return false;
    }
  }

  /**
   * Blacklist all tokens for a specific user (useful for logout all devices)
   * @param {string} uid - User ID
   * @param {string} reason - Reason for blacklisting
   */
  async blacklistAllUserTokens(uid, reason = 'logout_all') {
    try {
      // This would require storing token-to-user mappings
      // For now, we'll update the user's tokenVersion to invalidate all tokens
      await db.collection('users').doc(uid).update({
        tokenVersion: new Date().getTime(),
        lastTokenInvalidation: new Date()
      });
      
      console.log(`All tokens for user ${uid} invalidated: ${reason}`);
    } catch (error) {
      console.error('Error invalidating user tokens:', error);
      throw error;
    }
  }

  /**
   * Start periodic cleanup of expired blacklisted tokens
   */
  startCleanupInterval() {
    // Run cleanup every hour
    setInterval(async () => {
      try {
        const now = new Date();
        const expiredTokensQuery = db.collection(this.collection)
          .where('expiresAt', '<=', now);
        
        const snapshot = await expiredTokensQuery.get();
        
        if (!snapshot.empty) {
          const batch = db.batch();
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          
          await batch.commit();
          console.log(`Cleaned up ${snapshot.size} expired blacklisted tokens`);
        }
      } catch (error) {
        console.error('Error during token blacklist cleanup:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }
}

module.exports = new TokenBlacklistService();
