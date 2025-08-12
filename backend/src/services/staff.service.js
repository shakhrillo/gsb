/**
 * Staff Service
 * 
 * Handles staff management operations for businesses including
 * adding, updating, removing staff members and managing their roles.
 */

const { db } = require('./firebase');

class StaffService {
  /**
   * Add staff member to a business
   * @param {string} businessId - Business ID
   * @param {string} ownerId - Business owner ID (for authorization)
   * @param {Object} staffData - Staff member data
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async addStaffMember(businessId, ownerId, staffData) {
    try {
      const { phone, name, role } = staffData;

      if (!phone || !name || !role) {
        return { success: false, error: 'Missing required fields: phone, name, role' };
      }

      // Validate role
      const validRoles = ['seller', 'manager', 'cashier', 'cook', 'delivery'];
      if (!validRoles.includes(role)) {
        return { success: false, error: 'Invalid role. Valid roles: ' + validRoles.join(', ') };
      }

      // Verify business exists and user owns it
      const businessRef = db.collection('businesses').doc(businessId);
      const businessDoc = await businessRef.get();

      if (!businessDoc.exists) {
        return { success: false, error: 'Business not found' };
      }

      const businessData = businessDoc.data();
      if (businessData.ownerId !== ownerId) {
        return { success: false, error: 'Unauthorized: You can only add staff to your own businesses' };
      }

      if (businessData.status !== 'active') {
        return { success: false, error: 'Can only add staff to active businesses' };
      }

      // Normalize phone number for UID
      const staffUid = phone.replace(/\D/g, '');
      
      // Check if user already exists
      const existingUser = await db.collection('users').doc(staffUid).get();
      
      if (existingUser.exists) {
        // Update existing user to become staff
        const userData = existingUser.data();
        
        // Check if user is already staff for this business
        if (userData.isStaff && userData.businessId === businessId) {
          return { success: false, error: 'User is already staff for this business' };
        }

        // Check if user is already staff for another business
        if (userData.isStaff && userData.businessId && userData.businessId !== businessId) {
          return { success: false, error: 'User is already staff for another business' };
        }

        const updatedStaffData = {
          name: name || userData.name,
          role,
          businessId,
          businessName: businessData.businessName,
          ownerId,
          isStaff: true,
          isActive: true,
          // Keep legacy field for backward compatibility
          merchantUid: ownerId,
          updatedAt: new Date(),
        };

        await db.collection('users').doc(staffUid).update(updatedStaffData);
        
        const responseData = { ...userData, ...updatedStaffData };
        return { success: true, data: { uid: staffUid, ...responseData } };
      } else {
        // Create new user as staff
        const staffMember = {
          phone,
          name,
          role,
          businessId,
          businessName: businessData.businessName,
          ownerId,
          isStaff: true,
          isActive: true,
          isMerchant: false,
          // Keep legacy field for backward compatibility
          merchantUid: ownerId,
          createdAt: new Date(),
        };

        await db.collection('users').doc(staffUid).set(staffMember);
        return { success: true, data: { uid: staffUid, ...staffMember } };
      }
    } catch (error) {
      console.error('Add staff member error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get staff members for a business
   * @param {string} businessId - Business ID
   * @param {string} ownerId - Business owner ID (for authorization)
   * @returns {Promise<{success: boolean, data?: any[], error?: string}>}
   */
  async getStaffMembers(businessId, ownerId) {
    try {
      // Verify business exists and user owns it
      const businessRef = db.collection('businesses').doc(businessId);
      const businessDoc = await businessRef.get();

      if (!businessDoc.exists) {
        return { success: false, error: 'Business not found' };
      }

      const businessData = businessDoc.data();
      if (businessData.ownerId !== ownerId) {
        return { success: false, error: 'Unauthorized: You can only view staff of your own businesses' };
      }

      console.log('Fetching staff members for business:', businessId);

      const snapshot = await db.collection('users')
        .where('businessId', '==', businessId)
        .where('isStaff', '==', true)
        .get();

      if (snapshot.empty) {
        return { success: true, data: [] };
      }

      const staffMembers = snapshot.docs.map(doc => {
        const data = doc.data();
        // Remove sensitive information
        delete data.password;
        return {
          ...data,
          uid: doc.id,
        };
      });

      console.log('Found %d staff members for business %s', staffMembers.length, businessId);

      return { success: true, data: staffMembers };
    } catch (error) {
      console.error('Get staff members error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Update staff member
   * @param {string} businessId - Business ID
   * @param {string} staffId - Staff member ID
   * @param {string} ownerId - Business owner ID (for authorization)
   * @param {Object} updates - Fields to update
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async updateStaffMember(businessId, staffId, ownerId, updates) {
    try {
      // Verify business exists and user owns it
      const businessRef = db.collection('businesses').doc(businessId);
      const businessDoc = await businessRef.get();

      if (!businessDoc.exists) {
        return { success: false, error: 'Business not found' };
      }

      const businessData = businessDoc.data();
      if (businessData.ownerId !== ownerId) {
        return { success: false, error: 'Unauthorized: You can only update staff of your own businesses' };
      }

      const staffRef = db.collection('users').doc(staffId);
      const staffDoc = await staffRef.get();

      if (!staffDoc.exists) {
        return { success: false, error: 'Staff member not found' };
      }

      const staffData = staffDoc.data();
      if (staffData.businessId !== businessId || !staffData.isStaff) {
        return { success: false, error: 'Staff member not found in this business' };
      }

      // Validate role if provided
      if (updates.role) {
        const validRoles = ['seller', 'manager', 'cashier', 'cook', 'delivery'];
        if (!validRoles.includes(updates.role)) {
          return { success: false, error: 'Invalid role. Valid roles: ' + validRoles.join(', ') };
        }
      }

      // Filter allowed updates
      const allowedFields = ['name', 'role', 'isActive', 'phone'];
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      if (Object.keys(filteredUpdates).length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }

      filteredUpdates.updatedAt = new Date();

      await staffRef.update(filteredUpdates);
      
      // Get updated staff member data
      const updatedStaff = await staffRef.get();
      const responseData = updatedStaff.data();
      delete responseData.password;
      
      return { success: true, data: { uid: staffId, ...responseData } };
    } catch (error) {
      console.error('Update staff member error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Remove staff member
   * @param {string} businessId - Business ID
   * @param {string} staffId - Staff member ID
   * @param {string} ownerId - Business owner ID (for authorization)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async removeStaffMember(businessId, staffId, ownerId) {
    try {
      // Verify business exists and user owns it
      const businessRef = db.collection('businesses').doc(businessId);
      const businessDoc = await businessRef.get();

      if (!businessDoc.exists) {
        return { success: false, error: 'Business not found' };
      }

      const businessData = businessDoc.data();
      if (businessData.ownerId !== ownerId) {
        return { success: false, error: 'Unauthorized: You can only remove staff from your own businesses' };
      }

      const staffRef = db.collection('users').doc(staffId);
      const staffDoc = await staffRef.get();

      if (!staffDoc.exists) {
        return { success: false, error: 'Staff member not found' };
      }

      const staffData = staffDoc.data();
      if (staffData.businessId !== businessId || !staffData.isStaff) {
        return { success: false, error: 'Staff member not found in this business' };
      }

      // Instead of deleting, update the user to remove staff status
      await staffRef.update({
        isStaff: false,
        isActive: false,
        businessId: null,
        businessName: null,
        role: null,
        // Keep legacy field for backward compatibility
        merchantUid: null,
        updatedAt: new Date(),
        removedAt: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Remove staff member error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get all staff members across businesses (admin function)
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{success: boolean, data?: any[], pagination?: any, error?: string}>}
   */
  async getAllStaffMembers(filters = {}, pagination = {}) {
    try {
      const { businessId, role, isActive } = filters;
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      let query = db.collection('users').where('isStaff', '==', true);

      // Apply filters
      if (businessId) {
        query = query.where('businessId', '==', businessId);
      }
      if (role) {
        query = query.where('role', '==', role);
      }
      if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive);
      }

      // Get total count for pagination
      const countSnapshot = await query.get();
      const totalItems = countSnapshot.size;
      const totalPages = Math.ceil(totalItems / limit);

      // Apply pagination
      query = query.orderBy('createdAt', 'desc').limit(limit).offset(skip);
      const snapshot = await query.get();

      const staffMembers = snapshot.docs.map(doc => {
        const data = doc.data();
        delete data.password;
        return {
          ...data,
          uid: doc.id,
        };
      });

      return {
        success: true,
        data: staffMembers,
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
      console.error('Get all staff members error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }
}

// Create singleton instance
const staffService = new StaffService();

module.exports = staffService;
