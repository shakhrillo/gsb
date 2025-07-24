const pushNotificationService = require('../services/pushNotification');

/**
 * Middleware to periodically check push notification receipts
 * This should be called every 15 minutes or so
 */
class ReceiptChecker {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Start the periodic receipt checking
   * @param {number} intervalMinutes - Interval in minutes (default: 15)
   */
  start(intervalMinutes = 15) {
    if (this.isRunning) {
      console.log('Receipt checker is already running');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    
    console.log(`Starting push notification receipt checker (interval: ${intervalMinutes} minutes)`);
    
    this.intervalId = setInterval(async () => {
      try {
        await pushNotificationService.scheduleReceiptCheck();
        console.log('Scheduled receipt check completed');
      } catch (error) {
        console.error('Error in scheduled receipt check:', error);
      }
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop the periodic receipt checking
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('Receipt checker stopped');
    }
  }

  /**
   * Get the status of the receipt checker
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId
    };
  }
}

// Create a singleton instance
const receiptChecker = new ReceiptChecker();

// Auto-start receipt checking if not in test environment
if (process.env.NODE_ENV !== 'test') {
  // Start checking receipts every 15 minutes
  receiptChecker.start(15);
}

// Gracefully stop receipt checking on process exit
process.on('SIGINT', () => {
  receiptChecker.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  receiptChecker.stop();
  process.exit(0);
});

module.exports = receiptChecker;
