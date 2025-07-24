const orderService = require('../services/order');

/**
 * Create a new order
 */
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    const user = req.user;
    
    if (!user || !user.uid) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const order = await orderService.createOrder(orderData, user.uid);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

/**
 * Get orders for the authenticated user
 */
const getUserOrders = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user || !user.uid) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const orders = await orderService.getUserOrders(user.uid, user.type);
    
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error getting user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: error.message
    });
  }
};

/**
 * Get a specific order by ID
 */
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = req.user;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await orderService.getOrderById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has permission to view this order
    if (user.type === 'customer' && order.uid !== user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    } else if (user.type === 'merchant' && order.merchantUid !== user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error getting order by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
      error: error.message
    });
  }
};

/**
 * Update order status (for merchants/admins)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, ...updateData } = req.body;
    const user = req.user;

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and status are required'
      });
    }

    // Check if user has permission to update orders
    if (!['merchant', 'admin'].includes(user.type)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only merchants and admins can update order status'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
      });
    }

    const updatedOrder = await orderService.updateOrderStatus(orderId, status, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

/**
 * Update delivery status
 */
const updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryStatus, ...deliveryInfo } = req.body;
    const user = req.user;

    if (!orderId || !deliveryStatus) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and delivery status are required'
      });
    }

    // Check if user has permission to update delivery status
    if (!['merchant', 'admin', 'driver'].includes(user.type)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const validDeliveryStatuses = ['assigned', 'picked_up', 'nearby', 'delivered', 'failed'];
    if (!validDeliveryStatuses.includes(deliveryStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid delivery status. Valid statuses are: ${validDeliveryStatuses.join(', ')}`
      });
    }

    const updatedOrder = await orderService.updateDeliveryStatus(orderId, deliveryStatus, deliveryInfo);
    
    res.status(200).json({
      success: true,
      message: 'Delivery status updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery status',
      error: error.message
    });
  }
};

/**
 * Cancel an order
 */
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = '' } = req.body;
    const user = req.user;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Get the order first to check permissions
    const order = await orderService.getOrderById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check permissions
    const canCancel = 
      user.type === 'admin' || 
      (user.type === 'customer' && order.uid === user.uid) ||
      (user.type === 'merchant' && order.merchantUid === user.email);

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const cancelledOrder = await orderService.cancelOrder(orderId, reason);
    
    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order: cancelledOrder
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  updateDeliveryStatus,
  cancelOrder
};
