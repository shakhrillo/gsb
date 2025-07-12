const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

// Add tracking information
// example request body:
// {
//   "orderId": "12345",
//   "trackingNumber": "TRACK123456",
//   "carrier": "Carrier Name",
//   "status": "In Transit",
//   "estimatedDelivery": "2023-12-01T00:00:00Z"
//   --- need driver info
//   "driver": {
//     "name": "Driver Name",
//     "phone": "+1234567890",
//     "vehicle": "Vehicle Type",
//     "licensePlate": "ABC123"
//   }
//   "location": {
//     "latitude": 37.7749,
//     "longitude": -122.4194
//   }
//   "timestamp": "2023-11-01T12:00:00Z"
//   "notes": "Additional notes about the tracking"
//   "lastUpdated": "2023-11-01T12:00:00Z"
// }
/**
 * @swagger
 * tags:
 *  - name: Tracking
 * /tracking:
 *   post:
 *     summary: Add tracking information
 *     tags: [Tracking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: ID of the order
 *               trackingNumber:
 *                 type: string
 *                 description: Tracking number
 *               carrier:
 *                 type: string
 *                 description: Name of the carrier
 *               status:
 *                 type: string
 *                 description: Current status of the shipment
 *               estimatedDelivery:
 *                 type: string
 *                 format: date-time
 *                 description: Estimated delivery date and time
 *               driver:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Name of the driver
 *                   phone:
 *                     type: string
 *                     description: Phone number of the driver
 *                   vehicle:
 *                     type: string
 *                     description: Type of vehicle
 *                   licensePlate:
 *                     type: string
 *                     description: License plate of the vehicle
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     description: Latitude of the current location
 *                   longitude:
 *                     type: number
 *                     description: Longitude of the current location
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Timestamp of the tracking update
 *               notes:
 *                 type: string
 *                 description: Additional notes about the tracking
 *               lastUpdated:
 *                 type: string
 *                 format: date-time
 *                 description: Last updated timestamp
 *     responses:
 *       201:
 *         description: Tracking information added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID of the created tracking record
 *       400:
 *         description: Bad request
 */
router.post('/tracking', async (req, res) => {
  try {
    const trackingData = req.body;
    const trackingRef = await db.collection('tracking').add(trackingData);
    res.status(201).json({ id: trackingRef.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * tags:
 *  - name: Tracking
 * /tracking:
 *   get:
 *     summary: Get tracking information
 *     tags: [Tracking]
 *     parameters:
 *       - in: query
 *         name: orderId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter tracking information by order ID
 *     responses:
 *       200:
 *         description: List of tracking information
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID of the tracking record
 *                   orderId:
 *                     type: string
 *                     description: ID of the order
 *                   trackingNumber:
 *                     type: string
 *                     description: Tracking number
 *                   carrier:
 *                     type: string
 *                     description: Name of the carrier
 *                   status:
 *                     type: string
 *                     description: Current status of the shipment
 *                   estimatedDelivery:
 *                     type: string
 *                     format: date-time
 *                     description: Estimated delivery date and time
 *                   driver:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Name of the driver
 *                       phone:
 *                         type: string
 *                         description: Phone number of the driver
 *                       vehicle:
 *                         type: string
 *                         description: Type of vehicle
 *                       licensePlate:
 *                         type: string
 *                         description: License plate of the vehicle
 *                   location:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                         description: Latitude of the current location
 *                       longitude:
 *                         type: number
 *                         description: Longitude of the current location
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     description: Timestamp of the tracking update
 *                   notes:
 *                     type: string
 *                     description: Additional notes about the tracking
 *                   lastUpdated:
 *                     type: string
 *                     format: date-time
 *                     description: Last updated timestamp
 *       500:
 *         description: Internal server error
 */
router.get('/tracking', async (req, res) => {
  try {
    const { orderId } = req.query;
    let query = db.collection('tracking');
    if (orderId) {
      query = query.where('orderId', '==', orderId);
    }
    const snapshot = await query.get();
    const trackingInfo = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(trackingInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;