const { Expo } = require('expo-server-sdk');

class PushNotificationService {
  constructor() {
    // Create a new Expo SDK client
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN, // Optional: for enhanced security
      useFcmV1: true, // Use FCM v1 API
    });
    
    // Store for push tickets and receipts
    this.pushTickets = new Map();
  }

  /**
   * Check if a push token is valid
   * @param {string} pushToken - The Expo push token
   * @returns {boolean} - Whether the token is valid
   */
  isValidPushToken(pushToken) {
    return Expo.isExpoPushToken(pushToken);
  }

  /**
   * Send push notifications to multiple recipients
   * @param {Array} messages - Array of message objects
   * @returns {Promise<Array>} - Array of push tickets
   */
  async sendPushNotifications(messages) {
    try {
      // Validate all push tokens first
      const validMessages = messages.filter(message => {
        if (Array.isArray(message.to)) {
          message.to = message.to.filter(token => this.isValidPushToken(token));
          return message.to.length > 0;
        }
        return this.isValidPushToken(message.to);
      });

      if (validMessages.length === 0) {
        throw new Error('No valid push tokens provided');
      }

      // Send notifications in chunks (Expo recommends max 100 per request)
      const chunks = this.expo.chunkPushNotifications(validMessages);
      const tickets = [];

      for (let chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          
          // Store tickets for later receipt checking
          ticketChunk.forEach((ticket, index) => {
            if (ticket.id) {
              this.pushTickets.set(ticket.id, {
                ticket,
                message: chunk[index],
                timestamp: Date.now()
              });
            }
          });
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
          // Continue with other chunks even if one fails
        }
      }

      return tickets;
    } catch (error) {
      console.error('Error in sendPushNotifications:', error);
      throw error;
    }
  }

  /**
   * Send a single push notification
   * @param {string|Array} to - Push token(s)
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Array of push tickets
   */
  async sendNotification(to, title, body, data = {}, options = {}) {
    const message = {
      to,
      title,
      body,
      data,
      ...options
    };

    return this.sendPushNotifications([message]);
  }

  /**
   * Send notification to multiple users
   * @param {Array} pushTokens - Array of push tokens
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Array of push tickets
   */
  async sendBulkNotification(pushTokens, title, body, data = {}, options = {}) {
    const messages = pushTokens.map(token => ({
      to: token,
      title,
      body,
      data,
      ...options
    }));

    return this.sendPushNotifications(messages);
  }

  /**
   * Check push receipts for sent notifications
   * @param {Array} ticketIds - Array of ticket IDs
   * @returns {Promise<Object>} - Object mapping ticket IDs to receipts
   */
  async checkPushReceipts(ticketIds = null) {
    try {
      // If no ticket IDs provided, check all stored tickets
      const idsToCheck = ticketIds || Array.from(this.pushTickets.keys());
      
      if (idsToCheck.length === 0) {
        return {};
      }

      // Get receipts in chunks
      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(idsToCheck);
      const receipts = {};

      for (let chunk of receiptIdChunks) {
        try {
          const receiptChunk = await this.expo.getPushNotificationReceiptsAsync(chunk);
          Object.assign(receipts, receiptChunk);
        } catch (error) {
          console.error('Error getting push receipts chunk:', error);
        }
      }

      // Process receipts and handle errors
      for (const receiptId in receipts) {
        const receipt = receipts[receiptId];
        
        if (receipt.status === 'error') {
          console.error(`Push notification error for receipt ${receiptId}:`, receipt);
          
          // Handle specific errors
          if (receipt.details && receipt.details.error) {
            switch (receipt.details.error) {
              case 'DeviceNotRegistered':
                // Remove this push token from your database
                console.log(`Device not registered for receipt ${receiptId}`);
                break;
              case 'MessageTooBig':
                console.log(`Message too big for receipt ${receiptId}`);
                break;
              case 'MessageRateExceeded':
                console.log(`Message rate exceeded for receipt ${receiptId}`);
                break;
              case 'MismatchSenderId':
                console.log(`Sender ID mismatch for receipt ${receiptId}`);
                break;
              case 'InvalidCredentials':
                console.log(`Invalid credentials for receipt ${receiptId}`);
                break;
            }
          }
        }
      }

      // Clean up old tickets (older than 24 hours)
      this.cleanupOldTickets();

      return receipts;
    } catch (error) {
      console.error('Error checking push receipts:', error);
      throw error;
    }
  }

  /**
   * Clean up old push tickets (older than 24 hours)
   */
  cleanupOldTickets() {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const [ticketId, ticket] of this.pushTickets.entries()) {
      if (ticket.timestamp < twentyFourHoursAgo) {
        this.pushTickets.delete(ticketId);
      }
    }
  }

  /**
   * Schedule receipt checking (call this periodically, e.g., every 15 minutes)
   */
  async scheduleReceiptCheck() {
    try {
      await this.checkPushReceipts();
    } catch (error) {
      console.error('Error in scheduled receipt check:', error);
    }
  }

  /**
   * Create a properly formatted notification message
   * @param {Object} options - Notification options
   * @returns {Object} - Formatted message object
   */
  createMessage({
    to,
    title,
    body,
    data = {},
    sound = 'default',
    badge = null,
    ttl = null,
    priority = 'high',
    channelId = null,
    categoryId = null,
    subtitle = null,
    interruptionLevel = null,
    mutableContent = false,
    richContent = null
  }) {
    const message = {
      to,
      title,
      body,
      data
    };

    // Add optional fields only if they have values
    if (sound !== null) message.sound = sound;
    if (badge !== null) message.badge = badge;
    if (ttl !== null) message.ttl = ttl;
    if (priority !== null) message.priority = priority;
    if (channelId !== null) message.channelId = channelId;
    if (categoryId !== null) message.categoryId = categoryId;
    if (subtitle !== null) message.subtitle = subtitle;
    if (interruptionLevel !== null) message.interruptionLevel = interruptionLevel;
    if (mutableContent) message.mutableContent = mutableContent;
    if (richContent !== null) message.richContent = richContent;

    return message;
  }
}

module.exports = new PushNotificationService();
