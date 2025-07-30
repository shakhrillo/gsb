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

/**
 * @swagger
 * /terms/html:
 *   get:
 *     summary: Get terms and conditions as HTML
 *     tags: [Terms]
 *     responses:
 *       200:
 *         description: Terms and conditions HTML page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Terms and conditions not found
 *       500:
 *         description: Internal server error
 */
router.get('/html', async (req, res) => {
  try {
    // Get the latest terms and conditions document
    const snapshot = await db.collection('terms')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Terms and Conditions - Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .error { color: #d32f2f; text-align: center; }
          </style>
        </head>
        <body>
          <h1 class="error">Terms and Conditions Not Found</h1>
          <p class="error">The terms and conditions document could not be found.</p>
        </body>
        </html>
      `);
    }

    const termsDoc = snapshot.docs[0];
    const terms = termsDoc.data();

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${terms.title || 'Terms and Conditions'}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background-color: #f9f9f9;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .meta-info {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            border-left: 4px solid #3498db;
          }
          .meta-info p {
            margin: 5px 0;
            font-size: 14px;
          }
          .content {
            white-space: pre-wrap;
            font-size: 16px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${terms.title || 'Terms and Conditions'}</h1>
          
          <div class="meta-info">
            <p><strong>Version:</strong> ${terms.version || 'N/A'}</p>
            <p><strong>Last Updated:</strong> ${terms.lastUpdated ? new Date(terms.lastUpdated.toDate()).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Document ID:</strong> ${termsDoc.id}</p>
          </div>
          
          <div class="content">
${terms.content || 'No content available.'}
          </div>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (err) {
    console.error('Error fetching terms and conditions HTML:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - Terms and Conditions</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .error { color: #d32f2f; text-align: center; }
        </style>
      </head>
      <body>
        <h1 class="error">Error Loading Terms and Conditions</h1>
        <p class="error">An error occurred while loading the terms and conditions.</p>
      </body>
      </html>
    `);
  }
});

module.exports = router;
