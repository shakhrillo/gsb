const { db } = require('./firebase');
const orderNotificationService = require('./orderNotification');
const userPushTokenService = require('./userPushToken');

/**
 * Enhanced order service with push notification integration
 */
class OrderService {
  constructor() {
    this.ordersCollection = db.collection('orders');
  }

  /**
   * Create a new order and send notifications
   * @param {Object} orderData - Order data
   * @param {string} userId - User ID who placed the order
   */
  async createOrder(orderData, userId) {
    try {
      // Create the order
      const orderRef = await this.ordersCollection.add({
        ...orderData,
        uid: userId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const orderId = orderRef.id;
      const order = { id: orderId, ...orderData };

      // Send notification to admins/restaurant about new order
      try {
        const adminTokens = await userPushTokenService.getAdminPushTokens();
        if (adminTokens.length > 0) {
          await orderNotificationService.notifyNewOrder(order, adminTokens);
        }
      } catch (notificationError) {
        console.error('Failed to send new order notification:', notificationError);
        // Don't fail the order creation if notification fails
      }

      return { id: orderId, ...orderData };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Update order status and send notification to customer
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New order status
   * @param {Object} updateData - Additional data to update (optional)
   */
  async updateOrderStatus(orderId, newStatus, updateData = {}) {
    try {
      // Update the order
      const orderRef = this.ordersCollection.doc(orderId);
      const orderSnapshot = await orderRef.get();

      if (!orderSnapshot.exists) {
        throw new Error('Order not found');
      }

      const currentOrder = orderSnapshot.data();
      
      await orderRef.update({
        status: newStatus,
        updatedAt: new Date(),
        ...updateData
      });

      const updatedOrder = {
        id: orderId,
        ...currentOrder,
        status: newStatus,
        ...updateData
      };

      // Send notification to customer
      try {
        const customerPushTokens = await userPushTokenService.getUserPushTokenStrings(currentOrder.uid);
        
        if (customerPushTokens.length > 0) {
          // Send to the first active token (or you could send to all)
          await orderNotificationService.notifyOrderStatusChange(
            updatedOrder, 
            customerPushTokens[0], 
            newStatus
          );
        }
      } catch (notificationError) {
        console.error('Failed to send order status notification:', notificationError);
        // Don't fail the order update if notification fails
      }

      return updatedOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Update delivery status and send notification
   * @param {string} orderId - Order ID
   * @param {string} deliveryStatus - Delivery status
   * @param {Object} deliveryInfo - Additional delivery information
   */
  async updateDeliveryStatus(orderId, deliveryStatus, deliveryInfo = {}) {
    try {
      const orderRef = this.ordersCollection.doc(orderId);
      const orderSnapshot = await orderRef.get();

      if (!orderSnapshot.exists) {
        throw new Error('Order not found');
      }

      const currentOrder = orderSnapshot.data();
      
      const deliveryData = {
        deliveryStatus,
        deliveryInfo: {
          ...currentOrder.deliveryInfo,
          ...deliveryInfo
        },
        updatedAt: new Date()
      };

      await orderRef.update(deliveryData);

      const updatedOrder = {
        id: orderId,
        ...currentOrder,
        ...deliveryData
      };

      // Send delivery notification to customer
      try {
        const customerPushTokens = await userPushTokenService.getUserPushTokenStrings(currentOrder.uid);
        
        if (customerPushTokens.length > 0) {
          await orderNotificationService.notifyDeliveryUpdate(
            updatedOrder,
            customerPushTokens[0],
            deliveryStatus,
            deliveryInfo
          );
        }
      } catch (notificationError) {
        console.error('Failed to send delivery notification:', notificationError);
      }

      return updatedOrder;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }

  /**
   * Get orders for a user
   * @param {string} userId - User ID
   * @param {string} userType - User type (customer, merchant, admin)
   */
  async getUserOrders(userId, userType) {
    try {
      let query = this.ordersCollection;

      if (userType === 'merchant') {
        query = query.where('merchantUid', '==', userId);
      } else if (userType === 'customer') {
        query = query.where('uid', '==', userId);
      }
      // For admin, return all orders (no filter)

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      
      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   * @param {string} orderId - Order ID
   */
  async getOrderById(orderId) {
    try {
      const orderSnapshot = await this.ordersCollection.doc(orderId).get();
      
      if (!orderSnapshot.exists) {
        return null;
      }

      return {
        id: orderId,
        ...orderSnapshot.data()
      };
    } catch (error) {
      console.error('Error getting order by ID:', error);
      throw error;
    }
  }

  /**
   * Cancel an order and send notification
   * @param {string} orderId - Order ID
   * @param {string} reason - Cancellation reason
   */
  async cancelOrder(orderId, reason = '') {
    try {
      const order = await this.getOrderById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      if (['delivered', 'cancelled'].includes(order.status)) {
        throw new Error('Cannot cancel this order');
      }

      const updatedOrder = await this.updateOrderStatus(orderId, 'cancelled', {
        cancellationReason: reason,
        cancelledAt: new Date()
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }
}

module.exports = new OrderService();
