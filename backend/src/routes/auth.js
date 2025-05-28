const express = require('express');
const router = express.Router();
const { admin } = require('../services/firebase');

/**
 * @swagger
 * tags:
 *   - name: verify
 * /verify-token:
 *   post:
 *     summary: Verify Firebase ID token
 *     tags: [verify]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Firebase ID token to verify
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uid:
 *                   type: string
 *                   description: User ID associated with the token
 *       401:
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the token is invalid
 */
router.post('/verify-token', async (req, res) => {
  const { token } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    res.status(200).json({ uid: decodedToken.uid });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
