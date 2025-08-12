/**
 * Business Service
 * 
 * Handles business management operations including registration,
 * approval, and business queries.
 */

const { db } = require('./firebase');

class BusinessService {
  /**
   * Get all businesses with filtering and pagination
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{success: boolean, data?: any, pagination?: any, error?: string}>}
   */
  async getAllBusinesses(filters = {}, pagination = {}) {
    try {
      const { status, businessType, ownerId } = filters;
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      let query = db.collection('businesses');

      // Apply filters
      if (status) {
        query = query.where('status', '==', status);
      }
      if (businessType) {
        query = query.where('businessType', '==', businessType);
      }
      if (ownerId) {
        query = query.where('ownerId', '==', ownerId);
      }

      // Get total count for pagination
      const countSnapshot = await query.get();
      const totalItems = countSnapshot.size;
      const totalPages = Math.ceil(totalItems / limit);

      // Apply pagination and ordering
      query = query.orderBy('createdAt', 'desc').limit(limit).offset(skip);
      const snapshot = await query.get();

      if (snapshot.empty) {
        return { 
          success: true, 
          data: [], 
          pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        };
      }

      const businesses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { 
        success: true, 
        data: businesses,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      console.error('Get all businesses error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get business by ID
   * @param {string} businessId - Business ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async getBusinessById(businessId) {
    try {
      const businessRef = db.collection('businesses').doc(businessId);
      const businessDoc = await businessRef.get();

      if (!businessDoc.exists) {
        return { success: false, error: 'Business not found' };
      }

      return { 
        success: true, 
        data: { 
          id: businessDoc.id, 
          ...businessDoc.data() 
        } 
      };
    } catch (error) {
      console.error('Get business by ID error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Update business information
   * @param {string} businessId - Business ID
   * @param {Object} updates - Fields to update
   * @param {string} ownerId - Owner ID (for authorization)
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async updateBusiness(businessId, updates, ownerId) {
    try {
      const businessRef = db.collection('businesses').doc(businessId);
      const businessDoc = await businessRef.get();

      if (!businessDoc.exists) {
        return { success: false, error: 'Business not found' };
      }

      const businessData = businessDoc.data();

      // Check if user owns this business
      if (businessData.ownerId !== ownerId) {
        return { success: false, error: 'Unauthorized: You can only update your own businesses' };
      }

      // Prevent updating protected fields
      const protectedFields = ['businessId', 'ownerId', 'status', 'createdAt', 'innPinfl'];
      const filteredUpdates = Object.keys(updates)
        .filter(key => !protectedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      if (Object.keys(filteredUpdates).length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }

      filteredUpdates.updatedAt = new Date();

      await businessRef.update(filteredUpdates);

      // Fetch updated business data
      const updatedBusinessDoc = await businessRef.get();
      
      return { 
        success: true, 
        data: { 
          id: updatedBusinessDoc.id, 
          ...updatedBusinessDoc.data() 
        } 
      };
    } catch (error) {
      console.error('Update business error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Delete/deactivate business
   * @param {string} businessId - Business ID
   * @param {string} ownerId - Owner ID (for authorization)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteBusiness(businessId, ownerId) {
    try {
      const businessRef = db.collection('businesses').doc(businessId);
      const businessDoc = await businessRef.get();

      if (!businessDoc.exists) {
        return { success: false, error: 'Business not found' };
      }

      const businessData = businessDoc.data();

      // Check if user owns this business
      if (businessData.ownerId !== ownerId) {
        return { success: false, error: 'Unauthorized: You can only delete your own businesses' };
      }

      // Instead of deleting, mark as inactive
      await businessRef.update({
        status: 'inactive',
        deactivatedAt: new Date(),
        updatedAt: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Delete business error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get businesses by owner with enhanced data
   * @param {string} ownerId - Owner ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async getBusinessesByOwner(ownerId) {
    try {
      const snapshot = await db.collection('businesses')
        .where('ownerId', '==', ownerId)
        .orderBy('createdAt', 'desc')
        .get();

      if (snapshot.empty) {
        return { success: true, data: [] };
      }

      const businesses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate statistics
      const stats = {
        total: businesses.length,
        active: businesses.filter(b => b.status === 'active').length,
        pending: businesses.filter(b => b.status === 'pending').length,
        rejected: businesses.filter(b => b.status === 'rejected').length,
        inactive: businesses.filter(b => b.status === 'inactive').length
      };

      return { 
        success: true, 
        data: businesses,
        stats 
      };
    } catch (error) {
      console.error('Get businesses by owner error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }
}

// Create singleton instance
const businessService = new BusinessService();

module.exports = businessService;
