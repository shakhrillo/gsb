const pushNotificationService = require('../services/pushNotification');

/**
 * Send a push notification to a single user
 */
const sendNotification = async (req, res) => {
  try {
    const { to, title, body, data = {}, options = {} } = req.body;

    // Validate required fields
    if (!to || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, title, body'
      });
    }

    // Validate push token
    if (!pushNotificationService.isValidPushToken(to)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid push token format'
      });
    }

    const tickets = await pushNotificationService.sendNotification(to, title, body, data, options);

    res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      tickets
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
};

/**
 * Send bulk notifications to multiple users
 */
const sendBulkNotification = async (req, res) => {
  try {
    const { pushTokens, title, body, data = {}, options = {} } = req.body;

    // Validate required fields
    if (!pushTokens || !Array.isArray(pushTokens) || pushTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'pushTokens must be a non-empty array'
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, body'
      });
    }

    // Filter valid push tokens
    const validTokens = pushTokens.filter(token => pushNotificationService.isValidPushToken(token));
    
    if (validTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid push tokens provided'
      });
    }

    const tickets = await pushNotificationService.sendBulkNotification(validTokens, title, body, data, options);

    res.status(200).json({
      success: true,
      message: `Bulk notification sent to ${validTokens.length} recipients`,
      validTokensCount: validTokens.length,
      totalTokensProvided: pushTokens.length,
      tickets
    });
  } catch (error) {
    console.error('Error sending bulk notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk notification',
      error: error.message
    });
  }
};

/**
 * Send custom notification with full options
 */
const sendCustomNotification = async (req, res) => {
  try {
    const messages = req.body.messages;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: 'messages must be an array of notification objects'
      });
    }

    // Validate each message
    for (const message of messages) {
      if (!message.to || !message.title || !message.body) {
        return res.status(400).json({
          success: false,
          message: 'Each message must have to, title, and body fields'
        });
      }
    }

    const tickets = await pushNotificationService.sendPushNotifications(messages);

    res.status(200).json({
      success: true,
      message: `Custom notifications sent successfully`,
      messagesCount: messages.length,
      tickets
    });
  } catch (error) {
    console.error('Error sending custom notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send custom notifications',
      error: error.message
    });
  }
};

/**
 * Check push notification receipts
 */
const checkReceipts = async (req, res) => {
  try {
    const { ticketIds } = req.body;

    const receipts = await pushNotificationService.checkPushReceipts(ticketIds);

    res.status(200).json({
      success: true,
      message: 'Receipts retrieved successfully',
      receipts
    });
  } catch (error) {
    console.error('Error checking receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check receipts',
      error: error.message
    });
  }
};

/**
 * Validate a push token
 */
const validatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'pushToken is required'
      });
    }

    const isValid = pushNotificationService.isValidPushToken(pushToken);

    res.status(200).json({
      success: true,
      isValid,
      message: isValid ? 'Push token is valid' : 'Push token is invalid'
    });
  } catch (error) {
    console.error('Error validating push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate push token',
      error: error.message
    });
  }
};

/**
 * Send order status notification
 */
const sendOrderNotification = async (req, res) => {
  try {
    const { pushToken, orderId, status, customerName, data = {} } = req.body;

    if (!pushToken || !orderId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pushToken, orderId, status'
      });
    }

    let title, body;
    
    switch (status.toLowerCase()) {
      case 'confirmed':
        title = 'Order Confirmed';
        body = `Your order #${orderId} has been confirmed and is being prepared.`;
        break;
      case 'preparing':
        title = 'Order Being Prepared';
        body = `Your order #${orderId} is now being prepared by the restaurant.`;
        break;
      case 'ready':
        title = 'Order Ready';
        body = `Your order #${orderId} is ready for pickup/delivery.`;
        break;
      case 'delivered':
        title = 'Order Delivered';
        body = `Your order #${orderId} has been successfully delivered. Enjoy your meal!`;
        break;
      case 'cancelled':
        title = 'Order Cancelled';
        body = `Your order #${orderId} has been cancelled. You will receive a refund shortly.`;
        break;
      default:
        title = 'Order Update';
        body = `Your order #${orderId} status has been updated to: ${status}`;
    }

    const notificationData = {
      orderId,
      status,
      type: 'order_update',
      ...data
    };

    const tickets = await pushNotificationService.sendNotification(
      pushToken,
      title,
      body,
      notificationData,
      {
        categoryId: 'order_updates',
        sound: 'default',
        priority: 'high'
      }
    );

    res.status(200).json({
      success: true,
      message: 'Order notification sent successfully',
      tickets
    });
  } catch (error) {
    console.error('Error sending order notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send order notification',
      error: error.message
    });
  }
};

/**
 * Send promotional notification
 */
const sendPromotionalNotification = async (req, res) => {
  try {
    const { pushTokens, title, body, imageUrl, promotionId, data = {} } = req.body;

    if (!pushTokens || !Array.isArray(pushTokens) || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pushTokens (array), title, body'
      });
    }

    const notificationData = {
      type: 'promotion',
      promotionId,
      ...data
    };

    const options = {
      categoryId: 'promotions',
      sound: 'default',
      priority: 'normal'
    };

    // Add rich content if image URL is provided
    if (imageUrl) {
      options.richContent = {
        image: imageUrl
      };
    }

    const tickets = await pushNotificationService.sendBulkNotification(
      pushTokens,
      title,
      body,
      notificationData,
      options
    );

    res.status(200).json({
      success: true,
      message: 'Promotional notification sent successfully',
      tickets
    });
  } catch (error) {
    console.error('Error sending promotional notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send promotional notification',
      error: error.message
    });
  }
};

module.exports = {
  sendNotification,
  sendBulkNotification,
  sendCustomNotification,
  checkReceipts,
  validatePushToken,
  sendOrderNotification,
  sendPromotionalNotification
};
