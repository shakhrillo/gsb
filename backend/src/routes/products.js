const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');
const { validateUser } = require('../middleware/validateUser');

router.post('/', validateUser, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.isMerchant) {
      return res.status(403).json({ error: 'Only merchants can add products' });
    }

    const newProduct = req.body;
    const docRef = await db
      .collection('products')
      .add({
        ...newProduct,
        merchantUid: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    
    res.status(201).json({ id: docRef.id });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', validateUser, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  
  try {
    const user = req.user;
    const productDoc = await db.collection('products').doc(id).get();
    
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const productData = productDoc.data();
    if (productData.merchantUid !== user.email) {
      return res.status(403).json({ error: 'You do not have permission to update this product' });
    }
    
    await db.collection('products').doc(id).update(updatedData);
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', validateUser, async (req, res) => {
  const { id } = req.params;
  try {
    const user = req.user;
    const productDoc = await db.collection('products').doc(id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const productData = productDoc.data();
    if (productData.merchantUid !== user.email) {
      return res.status(403).json({ error: 'You do not have permission to delete this product' });
    }
    await db.collection('products').doc(id).delete();
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
  
module.exports = router;
