const userPushTokenService = require('../services/userPushToken');

/**
 * Register a push token for a user
 */
const registerPushToken = async (req, res) => {
  try {
    const { userId, pushToken, deviceInfo = {} } = req.body;

    if (!userId || !pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, pushToken'
      });
    }

    const tokenId = await userPushTokenService.registerPushToken(userId, pushToken, deviceInfo);

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      tokenId
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register push token',
      error: error.message
    });
  }
};

/**
 * Get push tokens for a user
 */
const getUserPushTokens = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const tokens = await userPushTokenService.getUserPushTokens(userId);

    res.status(200).json({
      success: true,
      tokens
    });
  } catch (error) {
    console.error('Error getting user push tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user push tokens',
      error: error.message
    });
  }
};

/**
 * Remove a push token for a user
 */
const removePushToken = async (req, res) => {
  try {
    const { userId, pushToken } = req.body;

    if (!userId || !pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, pushToken'
      });
    }

    await userPushTokenService.removePushToken(userId, pushToken);

    res.status(200).json({
      success: true,
      message: 'Push token removed successfully'
    });
  } catch (error) {
    console.error('Error removing push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove push token',
      error: error.message
    });
  }
};

/**
 * Deactivate a push token (e.g., when device is unregistered)
 */
const deactivatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required'
      });
    }

    await userPushTokenService.deactivatePushToken(pushToken);

    res.status(200).json({
      success: true,
      message: 'Push token deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate push token',
      error: error.message
    });
  }
};

/**
 * Update device information for a push token
 */
const updateDeviceInfo = async (req, res) => {
  try {
    const { pushToken, deviceInfo } = req.body;

    if (!pushToken || !deviceInfo) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pushToken, deviceInfo'
      });
    }

    await userPushTokenService.updateDeviceInfo(pushToken, deviceInfo);

    res.status(200).json({
      success: true,
      message: 'Device info updated successfully'
    });
  } catch (error) {
    console.error('Error updating device info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update device info',
      error: error.message
    });
  }
};

/**
 * Clean up old/inactive push tokens
 */
const cleanupPushTokens = async (req, res) => {
  try {
    await userPushTokenService.cleanupPushTokens();

    res.status(200).json({
      success: true,
      message: 'Push tokens cleanup completed'
    });
  } catch (error) {
    console.error('Error cleaning up push tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup push tokens',
      error: error.message
    });
  }
};

module.exports = {
  registerPushToken,
  getUserPushTokens,
  removePushToken,
  deactivatePushToken,
  updateDeviceInfo,
  cleanupPushTokens
};
