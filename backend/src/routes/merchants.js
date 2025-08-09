const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');
const { uploadImages } = require('../middleware/uploadImage');
const uploadFile = require('../services/uploadFile');

// Become a merchant
router.post('/', async (req, res) => {
  try {
    const uid = req.body.phone.replace(/\D/g, ''); // Normalize phone number
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    await db.collection('users').doc(uid).set({
      ...req.body,
      isMerchant: true,
      isActive: false,
      createdAt: new Date(),
    }, { merge: true });

    res.status(201).json({ message: 'Successfully became a merchant' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Parse filter parameters
    const status = req.query.status; // 'pending', 'active', 'all'
    
    // Build base query
    let query = db.collection('users').where('isMerchant', '==', true);
    
    // Apply status filter
    if (status === 'pending') {
      query = query.where('merchantRequestStatus', '==', 'pending');
    } else {
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
});

router.put('/:uid/approve', async (req, res) => {
  try {
    const uid = req.params.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update merchant request status
    await userRef.update({ merchantRequestStatus: 'active' });

    res.status(200).json({ message: 'Merchant request approved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:uid/reject', async (req, res) => {
  try {
    const uid = req.params.uid;
    const reason = req.body.reason;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Update merchant request status
    await userRef.update({ merchantRequestStatus: 'rejected', rejectionReason: reason });

    res.status(200).json({ message: 'Merchant request rejected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Merchant not found' });
    }
    const data = doc.data();
    delete data.password; // Remove sensitive information
    res.json({ ...data, id: doc.id });
  } catch (err) {
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

// IStaffMember {
//   id: string;
//   phone: string;
//   name: string;
//   role: 'seller' | 'manager';
//   merchantUid: string;
//   isActive: boolean;
//   isStaff: boolean;
//   createdAt: {
//     _seconds: number;
//     _nanoseconds: number;
//   };
//   lastLogin?: {
//     _seconds: number;
//     _nanoseconds: number;
//   };
// }

// Add staff member
router.post('/:uid/staff', async (req, res) => {
  try {
    const uid = req.params.uid;
    const { phone, name, role } = req.body;

    if (!phone || !name || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Normalize phone number for UID
    const staffUid = phone.replace(/\D/g, '');
    
    // Verify merchant exists
    const merchantDoc = await db.collection('users').doc(uid).get();
    if (!merchantDoc.exists || !merchantDoc.data().isMerchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').doc(staffUid).get();
    
    if (existingUser.exists) {
      // Update existing user to become staff
      const userData = existingUser.data();
      
      // Check if user is already staff for another merchant
      if (userData.isStaff && userData.merchantUid !== uid) {
        return res.status(400).json({ message: 'User is already staff for another merchant' });
      }

      const updatedStaffData = {
        name: name || userData.name,
        role,
        merchantUid: uid,
        isStaff: true,
        isActive: true,
        updatedAt: new Date(),
      };

      await db.collection('users').doc(staffUid).update(updatedStaffData);
      
      const responseData = { ...userData, ...updatedStaffData };
      res.status(200).json({ uid: staffUid, ...responseData });
    } else {
      // Create new user as staff
      const staffMember = {
        phone,
        name,
        role,
        merchantUid: uid,
        isStaff: true,
        isActive: true,
        isMerchant: false,
        createdAt: new Date(),
      };

      await db.collection('users').doc(staffUid).set(staffMember);
      res.status(201).json({ uid: staffUid, ...staffMember });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get staff members for a merchant
router.get('/:uid/staff', async (req, res) => {
  try {
    const uid = req.params.uid;
    const snapshot = await db
      .collection('users')
      .where('merchantUid', '==', uid)
      .where('isStaff', '==', true)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No staff members found' });
    }

    const staffMembers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        uid: doc.id,
      };
    });
    res.json(staffMembers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit staff member
router.put('/:uid/staff/:staffId', async (req, res) => {
  try {
    const { uid, staffId } = req.params;
    const { phone, name, role } = req.body;

    const staffRef = db.collection('users').doc(staffId);
    const staffDoc = await staffRef.get();

    if (!staffDoc.exists || staffDoc.data().merchantUid !== uid || !staffDoc.data().isStaff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const updatedData = {
      ...(phone && { phone }),
      ...(name && { name }),
      ...(role && { role }),
      updatedAt: new Date(),
    };

    await staffRef.update(updatedData);
    
    // Get updated staff member data
    const updatedStaff = await staffRef.get();
    const responseData = updatedStaff.data();
    
    res.json({ uid: staffId, ...responseData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete staff member
router.delete('/:uid/staff/:staffId', async (req, res) => {
  try {
    const { uid, staffId } = req.params;

    const staffRef = db.collection('users').doc(staffId);
    const staffDoc = await staffRef.get();

    if (!staffDoc.exists || staffDoc.data().merchantUid !== uid || !staffDoc.data().isStaff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    await staffRef.delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
