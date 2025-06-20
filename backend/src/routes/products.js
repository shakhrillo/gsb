const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');
const validateUser = require('../middleware/validateUser');

router.get('/', validateUser, async (req, res) => {
  try {
    const snapshot = await db.collection('products').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', validateUser, async (req, res) => {
  try {
    const user = req.user;
    const newProduct = req.body;
    const docRef = await db.collection('products').add({
      ...newProduct,
      merchantId: user.email
    });
    res.status(201).json({ id: docRef.id });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', validateUser, async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection('products').doc(id).delete();
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
  
module.exports = router;
