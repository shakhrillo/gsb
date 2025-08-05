const pushNotificationService = require('./pushNotification');

/**
 * Service to handle order-related push notifications
 */
class OrderNotificationService {
  
  /**
   * Send notification when order status changes
   * @param {Object} order - Order object
   * @param {string} userPushToken - User's push token
   * @param {string} newStatus - New order status
   */
  async notifyOrderStatusChange(order, userPushToken, newStatus) {
    try {
      if (!userPushToken || !pushNotificationService.isValidPushToken(userPushToken)) {
        console.log('Invalid or missing push token for order notification');
        return null;
      }

      const { title, body } = this.getOrderStatusMessage(order.id || order.orderId, newStatus);
      
      const notificationData = {
        orderId: order.id || order.orderId,
        status: newStatus,
        type: 'order_status_update',
        timestamp: new Date().toISOString()
      };

      const options = {
        categoryId: 'order_updates',
        sound: 'default',
        priority: 'high',
        badge: 1
      };

      return await pushNotificationService.sendNotification(
        userPushToken,
        title,
        body,
        notificationData,
        options
      );
    } catch (error) {
      console.error('Error sending order status notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when new order is placed (for restaurant/admin)
   * @param {Object} order - Order object
   * @param {Array} adminPushTokens - Array of admin push tokens
   */
  async notifyNewOrder(order, adminPushTokens) {
    try {
      if (!adminPushTokens || adminPushTokens.length === 0) {
        console.log('No admin push tokens provided for new order notification');
        return null;
      }

      const validTokens = adminPushTokens.filter(token => 
        pushNotificationService.isValidPushToken(token)
      );

      if (validTokens.length === 0) {
        console.log('No valid admin push tokens for new order notification');
        return null;
      }

      const title = 'New Order Received';
      const body = `Order #${order.id || order.orderId} - ${order.customerName || 'Customer'} - $${order.total || 'N/A'}`;
      
      const notificationData = {
        orderId: order.id || order.orderId,
        customerName: order.customerName,
        total: order.total,
        type: 'new_order',
        timestamp: new Date().toISOString()
      };

      const options = {
        categoryId: 'new_orders',
        sound: 'default',
        priority: 'high',
        badge: 1
      };

      return await pushNotificationService.sendBulkNotification(
        validTokens,
        title,
        body,
        notificationData,
        options
      );
    } catch (error) {
      console.error('Error sending new order notification:', error);
      throw error;
    }
  }

  /**
   * Send delivery update notification
   * @param {Object} order - Order object
   * @param {string} userPushToken - User's push token
   * @param {string} deliveryStatus - Delivery status
   * @param {Object} deliveryInfo - Additional delivery info
   */
  async notifyDeliveryUpdate(order, userPushToken, deliveryStatus, deliveryInfo = {}) {
    try {
      if (!userPushToken || !pushNotificationService.isValidPushToken(userPushToken)) {
        console.log('Invalid or missing push token for delivery notification');
        return null;
      }

      const { title, body } = this.getDeliveryStatusMessage(
        order.id || order.orderId, 
        deliveryStatus, 
        deliveryInfo
      );
      
      const notificationData = {
        orderId: order.id || order.orderId,
        deliveryStatus,
        type: 'delivery_update',
        ...deliveryInfo,
        timestamp: new Date().toISOString()
      };

      const options = {
        categoryId: 'delivery_updates',
        sound: 'default',
        priority: 'high',
        badge: 1
      };

      return await pushNotificationService.sendNotification(
        userPushToken,
        title,
        body,
        notificationData,
        options
      );
    } catch (error) {
      console.error('Error sending delivery update notification:', error);
      throw error;
    }
  }

  /**
   * Send promotional notification to multiple users
   * @param {Array} userPushTokens - Array of user push tokens
   * @param {Object} promotion - Promotion details
   */
  async notifyPromotion(userPushTokens, promotion) {
    try {
      const validTokens = userPushTokens.filter(token => 
        pushNotificationService.isValidPushToken(token)
      );

      if (validTokens.length === 0) {
        console.log('No valid push tokens for promotion notification');
        return null;
      }

      const notificationData = {
        type: 'promotion',
        promotionId: promotion.id,
        discount: promotion.discount,
        validUntil: promotion.validUntil,
        timestamp: new Date().toISOString()
      };

      const options = {
        categoryId: 'promotions',
        sound: 'default',
        priority: 'normal'
      };

      // Add rich content if image is available
      if (promotion.imageUrl) {
        options.richContent = {
          image: promotion.imageUrl
        };
      }

      return await pushNotificationService.sendBulkNotification(
        validTokens,
        promotion.title,
        promotion.body,
        notificationData,
        options
      );
    } catch (error) {
      console.error('Error sending promotion notification:', error);
      throw error;
    }
  }

  /**
   * Get order status message
   * @param {string} orderId - Order ID
   * @param {string} status - Order status
   * @returns {Object} - Title and body
   */
  getOrderStatusMessage(orderId, status) {
    const messages = {
      'pending': {
        title: 'Order Received',
        body: `Your order #${orderId} has been received and is pending confirmation.`
      },
      'confirmed': {
        title: 'Order Confirmed',
        body: `Your order #${orderId} has been confirmed and will be prepared soon.`
      },
      'preparing': {
        title: 'Order in Preparation',
        body: `Your order #${orderId} is now being prepared by the kitchen.`
      },
      'ready': {
        title: 'Order Ready',
        body: `Your order #${orderId} is ready for pickup/delivery!`
      },
      'out_for_delivery': {
        title: 'Out for Delivery',
        body: `Your order #${orderId} is on its way to you!`
      },
      'delivered': {
        title: 'Order Delivered',
        body: `Your order #${orderId} has been delivered. Enjoy your meal!`
      },
      'cancelled': {
        title: 'Order Cancelled',
        body: `Your order #${orderId} has been cancelled. You will receive a refund if applicable.`
      }
    };

    return messages[status.toLowerCase()] || {
      title: 'Order Update',
      body: `Your order #${orderId} status has been updated to: ${status}`
    };
  }

  /**
   * Get delivery status message
   * @param {string} orderId - Order ID
   * @param {string} deliveryStatus - Delivery status
   * @param {Object} deliveryInfo - Additional delivery info
   * @returns {Object} - Title and body
   */
  getDeliveryStatusMessage(orderId, deliveryStatus, deliveryInfo = {}) {
    const messages = {
      'assigned': {
        title: 'Driver Assigned',
        body: `A driver has been assigned to your order #${orderId}. ${deliveryInfo.driverName ? `Driver: ${deliveryInfo.driverName}` : ''}`
      },
      'picked_up': {
        title: 'Order Picked Up',
        body: `Your order #${orderId} has been picked up and is on the way!`
      },
      'nearby': {
        title: 'Driver Nearby',
        body: `Your driver is nearby with order #${orderId}. Please be ready to receive your order.`
      },
      'delivered': {
        title: 'Order Delivered',
        body: `Your order #${orderId} has been successfully delivered!`
      },
      'failed': {
        title: 'Delivery Failed',
        body: `There was an issue delivering your order #${orderId}. Please contact support.`
      }
    };

    const baseMessage = messages[deliveryStatus.toLowerCase()] || {
      title: 'Delivery Update',
      body: `Update for your order #${orderId}: ${deliveryStatus}`
    };

    // Add estimated time if provided
    if (deliveryInfo.estimatedTime) {
      baseMessage.body += ` ETA: ${deliveryInfo.estimatedTime}`;
    }

    return baseMessage;
  }
}

module.exports = new OrderNotificationService();
