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

/**
 * @swagger
 * /privacy/html:
 *   get:
 *     summary: Get privacy policy as HTML
 *     tags: [Privacy]
 *     responses:
 *       200:
 *         description: Privacy policy HTML page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Privacy policy not found
 *       500:
 *         description: Internal server error
 */
router.get('/html', async (req, res) => {
  try {
    // Get the latest privacy policy document
    const snapshot = await db.collection('privacy')
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
          <title>Privacy Policy - Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .error { color: #d32f2f; text-align: center; }
          </style>
        </head>
        <body>
          <h1 class="error">Privacy Policy Not Found</h1>
          <p class="error">The privacy policy document could not be found.</p>
        </body>
        </html>
      `);
    }

    const privacyDoc = snapshot.docs[0];
    const privacy = privacyDoc.data();

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${privacy.title || 'Privacy Policy'}</title>
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
            border-bottom: 3px solid #27ae60;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .meta-info {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            border-left: 4px solid #27ae60;
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
          <h1>${privacy.title || 'Privacy Policy'}</h1>
          
          <div class="meta-info">
            <p><strong>Version:</strong> ${privacy.version || 'N/A'}</p>
            <p><strong>Last Updated:</strong> ${privacy.lastUpdated ? new Date(privacy.lastUpdated.toDate()).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Document ID:</strong> ${privacyDoc.id}</p>
          </div>
          
          <div class="content">
${privacy.content || 'No content available.'}
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
    console.error('Error fetching privacy policy HTML:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - Privacy Policy</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .error { color: #d32f2f; text-align: center; }
        </style>
      </head>
      <body>
        <h1 class="error">Error Loading Privacy Policy</h1>
        <p class="error">An error occurred while loading the privacy policy.</p>
      </body>
      </html>
    `);
  }
});

/**
 * @swagger
 * /privacy/html/version/{version}:
 *   get:
 *     summary: Get privacy policy by version as HTML
 *     tags: [Privacy]
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: string
 *         description: Version of the privacy policy
 *     responses:
 *       200:
 *         description: Privacy policy HTML page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Privacy policy version not found
 *       500:
 *         description: Internal server error
 */
router.get('/html/version/:version', async (req, res) => {
  try {
    const { version } = req.params;

    const snapshot = await db.collection('privacy')
      .where('version', '==', version)
      .get();

    if (snapshot.empty) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Privacy Policy - Version Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .error { color: #d32f2f; text-align: center; }
          </style>
        </head>
        <body>
          <h1 class="error">Version Not Found</h1>
          <p class="error">Privacy policy version "${version}" could not be found.</p>
        </body>
        </html>
      `);
    }

    const privacyDoc = snapshot.docs[0];
    const privacy = privacyDoc.data();

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${privacy.title || 'Privacy Policy'} - Version ${version}</title>
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
            border-bottom: 3px solid #27ae60;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .meta-info {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            border-left: 4px solid #27ae60;
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
          <h1>${privacy.title || 'Privacy Policy'}</h1>
          
          <div class="meta-info">
            <p><strong>Version:</strong> ${privacy.version || 'N/A'}</p>
            <p><strong>Last Updated:</strong> ${privacy.lastUpdated ? new Date(privacy.lastUpdated.toDate()).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Document ID:</strong> ${privacyDoc.id}</p>
          </div>
          
          <div class="content">
${privacy.content || 'No content available.'}
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
    console.error('Error fetching privacy policy HTML by version:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - Privacy Policy</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .error { color: #d32f2f; text-align: center; }
        </style>
      </head>
      <body>
        <h1 class="error">Error Loading Privacy Policy</h1>
        <p class="error">An error occurred while loading the privacy policy.</p>
      </body>
      </html>
    `);
  }
});

/**
 * @swagger
 * /privacy/html/all:
 *   get:
 *     summary: Get all versions of privacy policies as HTML
 *     tags: [Privacy]
 *     responses:
 *       200:
 *         description: All privacy policy versions HTML page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       500:
 *         description: Internal server error
 */
router.get('/html/all', async (req, res) => {
  try {
    const snapshot = await db.collection('privacy')
      .orderBy('createdAt', 'desc')
      .get();

    const allPolicies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    let policiesListHtml = '';
    if (allPolicies.length === 0) {
      policiesListHtml = '<p class="no-policies">No privacy policies found.</p>';
    } else {
      policiesListHtml = allPolicies.map((policy, index) => `
        <div class="policy-item">
          <h2>Version ${policy.version || 'Unknown'}</h2>
          <div class="meta-info">
            <p><strong>Title:</strong> ${policy.title || 'Untitled'}</p>
            <p><strong>Last Updated:</strong> ${policy.lastUpdated ? new Date(policy.lastUpdated.toDate()).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Document ID:</strong> ${policy.id}</p>
          </div>
          <div class="content">
            ${policy.content ? policy.content.substring(0, 300) + (policy.content.length > 300 ? '...' : '') : 'No content available.'}
          </div>
          <div class="actions">
            <a href="/privacy/html/version/${policy.version}" class="view-full">View Full Version</a>
          </div>
        </div>
      `).join('');
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>All Privacy Policy Versions</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 1000px;
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
            border-bottom: 3px solid #27ae60;
            padding-bottom: 15px;
            margin-bottom: 30px;
            text-align: center;
          }
          .policy-item {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            background: #fafafa;
          }
          .policy-item h2 {
            color: #2c3e50;
            margin-top: 0;
            border-bottom: 2px solid #27ae60;
            padding-bottom: 10px;
          }
          .meta-info {
            background: #e8f5e8;
            padding: 10px;
            border-radius: 5px;
            margin: 15px 0;
            font-size: 14px;
          }
          .meta-info p {
            margin: 5px 0;
          }
          .content {
            white-space: pre-wrap;
            margin: 15px 0;
            color: #555;
          }
          .actions {
            text-align: right;
            margin-top: 15px;
          }
          .view-full {
            background: #27ae60;
            color: white;
            padding: 8px 16px;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
            transition: background 0.3s;
          }
          .view-full:hover {
            background: #229954;
          }
          .no-policies {
            text-align: center;
            color: #666;
            font-style: italic;
            margin: 40px 0;
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
          <h1>All Privacy Policy Versions</h1>
          <p style="text-align: center; color: #666; margin-bottom: 30px;">
            Total versions: ${allPolicies.length}
          </p>
          
          ${policiesListHtml}
          
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
    console.error('Error fetching all privacy policies HTML:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - Privacy Policy</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .error { color: #d32f2f; text-align: center; }
        </style>
      </head>
      <body>
        <h1 class="error">Error Loading Privacy Policy</h1>
        <p class="error">An error occurred while loading the privacy policy.</p>
      </body>
      </html>
    `);
  }
});

module.exports = router;
