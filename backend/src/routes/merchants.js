const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

router.get('/', async (req, res) => {
  try {
    let collectionProducts = await db.collection('users');
    collectionProducts = collectionProducts.where('type', '==', 'merchant');
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
  
module.exports = router;
