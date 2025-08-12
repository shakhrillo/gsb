const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const businessService = require('../services/business.service');
const staffService = require('../services/staff.service');
const { validateUser } = require('../middleware/validateUser');
const { uploadImages } = require('../middleware/uploadImage');
const { db } = require('../services/firebase');

/**
 * POST /api/businesses
 * Register a new business
 */
router.post('/', validateUser, async (req, res) => {
  try {
    const uid = req.user.uid;
    const businessData = req.body;

    const result = await userService.registerBusiness(uid, businessData);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ 
      message: 'Business registration request submitted successfully',
      businessId: result.businessId 
    });
  } catch (error) {
    console.error('Business registration route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses
 * Get all businesses (admin) or user's businesses
 */
router.get('/', async (req, res) => {
  try {
    const { status, businessType, page, limit, ownerId } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (businessType) filters.businessType = businessType;
    if (ownerId) filters.ownerId = ownerId;

    const pagination = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    };

    const result = await businessService.getAllBusinesses(filters, pagination);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      businesses: result.data,
      pagination: result.pagination,
      filters
    });
  } catch (error) {
    console.error('Get businesses route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses/my
 * Get current user's businesses
 */
router.get('/my', validateUser, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { status } = req.query;

    const result = await businessService.getBusinessesByOwner(uid);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Filter by status if provided
    let businesses = result.data;
    if (status) {
      businesses = businesses.filter(business => business.status === status);
    }

    res.json({
      businesses,
      stats: result.stats
    });
  } catch (error) {
    console.error('Get my businesses route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses/:businessId
 * Get business by ID
 */
router.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    const result = await businessService.getBusinessById(businessId);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Get business by ID route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/businesses/:businessId
 * Update business information (owner only)
 */
router.put('/:businessId', validateUser, uploadImages, async (req, res) => {
  try {
    const { businessId } = req.params;
    const uid = req.user.uid;
    const updates = req.body;

    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      // Add logic to handle file uploads and update URLs
      // This would integrate with your existing upload logic
    }

    const result = await businessService.updateBusiness(businessId, updates, uid);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.json({
      message: 'Business updated successfully',
      business: result.data
    });
  } catch (error) {
    console.error('Update business route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/businesses/:businessId
 * Delete/deactivate business (owner only)
 */
router.delete('/:businessId', validateUser, async (req, res) => {
  try {
    const { businessId } = req.params;
    const uid = req.user.uid;

    const result = await businessService.deleteBusiness(businessId, uid);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.json({ message: 'Business deactivated successfully' });
  } catch (error) {
    console.error('Delete business route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/businesses/:businessId/approve
 * Approve business registration (admin only)
 */
router.put('/:businessId/approve', async (req, res) => {
  try {
    const { businessId } = req.params;

    const result = await userService.updateBusinessStatus(businessId, 'active');

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({ message: 'Business approved successfully' });
  } catch (error) {
    console.error('Approve business route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/businesses/:businessId/reject
 * Reject business registration (admin only)
 */
router.put('/:businessId/reject', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { reason } = req.body;

    const result = await userService.updateBusinessStatus(businessId, 'rejected', reason);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({ message: 'Business rejected successfully' });
  } catch (error) {
    console.error('Reject business route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses/:businessId/products
 * Get products for a specific business
 */
router.get('/:businessId/products', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category || null;
    const skip = (page - 1) * limit;

    // Build query
    let query = db
      .collection('products')
      .where('businessId', '==', businessId);
    query = query.orderBy('createdAt', 'desc');
    if (category) {
      query = query.where('category', '==', category);
    }

    // Get total count for pagination info
    const countSnapshot = await query.get();
    const totalItems = countSnapshot.size;
    const totalPages = Math.ceil(totalItems / limit);

    // Apply pagination
    query = query.limit(limit).offset(skip);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.json({
        products: [],
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPreviousPage: page > 1
        }
      });
    }

    const products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    
    // Return paginated response
    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/businesses/:businessId/categories
 * Get categories for a specific business
 */
router.get('/:businessId/categories', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const snapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('categories')
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const categories = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/businesses/:businessId/staff
 * Add staff member to a business
 */
router.post('/:businessId/staff', validateUser, async (req, res) => {
  try {
    const { businessId } = req.params;
    const uid = req.user.uid;
    const staffData = req.body;

    const result = await staffService.addStaffMember(businessId, uid, staffData);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.status(201).json({
      message: 'Staff member added successfully',
      staff: result.data
    });
  } catch (error) {
    console.error('Add staff member route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses/:businessId/staff
 * Get staff members for a business
 */
router.get('/:businessId/staff', validateUser, async (req, res) => {
  try {
    const { businessId } = req.params;
    const uid = req.user.uid;

    const result = await staffService.getStaffMembers(businessId, uid);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.json({
      staffMembers: result.data,
      count: result.data.length
    });
  } catch (error) {
    console.error('Get staff members route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/businesses/:businessId/staff/:staffId
 * Update staff member
 */
router.put('/:businessId/staff/:staffId', validateUser, async (req, res) => {
  try {
    const { businessId, staffId } = req.params;
    const uid = req.user.uid;
    const updates = req.body;

    const result = await staffService.updateStaffMember(businessId, staffId, uid, updates);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.json({
      message: 'Staff member updated successfully',
      staff: result.data
    });
  } catch (error) {
    console.error('Update staff member route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/businesses/:businessId/staff/:staffId
 * Remove staff member from business
 */
router.delete('/:businessId/staff/:staffId', validateUser, async (req, res) => {
  try {
    const { businessId, staffId } = req.params;
    const uid = req.user.uid;

    const result = await staffService.removeStaffMember(businessId, staffId, uid);

    if (!result.success) {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    res.json({ message: 'Staff member removed successfully' });
  } catch (error) {
    console.error('Remove staff member route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/businesses/staff/all
 * Get all staff members across businesses (admin endpoint)
 */
router.get('/staff/all', async (req, res) => {
  try {
    const { businessId, role, isActive, page, limit } = req.query;
    
    const filters = {};
    if (businessId) filters.businessId = businessId;
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const pagination = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    };

    const result = await staffService.getAllStaffMembers(filters, pagination);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      staffMembers: result.data,
      pagination: result.pagination,
      filters
    });
  } catch (error) {
    console.error('Get all staff members route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
