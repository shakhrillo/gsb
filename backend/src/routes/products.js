const express = require('express');
const router = express.Router();
const { db, FieldValue } = require('../services/firebase');
const { validateUser } = require('../middleware/validateUser');
const { getProduct, getProductByMxikcode } = require('../services/findProduct');
const { findCategoryByCode } = require('../utils/category');

// find by barcode
router.get('/barcode/:barcode', async (req, res) => {
  const { barcode } = req.params;
  try {
    const product = await getProduct(barcode);
    res.status(200).json(product);
  } catch (err) {
    res.status(400).json({ error: 'Failed to find product' });
  }
});

router.get('/mxikcode/:mxikCode', async (req, res) => {
  const { mxikCode } = req.params;
  try {
    const product = await getProductByMxikcode(mxikCode);
    res.status(200).json(product);
  } catch (err) {
    res.status(400).json({ error: 'Failed to find product' });
  }
});

router.post('/', validateUser, async (req, res) => {
  try {
    const user = req.user;
    if (!user.merchantUid) {
      return res.status(403).json({ error: 'Only merchants can add products' });
    }

    const newProduct = req.body;
    const mxikCode = newProduct.mxikCode;
    const category = mxikCode ? mxikCode.slice(0, 3) : null;

    const batch = db.batch();
    const productRef = db.collection('products').doc(newProduct.barcode);
    batch.set(productRef, {
      ...newProduct,
      category,
      businessId: user.businessId,
      // merchantUid: user.merchantUid,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const userRef = db.collection('users').doc(user.merchantUid);
    batch.update(userRef, {
      productCount: FieldValue.increment(1)
    });

    const categoryRef = userRef.collection('categories').doc(category);
    batch.set(categoryRef, {
      ...findCategoryByCode(category),
      productCount: FieldValue.increment(1)
    }, { merge: true });

    await batch.commit();
    res.status(201).json({ id: productRef.id });
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
