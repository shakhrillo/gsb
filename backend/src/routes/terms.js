const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

/**
 * @swagger
 * /terms:
 *   get:
 *     summary: Get terms and conditions
 *     tags: [Terms]
 *     responses:
 *       200:
 *         description: Terms and conditions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 content:
 *                   type: string
 *                 version:
 *                   type: string
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Terms and conditions not found
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    // Get the latest terms and conditions document
    const snapshot = await db.collection('terms')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ 
        error: 'Terms and conditions not found' 
      });
    }

    const termsDoc = snapshot.docs[0];
    const terms = {
      id: termsDoc.id,
      ...termsDoc.data()
    };

    res.status(200).json(terms);
  } catch (err) {
    console.error('Error fetching terms and conditions:', err);
    res.status(500).json({ 
      error: 'Failed to fetch terms and conditions' 
    });
  }
});

/**
 * @swagger
 * /terms/version/{version}:
 *   get:
 *     summary: Get terms and conditions by version
 *     tags: [Terms]
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: string
 *         description: Version of the terms and conditions
 *     responses:
 *       200:
 *         description: Terms and conditions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 content:
 *                   type: string
 *                 version:
 *                   type: string
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Terms and conditions version not found
 *       500:
 *         description: Internal server error
 */
router.get('/version/:version', async (req, res) => {
  try {
    const { version } = req.params;

    const snapshot = await db.collection('terms')
      .where('version', '==', version)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ 
        error: `Terms and conditions version ${version} not found` 
      });
    }

    const termsDoc = snapshot.docs[0];
    const terms = {
      id: termsDoc.id,
      ...termsDoc.data()
    };

    res.status(200).json(terms);
  } catch (err) {
    console.error('Error fetching terms and conditions by version:', err);
    res.status(500).json({ 
      error: 'Failed to fetch terms and conditions' 
    });
  }
});

/**
 * @swagger
 * /terms/all:
 *   get:
 *     summary: Get all versions of terms and conditions
 *     tags: [Terms]
 *     responses:
 *       200:
 *         description: All terms and conditions versions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   content:
 *                     type: string
 *                   version:
 *                     type: string
 *                   lastUpdated:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/all', async (req, res) => {
  try {
    const snapshot = await db.collection('terms')
      .orderBy('createdAt', 'desc')
      .get();

    const allTerms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(allTerms);
  } catch (err) {
    console.error('Error fetching all terms and conditions:', err);
    res.status(500).json({ 
      error: 'Failed to fetch terms and conditions' 
    });
  }
});

module.exports = router;
