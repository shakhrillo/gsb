const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

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

router.get('/:uid/products', async (req, res) => {
  try {
    const uid = req.params.uid;
    const snapshot = await db
      .collection('products')
      .where('merchantUid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();


    if (snapshot.empty) {
      return res.status(404).json({ message: 'No products found' });
    }
    const products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    res.json(products);
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
  
module.exports = router;
