const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

// Become a merchant
router.post('/', async (req, res) => {
  try {
    const uid = req.body.phone.replace(/\D/g, '');
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
    let collectionProducts = await db.collection('users');
    collectionProducts = collectionProducts.where('isMerchant', '==', true);
    const snapshot = await collectionProducts.get();
    
    if (snapshot.empty) {
      return res.status(404).json({ message: 'No products found' });
    }

    const products = snapshot.docs.map(doc => {
      const data = doc.data();
      delete data.password;
      
      return {
        ...data,
        id: doc.id,
      };
    });
    res.json(products);
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
      return res.status(404).json({ message: 'No categories found' });
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
    const skip = (page - 1) * limit;

    // Build query
    let query = db
      .collection('products')
      .where('merchantUid', '==', uid)
      .orderBy('createdAt', 'desc');

    // Get total count for pagination info
    const countSnapshot = await query.get();
    const totalItems = countSnapshot.size;
    const totalPages = Math.ceil(totalItems / limit);

    // Apply pagination
    query = query.limit(limit).offset(skip);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No products found' });
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
//   secret: string;
//   merchantUid: string;
//   isActive: boolean;
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
    const { phone, name, role, secret } = req.body;

    if (!phone || !name || !role || !secret) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const staffMember = {
      phone,
      name,
      role,
      secret,
      merchantUid: uid,
      isActive: true,
      createdAt: new Date(),
    };

    const docRef = await db.collection('staff').add(staffMember);
    res.status(201).json({ id: docRef.id, ...staffMember });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get staff members for a merchant
router.get('/:uid/staff', async (req, res) => {
  try {
    const uid = req.params.uid;
    const snapshot = await db
      .collection('staff')
      .where('merchantUid', '==', uid)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No staff members found' });
    }

    const staffMembers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
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
    const { phone, name, role, secret } = req.body;

    const staffRef = db.collection('staff').doc(staffId);
    const staffDoc = await staffRef.get();

    if (!staffDoc.exists || staffDoc.data().merchantUid !== uid) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const updatedData = {
      phone,
      name,
      role,
      secret,
      updatedAt: new Date(),
    };

    await staffRef.update(updatedData);
    res.json({ id: staffId, ...updatedData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete staff member
router.delete('/:uid/staff/:staffId', async (req, res) => {
  try {
    const { uid, staffId } = req.params;

    const staffRef = db.collection('staff').doc(staffId);
    const staffDoc = await staffRef.get();

    if (!staffDoc.exists || staffDoc.data().merchantUid !== uid) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    await staffRef.delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
