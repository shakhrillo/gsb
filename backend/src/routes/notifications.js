const express = require('express');
const router = express.Router();
const pushNotificationController = require('../controllers/pushNotification.controller');
const userPushTokenController = require('../controllers/userPushToken.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     PushNotification:
 *       type: object
 *       required:
 *         - to
 *         - title
 *         - body
 *       properties:
 *         to:
 *           type: string
 *           description: The Expo push token
 *         title:
 *           type: string
 *           description: Notification title
 *         body:
 *           type: string
 *           description: Notification body
 *         data:
 *           type: object
 *           description: Additional data to send with the notification
 *         options:
 *           type: object
 *           description: Additional notification options
 *     
 *     BulkPushNotification:
 *       type: object
 *       required:
 *         - pushTokens
 *         - title
 *         - body
 *       properties:
 *         pushTokens:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of Expo push tokens
 *         title:
 *           type: string
 *           description: Notification title
 *         body:
 *           type: string
 *           description: Notification body
 *         data:
 *           type: object
 *           description: Additional data to send with the notification
 *         options:
 *           type: object
 *           description: Additional notification options
 */

/**
 * @swagger
 * /notifications/send:
 *   post:
 *     summary: Send a push notification to a single user
 *     tags: [Push Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PushNotification'
 *           example:
 *             to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *             title: "Hello World"
 *             body: "This is a test notification"
 *             data:
 *               userId: "123"
 *               type: "general"
 *             options:
 *               sound: "default"
 *               priority: "high"
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/send', pushNotificationController.sendNotification);

/**
 * @swagger
 * /notifications/send-bulk:
 *   post:
 *     summary: Send push notifications to multiple users
 *     tags: [Push Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkPushNotification'
 *           example:
 *             pushTokens:
 *               - "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *               - "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]"
 *             title: "Special Offer"
 *             body: "Get 20% off your next order!"
 *             data:
 *               type: "promotion"
 *               discount: 20
 *             options:
 *               sound: "default"
 *               priority: "normal"
 *     responses:
 *       200:
 *         description: Bulk notification sent successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/send-bulk', pushNotificationController.sendBulkNotification);

/**
 * @swagger
 * /notifications/send-custom:
 *   post:
 *     summary: Send custom notifications with full control
 *     tags: [Push Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - to
 *                     - title
 *                     - body
 *                   properties:
 *                     to:
 *                       type: string
 *                     title:
 *                       type: string
 *                     body:
 *                       type: string
 *                     data:
 *                       type: object
 *                     sound:
 *                       type: string
 *                     priority:
 *                       type: string
 *           example:
 *             messages:
 *               - to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *                 title: "Order Update"
 *                 body: "Your order is being prepared"
 *                 data:
 *                   orderId: "12345"
 *                   status: "preparing"
 *                 sound: "default"
 *                 priority: "high"
 *               - to: "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]"
 *                 title: "Welcome!"
 *                 body: "Thanks for joining us"
 *                 data:
 *                   type: "welcome"
 *                 sound: "default"
 *                 priority: "normal"
 *     responses:
 *       200:
 *         description: Custom notifications sent successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/send-custom', pushNotificationController.sendCustomNotification);

/**
 * @swagger
 * /notifications/check-receipts:
 *   post:
 *     summary: Check push notification receipts
 *     tags: [Push Notifications]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticketIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of ticket IDs to check (optional)
 *           example:
 *             ticketIds:
 *               - "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
 *               - "YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY"
 *     responses:
 *       200:
 *         description: Receipts retrieved successfully
 *       500:
 *         description: Server error
 */
router.post('/check-receipts', pushNotificationController.checkReceipts);

/**
 * @swagger
 * /notifications/validate-token:
 *   post:
 *     summary: Validate a push token
 *     tags: [Push Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pushToken
 *             properties:
 *               pushToken:
 *                 type: string
 *                 description: The push token to validate
 *           example:
 *             pushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *     responses:
 *       200:
 *         description: Token validation result
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/validate-token', pushNotificationController.validatePushToken);

/**
 * @swagger
 * /notifications/order-update:
 *   post:
 *     summary: Send order status notification
 *     tags: [Push Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pushToken
 *               - orderId
 *               - status
 *             properties:
 *               pushToken:
 *                 type: string
 *                 description: The user's push token
 *               orderId:
 *                 type: string
 *                 description: The order ID
 *               status:
 *                 type: string
 *                 enum: [confirmed, preparing, ready, delivered, cancelled]
 *                 description: The order status
 *               customerName:
 *                 type: string
 *                 description: Customer name (optional)
 *               data:
 *                 type: object
 *                 description: Additional data
 *           example:
 *             pushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *             orderId: "ORD-12345"
 *             status: "preparing"
 *             customerName: "John Doe"
 *             data:
 *               estimatedTime: "20 minutes"
 *     responses:
 *       200:
 *         description: Order notification sent successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/order-update', pushNotificationController.sendOrderNotification);

/**
 * @swagger
 * /notifications/promotion:
 *   post:
 *     summary: Send promotional notification
 *     tags: [Push Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pushTokens
 *               - title
 *               - body
 *             properties:
 *               pushTokens:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of push tokens
 *               title:
 *                 type: string
 *                 description: Notification title
 *               body:
 *                 type: string
 *                 description: Notification body
 *               imageUrl:
 *                 type: string
 *                 description: Promotional image URL (optional)
 *               promotionId:
 *                 type: string
 *                 description: Promotion ID (optional)
 *               data:
 *                 type: object
 *                 description: Additional data
 *           example:
 *             pushTokens:
 *               - "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *               - "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]"
 *             title: "Flash Sale!"
 *             body: "Get 30% off all items for the next 2 hours"
 *             imageUrl: "https://example.com/promo-image.jpg"
 *             promotionId: "FLASH30"
 *             data:
 *               discount: 30
 *               validUntil: "2024-01-01T18:00:00Z"
 *     responses:
 *       200:
 *         description: Promotional notification sent successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/promotion', pushNotificationController.sendPromotionalNotification);

// Push Token Management Routes

/**
 * @swagger
 * /notifications/register-token:
 *   post:
 *     summary: Register a push token for a user
 *     tags: [Push Token Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - pushToken
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The user ID
 *               pushToken:
 *                 type: string
 *                 description: The Expo push token
 *               deviceInfo:
 *                 type: object
 *                 description: Device information (optional)
 *                 properties:
 *                   platform:
 *                     type: string
 *                   deviceId:
 *                     type: string
 *                   deviceName:
 *                     type: string
 *                   osVersion:
 *                     type: string
 *                   appVersion:
 *                     type: string
 *           example:
 *             userId: "user123"
 *             pushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *             deviceInfo:
 *               platform: "ios"
 *               deviceId: "iPhone12"
 *               deviceName: "John's iPhone"
 *               osVersion: "14.5"
 *               appVersion: "1.0.0"
 *     responses:
 *       200:
 *         description: Push token registered successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/register-token', userPushTokenController.registerPushToken);

/**
 * @swagger
 * /notifications/user-tokens/{userId}:
 *   get:
 *     summary: Get push tokens for a user
 *     tags: [Push Token Management]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User push tokens retrieved successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.get('/user-tokens/:userId', userPushTokenController.getUserPushTokens);

/**
 * @swagger
 * /notifications/remove-token:
 *   delete:
 *     summary: Remove a push token for a user
 *     tags: [Push Token Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - pushToken
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The user ID
 *               pushToken:
 *                 type: string
 *                 description: The push token to remove
 *           example:
 *             userId: "user123"
 *             pushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *     responses:
 *       200:
 *         description: Push token removed successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.delete('/remove-token', userPushTokenController.removePushToken);

/**
 * @swagger
 * /notifications/deactivate-token:
 *   post:
 *     summary: Deactivate a push token
 *     tags: [Push Token Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pushToken
 *             properties:
 *               pushToken:
 *                 type: string
 *                 description: The push token to deactivate
 *           example:
 *             pushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *     responses:
 *       200:
 *         description: Push token deactivated successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/deactivate-token', userPushTokenController.deactivatePushToken);

/**
 * @swagger
 * /notifications/update-device-info:
 *   put:
 *     summary: Update device information for a push token
 *     tags: [Push Token Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pushToken
 *               - deviceInfo
 *             properties:
 *               pushToken:
 *                 type: string
 *                 description: The push token
 *               deviceInfo:
 *                 type: object
 *                 description: Updated device information
 *           example:
 *             pushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *             deviceInfo:
 *               platform: "ios"
 *               osVersion: "15.0"
 *               appVersion: "1.1.0"
 *     responses:
 *       200:
 *         description: Device info updated successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put('/update-device-info', userPushTokenController.updateDeviceInfo);

/**
 * @swagger
 * /notifications/cleanup-tokens:
 *   post:
 *     summary: Clean up old/inactive push tokens
 *     tags: [Push Token Management]
 *     responses:
 *       200:
 *         description: Push tokens cleanup completed
 *       500:
 *         description: Server error
 */
router.post('/cleanup-tokens', userPushTokenController.cleanupPushTokens);

module.exports = router;
