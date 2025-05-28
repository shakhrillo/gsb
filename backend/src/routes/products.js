const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');
const validateUser = require('../middleware/validateUser');

/**
 * @swagger
 * /api/products/:
 *   get:
 *     summary: Get all products
 *     description: Retrieve a list of all products from the database.
 *     responses:
 *       200:
 *         description: A list of products.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique identifier for the product.
 *               name:
 *                 type: string
 *                 description: Name of the product.
 *               description:
 *                 type: string
 *                 description: Description of the product.
 *               price:
 *                 type: number
 *                 description: Price of the product.
 *               image:
 *                 type: string
 *                 description: URL of the product image.
 *               category:
 *                 type: string
 *                 description: Category of the product.
 *       500:
 *         description: Internal server error.
 */
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('products').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * tags:
 *   - name: Products
 * /api/products/:
 *   post:
 *     summary: Add a new product
 *     description: Create a new product and add it to the database.
 *     parameters:
 *       - in: body
 *         name: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: Name of the product.
 *             description:
 *               type: string
 *               description: Description of the product.
 *             price:
 *               type: number
 *               description: Price of the product.
 *             image:
 *               type: string
 *               description: URL of the product image.
 *             category:
 *               type: string
 *               description: Category of the product.
 *     responses:
 *       201:
 *         description: Product created successfully.
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: Unique identifier for the created product.
 *       400:
 *         description: Bad request. Invalid input data.
 *       500:
 *         description: Internal server error.
 */
router.post('/', validateUser, async (req, res) => {
  try {
    const newProduct = req.body;
    const docRef = await db.collection('products').add(newProduct);
    res.status(201).json({ id: docRef.id });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * tags:
 *   - name: Products
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     description: Delete a product from the database by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: Unique identifier of the product to delete.
 *     responses:
 *       200:
 *         description: Product deleted successfully.
 *       400:
 *         description: Bad request. Invalid product ID.
 *       500:
 *         description: Internal server error.
 */
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
