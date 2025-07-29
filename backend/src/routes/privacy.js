const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

/**
 * @swagger
 * /privacy:
 *   get:
 *     summary: Get privacy policy
 *     tags: [Privacy]
 *     responses:
 *       200:
 *         description: Privacy policy retrieved successfully
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
 *         description: Privacy policy not found
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    // Get the latest privacy policy document
    const snapshot = await db.collection('privacy')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ 
        error: 'Privacy policy not found' 
      });
    }

    const privacyDoc = snapshot.docs[0];
    const privacy = {
      id: privacyDoc.id,
      ...privacyDoc.data()
    };

    res.status(200).json(privacy);
  } catch (error) {
    console.error('Error fetching privacy policy:', error);
    res.status(500).json({ 
      error: 'Failed to fetch privacy policy' 
    });
  }
});

/**
 * @swagger
 * /privacy/version/{version}:
 *   get:
 *     summary: Get privacy policy by version
 *     tags: [Privacy]
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: string
 *         description: Privacy policy version
 *     responses:
 *       200:
 *         description: Privacy policy retrieved successfully
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
 *         description: Privacy policy version not found
 *       500:
 *         description: Internal server error
 */
router.get('/version/:version', async (req, res) => {
  try {
    const { version } = req.params;
    
    const snapshot = await db.collection('privacy')
      .where('version', '==', version)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ 
        error: `Privacy policy version ${version} not found` 
      });
    }

    const privacyDoc = snapshot.docs[0];
    const privacy = {
      id: privacyDoc.id,
      ...privacyDoc.data()
    };

    res.status(200).json(privacy);
  } catch (error) {
    console.error('Error fetching privacy policy by version:', error);
    res.status(500).json({ 
      error: 'Failed to fetch privacy policy' 
    });
  }
});

/**
 * @swagger
 * /privacy/all:
 *   get:
 *     summary: Get all privacy policy versions
 *     tags: [Privacy]
 *     responses:
 *       200:
 *         description: All privacy policy versions retrieved successfully
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
    const snapshot = await db.collection('privacy')
      .orderBy('createdAt', 'desc')
      .get();

    const privacyPolicies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(privacyPolicies);
  } catch (error) {
    console.error('Error fetching all privacy policies:', error);
    res.status(500).json({ 
      error: 'Failed to fetch privacy policies' 
    });
  }
});

module.exports = router;
