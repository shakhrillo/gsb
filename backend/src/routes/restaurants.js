const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

// Write restaurant routes here

/**
 * @swagger
 * tags:
 *  - name: Restaurants
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
 * tags:
 *  - name: Restaurants 
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

/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}:
 *   get:
 *     summary: Get a restaurant by ID
 *     description: Retrieve a specific restaurant by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *     responses:
 *       200:
 *         description: A single restaurant object.
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: Unique identifier for the restaurant.
 *             name:
 *               type: string
 *               description: Name of the restaurant.
 *             address:
 *               type: string
 *               description: Address of the restaurant.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const restaurantDoc = await db.collection('restaurants').doc(id).get();
    if (!restaurantDoc.exists) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json({ id: restaurantDoc.id, ...restaurantDoc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
);
/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}:
 *   put:
 *     summary: Update a restaurant by ID
 *     description: Update the details of a specific restaurant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *       - in: body
 *         name: restaurant
 *         description: Restaurant object with updated details.
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
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const restaurantRef = db.collection('restaurants').doc(id);
    await restaurantRef.update({
      ...req.body,
      updatedAt: new Date()
    });
    res.status(200).json({ id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
);
/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}:
 *   delete:
 *     summary: Delete a restaurant by ID
 *     description: Remove a specific restaurant from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *     responses:
 *       204:
 *         description: Restaurant deleted successfully.
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection('restaurants').doc(id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
);

// Restaurant products
/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}/products:
 *   get:
 *     summary: Get products for a restaurant
 *     description: Retrieve all products associated with a specific restaurant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *     responses:
 *       200:
 *         description: A list of products for the restaurant.
 */
router.get('/:id/products', async (req, res) => {
  const { id } = req.params;
  try {
    const snapshot = await db.collection('restaurants').doc(id).collection('products').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}/products:
 *   post:
 *     summary: Add a product to a restaurant
 *     description: Create a new product and associate it with a specific restaurant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *       - in: body
 *         name: product
 *         description: Product object to be added.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: Name of the product.
 *             price:
 *               type: number
 *               description: Price of the product.
 */
router.post('/:id/products', async (req, res) => {
  const { id } = req.params;
  try {
    const productRef = await db.collection('restaurants').doc(id).collection('products').add({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.status(201).json({ id: productRef.id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}/products/{productId}:
 *   get:
 *     summary: Get a product by ID for a restaurant
 *     description: Retrieve a specific product by its ID from a restaurant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *       - in: path
 *         name: productId
 *         required: true
 *         type: string
 *         description: Unique identifier for the product.
 *     responses:
 *       200:
 *         description: A single product object.
 */
router.get('/:id/products/:productId', async (req, res) => {
  const { id, productId } = req.params;
  try {
    const productDoc = await db.collection('restaurants').doc(id).collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ id: productDoc.id, ...productDoc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}/products/{productId}:
 *   put:
 *     summary: Update a product by ID for a restaurant
 *     description: Update the details of a specific product for a restaurant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *       - in: path
 *         name: productId
 *         required: true
 *         type: string
 *         description: Unique identifier for the product.
 *       - in: body
 *         name: product
 *         description: Product object with updated details.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: Name of the product.
 *             price:
 *               type: number
 *               description: Price of the product.
 */
router.put('/:id/products/:productId', async (req, res) => {
  const { id, productId } = req.params;
  try {
    const productRef = db.collection('restaurants').doc(id).collection('products').doc(productId);
    await productRef.update({
      ...req.body,
      updatedAt: new Date()
    });
    res.status(200).json({ id: productId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}/products/{productId}:
 *   delete:
 *     summary: Delete a product by ID for a restaurant
 *     description: Remove a specific product from a restaurant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *       - in: path
 *         name: productId
 *         required: true
 *         type: string
 *         description: Unique identifier for the product.
 *     responses:
 *       204:
 *         description: Product deleted successfully.
 */
router.delete('/:id/products/:productId', async (req, res) => {
  const { id, productId } = req.params;
  try {
    await db.collection('restaurants').doc(id).collection('products').doc(productId).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tracking restaurant orders
/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}/orders:
 *   get:
 *     summary: Get orders for a restaurant
 *     description: Retrieve all orders associated with a specific restaurant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *     responses:
 *       200:
 *         description: A list of orders for the restaurant.
 */
router.get('/:id/orders', async (req, res) => {
  const { id } = req.params;
  try {
    const snapshot = await db.collection('restaurants').doc(id).collection('orders').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
);
/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}/orders:
 *   post:
 *     summary: Add an order to a restaurant
 *     description: Create a new order and associate it with a specific restaurant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *       - in: body
 *         name: order
 *         description: Order object to be added.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             customerName:
 *               type: string
 *               description: Name of the customer.
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   productId:
 *                     type: string
 *                     description: ID of the product ordered.
 *                   quantity:
 *                     type: integer
 *                     description: Quantity of the product ordered.
 */
router.post('/:id/orders', async (req, res) => {
  const { id } = req.params;
  try {
    const orderRef = await db.collection('restaurants').doc(id).collection('orders').add({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.status(201).json({ id: orderRef.id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
);
/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}/orders/{orderId}:
 *   get:
 *     summary: Get an order by ID for a restaurant
 *     description: Retrieve a specific order by its ID from a restaurant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *       - in: path
 *         name: orderId
 *         required: true
 *         type: string
 *         description: Unique identifier for the order.
 *     responses:
 *       200:
 *         description: A single order object.
 */
router.get('/:id/orders/:orderId', async (req, res) => {
  const { id, orderId } = req.params;
  try {
    const orderDoc = await db.collection('restaurants').doc(id).collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ id: orderDoc.id, ...orderDoc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
);
/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}/orders/{orderId}:
 *   put:
 *     summary: Update an order by ID for a restaurant
 *     description: Update the details of a specific order for a restaurant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *       - in: path
 *         name: orderId
 *         required: true
 *         type: string
 *         description: Unique identifier for the order.
 *       - in: body
 *         name: order
 *         description: Order object with updated details.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             customerName:
 *               type: string
 *               description: Name of the customer.
 */
router.put('/:id/orders/:orderId', async (req, res) => {
  const { id, orderId } = req.params;
  try {
    const orderRef = db.collection('restaurants').doc(id).collection('orders').doc(orderId);
    await orderRef.update({
      ...req.body,
      updatedAt: new Date()
    });
    res.status(200).json({ id: orderId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
);
/**
 * @swagger
 * tags:
 *  - name: Restaurants 
 * /api/restaurants/{id}/orders/{orderId}:
 *   delete:
 *     summary: Delete an order by ID for a restaurant
 *     description: Remove a specific order from a restaurant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier for the restaurant.
 *       - in: path
 *         name: orderId
 *         required: true
 *         type: string
 *         description: Unique identifier for the order.
 *     responses:
 *       204:
 *         description: Order deleted successfully.
 */
router.delete('/:id/orders/:orderId', async (req, res) => {
  const { id, orderId } = req.params;
  try {
    await db.collection('restaurants').doc(id).collection('orders').doc(orderId).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
);

module.exports = router;