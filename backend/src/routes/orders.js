const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');
const { validateUser } = require('../middleware/validateUser');

router.post('/', validateUser, async (req, res) => {
  try {
    const orderData = req.body;
    const user = req.user;
    
    if (!orderData.merchantUid) {
      return res.status(400).json({ error: 'Merchant UID is required' });
    }
    const orderRef = await db.collection('orders').add({
      ...orderData,
      timestamp: new Date(),
      customerUid: user.email
    });
    res.status(201).json({ id: orderRef.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', validateUser, async (req, res) => {
  try {
    const user = req.user;
    const type = user.type;
    const collectionOrder = await db.collection('orders');
    if (type === 'merchant') {
      collectionOrder.where('merchantUid', '==', user.email);
    } else if (type === 'customer') {
      collectionOrder.where('customerUid', '==', user.email);
    }
    const snapshot = await collectionOrder.get();
    if (snapshot.empty) {
      return res.status(404).json({ message: 'No orders found' });
    }
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
    
    // if (type === 'merchant') {
    //   const merchantUid = user.merchantUid;
    //   snapshot = snapshot.docs.filter(doc => doc.data().merchantUid === merchantUid);
    // } else if (type === 'customer') {
    //   const customerUid = user.customerUid;
    //   snapshot = snapshot.docs.filter(doc => doc.data().customerUid === customerUid);
    // }
    // const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;