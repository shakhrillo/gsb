const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');
const { validateUser } = require('../middleware/validateUser');

router.post('/', validateUser, async (req, res) => {
  try {
    const orderData = req.body;
    const user = req.user;
    
    const orderRef = await db.collection('orders').add({
      ...orderData,
      driver: {
        uid: '-',
        email: '-',
        name: '-',
        phone: '-',
        car: {
          plate: '-',
          model: '-',
          color: '-',
        },
        currentLocation: {
          latitude: 0,
          longitude: 0
        },
        status: 'in-progress', // 'accepted', 'in-progress', 'completed', 'cancelled'
      },
      user: {
        uid: user.uid,
        email: user.email || '-',
        name: user.name || '-',
        phone: user.phone || '-',
      },
      delivery: {
        pickup: {
          address: user.delivery?.address || '-',
          city: user.delivery?.city || '-',
          province: user.delivery?.province || '-',
        },
        dropoff: {
          address: orderData.delivery?.address || '-',
          city: orderData.delivery?.city || '-',
          province: orderData.delivery?.province || '-',
        },
        fee: orderData.delivery?.fee || 0,
      },
      createdAt: new Date()
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