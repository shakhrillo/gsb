const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

/**
 * @swagger
 * tags:
 *   - name: null
 * /orders:
 *   post:
 *     summary: Place a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product being ordered
 *               quantity:
 *                 type: integer
 *                 description: Quantity of the product
 *               userId:
 *                 type: string
 *                 description: ID of the user placing the order
 *     responses:
 *       201:
 *         description: Order placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID of the created order
 *       400:
 *         description: Bad request
 */
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;
    const orderRef = await db.collection('orders').add(orderData);
    res.status(201).json({ id: orderRef.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID of the order
 *                   productId:
 *                     type: string
 *                     description: ID of the product
 *                   quantity:
 *                     type: integer
 *                     description: Quantity of the product
 *                   userId:
 *                     type: string
 *                     description: ID of the user who placed the order
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('orders').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;