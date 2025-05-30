const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

// Write restaurant routes here

/**
 * @swagger
 * /api/restaurants/:
 *   get:
 *     summary: Get all restaurants
 *     description: Retrieve a list of all restaurants from the database.
 *     responses:
 *       200:
 *         description: A list of restaurants.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique identifier for the restaurant.
 *               name:
 *                 type: string
 *                 description: Name of the restaurant.
 *               address:
 *                 type: string
 *                 description: Address of the restaurant.
 */
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('restaurants').get();
    const restaurants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
);

/**
 * @swagger
 * /api/restaurants/:
 *   post:
 *     summary: Add a new restaurant
 *     description: Create a new restaurant and add it to the database.
 *     parameters:
 *       - in: body
 *         name: restaurant
 *         description: Restaurant object to be added.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: Name of the restaurant.
 *             address:
 *               type: string
 *               description: Address of the restaurant.
 */
router.post('/', async (req, res) => {
  try {
    // const { name, address } = req.body;
    // if (!name || !address) {
    //   return res.status(400).json({ error: 'Name and address are required' });
    // }
    const restaurantRef = await db.collection('restaurants').add({
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    res.status(201).json(
        { id: restaurantRef.id, ...req.body }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
);

module.exports = router;