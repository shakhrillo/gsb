const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');
const businessService = require('../services/business.service');
const userService = require('../services/user.service');
const { uploadImages } = require('../middleware/uploadImage');
const uploadFile = require('../services/uploadFile');

// Become a merchant (backward compatibility)
router.post('/', async (req, res) => {
  try {
    const uid = req.body.phone.replace(/\D/g, ''); // Normalize phone number
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    await db.collection('users').doc(uid).set({
      ...req.body,
      hasBusiness: true, // Updated field name
      isActive: false,
      createdAt: new Date(),
    }, { merge: true });

    res.status(201).json({ message: 'Successfully became a merchant' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get merchants (updated to work with new business structure)
router.get('/', async (req, res) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Parse filter parameters
    const status = req.query.status; // 'pending', 'active', 'all'
    const businessType = req.query.businessType;
    
    // Use the new business service for better results
    const filters = {};
    if (status && status !== 'all') {
      filters.status = status;
    }
    if (businessType) {
      filters.businessType = businessType;
    }

    const pagination = { page, limit };
    const result = await businessService.getAllBusinesses(filters, pagination);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    if (result.data.length === 0) {
      return res.status(404).json({ message: 'No merchants found' });
    }

    // Convert business data to merchant format for backward compatibility
    const merchants = await Promise.all(result.data.map(async (business) => {
      // Get user data for each business owner
      const userDoc = await db.collection('users').doc(business.ownerId).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      
      // Remove password if exists
      delete userData.password;
      
      return {
        ...userData,
        uid: business.ownerId,
        businessId: business.id,
        // Map business fields to legacy merchant fields
        businessName: business.businessName,
        businessType: business.businessType,
        businessLocation: business.businessLocation,
        innPinfl: business.innPinfl,
        bankAccount: business.bankAccount,
        mfoCode: business.mfoCode,
        businessLicenseUrl: business.businessLicenseUrl,
        directorPassportUrl: business.directorPassportUrl,
        businessLogoUrl: business.businessLogoUrl,
        merchantRequestStatus: business.status,
        merchantRequestDate: business.requestDate,
        isMerchant: business.status === 'active'
      };
    }));
    
    // Return paginated response
    res.json({
      merchants,
      pagination: result.pagination,
      filters: {
        status: status || 'all'
      }
    });
  } catch (err) {
    console.error('Get merchants error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fallback to old approach if no businesses found
async function getLegacyMerchants(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    
    // Build base query for old merchant structure
    let query = db.collection('users').where('isMerchant', '==', true);
    
    // Apply status filter
    if (status === 'pending') {
      query = query.where('merchantRequestStatus', '==', 'pending');
    } else if (status !== 'all') {
      query = query.where('merchantRequestStatus', '==', 'active');
    }

    // Apply business type filter if provided
    if (req.query.businessType) {
      query = query.where('businessType', '==', req.query.businessType);
    }
    
    // Get total count for pagination info
    const countSnapshot = await query.get();
    const totalItems = countSnapshot.size;
    const totalPages = Math.ceil(totalItems / limit);
    
    // Apply pagination
    query = query.limit(limit).offset(skip);
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.status(404).json({ message: 'No merchants found' });
    }

    const merchants = snapshot.docs.map(doc => {
      const data = doc.data();
      delete data.password;
      
      return {
        ...data,
        uid: doc.id,
      };
    });
    
    // Return paginated response
    res.json({
      merchants,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      filters: {
        status: status || 'all'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Approve merchant (updated for new business structure)
router.put('/:uid/approve', async (req, res) => {
  try {
    const uid = req.params.uid;
    const { businessId } = req.body; // Optional: specify which business to approve
    
    if (businessId) {
      // Approve specific business
      const result = await userService.updateBusinessStatus(businessId, 'active');
      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }
      return res.status(200).json({ message: 'Business approved successfully' });
    } else {
      // Legacy: approve user's merchant status (approve all pending businesses)
      const businesses = await userService.getUserBusinesses(uid, 'pending');
      if (!businesses.success) {
        return res.status(404).json({ error: 'User not found or no pending businesses' });
      }
      
      // Approve all pending businesses for this user
      const approvalPromises = businesses.data.map(business => 
        userService.updateBusinessStatus(business.id, 'active')
      );
      
      await Promise.all(approvalPromises);
      
      // Also update legacy fields for backward compatibility
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        await userRef.update({ 
          merchantRequestStatus: 'active',
          isMerchant: true,
          updatedAt: new Date()
        });
      }
      
      return res.status(200).json({ message: 'Merchant request approved successfully' });
    }
  } catch (err) {
    console.error('Approve merchant error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reject merchant (updated for new business structure)
router.put('/:uid/reject', async (req, res) => {
  try {
    const uid = req.params.uid;
    const { reason, businessId } = req.body;
    
    if (businessId) {
      // Reject specific business
      const result = await userService.updateBusinessStatus(businessId, 'rejected', reason);
      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }
      return res.status(200).json({ message: 'Business rejected successfully' });
    } else {
      // Legacy: reject user's merchant status (reject all pending businesses)
      const businesses = await userService.getUserBusinesses(uid, 'pending');
      if (!businesses.success) {
        return res.status(404).json({ error: 'User not found or no pending businesses' });
      }
      
      // Reject all pending businesses for this user
      const rejectionPromises = businesses.data.map(business => 
        userService.updateBusinessStatus(business.id, 'rejected', reason)
      );
      
      await Promise.all(rejectionPromises);
      
      // Also update legacy fields for backward compatibility
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        await userRef.update({ 
          merchantRequestStatus: 'rejected', 
          rejectionReason: reason,
          updatedAt: new Date()
        });
      }
      
      return res.status(200).json({ message: 'Merchant request rejected successfully' });
    }
  } catch (err) {
    console.error('Reject merchant error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get merchant by ID (updated for new business structure)
router.get('/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    
    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Merchant not found' });
    }
    
    const userData = userDoc.data();
    delete userData.password; // Remove sensitive information
    
    // Get user's businesses
    const businesses = await userService.getUserBusinesses(uid);
    
    if (businesses.success) {
      // Return user data with their businesses
      res.json({ 
        ...userData, 
        id: userDoc.id,
        uid: userDoc.id,
        businesses: businesses.data,
        // For backward compatibility, include first active business data in root
        ...(businesses.data.length > 0 && businesses.data.find(b => b.status === 'active') && {
          businessName: businesses.data.find(b => b.status === 'active').businessName,
          businessType: businesses.data.find(b => b.status === 'active').businessType,
          innPinfl: businesses.data.find(b => b.status === 'active').innPinfl,
          isMerchant: true,
          merchantRequestStatus: 'active'
        })
      });
    } else {
      // Fallback to legacy structure
      res.json({ ...userData, id: userDoc.id, uid: userDoc.id });
    }
  } catch (err) {
    console.error('Get merchant by ID error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:uid', uploadImages, async (req, res) => {
  try {
    const uid = req.params.uid;
    console.log('Updating merchant with UID:', req.files);
    const files = req.files || [];
    const {
      businessName,
      businessAddress,
      businessType,
      businessOwnerName,
      businessOwnerEmail,
      businessOwnerPhone
    } = req.body;

    // Get user document to check if merchant exists
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const userData = userDoc.data();
    const images = userData.images || [];

    // Handle file uploads if files are provided
    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const uniqueFileName = `${Date.now()}-${file.originalname}`;
        const uploadPath = `uploads/${userData.email || uid}/${uniqueFileName}`;
        
        try {
          const uploadedUrl = await uploadFile(file.buffer, uploadPath);
          return uploadedUrl;
        } catch (err) {
          console.error('File upload error:', err);
          throw new Error(`Failed to upload file: ${file.originalname}`);
        }
      });

      try {
        const uploadedUrls = await Promise.all(uploadPromises);
        images.push(...uploadedUrls);
      } catch (uploadError) {
        return res.status(500).json({ error: uploadError.message });
      }
    }

    // Update merchant data
    await userRef.update({
      ...(businessName && { businessName }),
      ...(businessAddress && { businessAddress }),
      ...(businessType && { businessType }),
      ...(businessOwnerName && { businessOwnerName }),
      ...(businessOwnerEmail && { businessOwnerEmail }),
      ...(businessOwnerPhone && { businessOwnerPhone }),
      images,
      updatedAt: new Date()
    });

    res.status(200).json({ 
      message: 'Merchant updated successfully'
    });
  } catch (err) {
    console.error('Error updating merchant:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Delete merchant document
    await userRef.delete();
    res.status(200).json({ message: 'Merchant deleted successfully' });
  } catch (err) {
    console.error('Error deleting merchant:', err);
    res.status(500).json({ error: err.message });
  }
});

// get categories for a merchant
router.get('/:uid/categories', async (req, res) => {
  try {
    const uid = req.params.uid;
    const snapshot = await db
      .collection('users')
      .doc(uid)
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

router.get('/:uid/products', async (req, res) => {
  try {
    const uid = req.params.uid;
    
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category || null;
    const skip = (page - 1) * limit;

    // Build query
    let query = db
      .collection('products')
      .where('merchantUid', '==', uid);
    query.orderBy('createdAt', 'desc');
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

module.exports = router;
