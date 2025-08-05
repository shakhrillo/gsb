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
      uid: user.uid,
      createdAt: new Date()
    });
    res.status(201).json({ id: orderRef.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', validateUser, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderSnap.data();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', validateUser, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderData = req.body;
    const orderRef = db.collection('orders').doc(orderId);

    await orderRef.update(orderData);
    res.json({ message: 'Order updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', validateUser, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderRef = db.collection('orders').doc(orderId);

    await orderRef.delete();
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', validateUser, async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get total count for pagination metadata
    const countQuery = db.collection('orders')
      .where('uid', '==', user.uid)
      .where('status', '==', 'paid');
    
    const countSnapshot = await countQuery.get();
    const totalItems = countSnapshot.size;
    
    if (totalItems === 0) {
      return res.status(404).json({ message: 'No orders found' });
    }
    
    // Get paginated orders
    const collectionOrder = db.collection('orders')
      .where('uid', '==', user.uid)
      .where('status', '==', 'paid')
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit);
    
    const snapshot = await collectionOrder.get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.json({
      orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;