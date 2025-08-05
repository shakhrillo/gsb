const axios = require('axios');

/**
 * Eskiz.uz SMS Service
 * 
 * Test messages allowed in test mode:
 * - "Это тест от Eskiz" (Russian)
 * - "Bu Eskiz dan test" (Uzbek)
 * - "This is test from Eskiz" (English)
 */
class EskizSmsService {
  constructor() {
    this.apiUrl = process.env.ESKIZ_API_URL || 'https://notify.eskiz.uz/api';
    this.email = process.env.ESKIZ_LOGIN;
    this.password = process.env.ESKIZ_API_KEY;
    this.token = null;
    this.tokenExpiry = null;
    
    // Create axios instance without initial authorization
    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    this.validateConfig();
  }

  /**
   * Validate required configuration
   */
  validateConfig() {
    if (!this.email || !this.password) {
      throw new Error('ESKIZ_LOGIN and ESKIZ_API_KEY environment variables are required');
    }
  }

  /**
   * Login and get access token
   * @returns {Promise<string>} Access token
   */
  async login() {
    try {
      const response = await this.api.post('/auth/login', {
        email: this.email,
        password: this.password,
      });

      if (response.data && response.data.data && response.data.data.token) {
        this.token = response.data.data.token;
        // Set token expiry (assuming 24 hours if not specified)
        this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        // Update axios instance with new token
        this.api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        
        return this.token;
      } else {
        throw new Error('Invalid response format from login endpoint');
      }
    } catch (error) {
      console.error('Error during login:', error.response?.data || error.message);
      throw new Error(`Authentication failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Refresh the access token
   * @returns {Promise<string>} New access token
   */
  async refreshToken() {
    if (!this.token) {
      return this.login();
    }

    try {
      const response = await this.api.post('/auth/refresh', {
        token: this.token,
      });

      if (response.data && response.data.data && response.data.data.token) {
        this.token = response.data.data.token;
        this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        // Update axios instance with new token
        this.api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        
        return this.token;
      } else {
        // If refresh fails, try login again
        return this.login();
      }
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      // If refresh fails, try login again
      return this.login();
    }
  }

  /**
   * Ensure valid token exists
   * @returns {Promise<string>} Valid access token
   */
  async ensureValidToken() {
    const now = new Date();
    
    // If no token or token is expired, get a new one
    if (!this.token || !this.tokenExpiry || now >= this.tokenExpiry) {
      return this.login();
    }

    return this.token;
  }

  /**
   * Get user information
   * @returns {Promise<Object>} User data
   */
  async getUserInfo() {
    await this.ensureValidToken();
    
    try {
      const response = await this.api.get('/auth/user');
      return response.data;
    } catch (error) {
      console.error('Error getting user info:', error.response?.data || error.message);
      throw new Error(`Failed to get user info: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Send SMS message
   * @param {string} phone - Phone number (with country code)
   * @param {string} message - SMS message text
   * @param {string} from - Sender name (optional)
   * @returns {Promise<Object>} Send result
   */
  async sendSms(phone, message, from = null) {
    await this.ensureValidToken();

    // Validate input
    if (!phone || !message) {
      throw new Error('Phone number and message are required');
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Validate phone number format (basic validation)
    if (!/^\+?[\d]{10,15}$/.test(cleanPhone)) {
      throw new Error('Invalid phone number format');
    }

    const payload = {
      mobile_phone: cleanPhone,
      message: message,
    };

    if (from) {
      payload.from = from;
    }

    try {
      const response = await this.api.post('/message/sms/send', payload);
      return response.data;
    } catch (error) {
      console.error('Error sending SMS:', error.response?.data || error.message);
      
      // If unauthorized, try to refresh token and retry once
      if (error.response?.status === 401) {
        try {
          await this.refreshToken();
          const retryResponse = await this.api.post('/message/sms/send', payload);
          return retryResponse.data;
        } catch (retryError) {
          console.error('Error on retry:', retryError.response?.data || retryError.message);
          throw new Error(`SMS send failed: ${retryError.response?.data?.message || retryError.message}`);
        }
      }
      
      throw new Error(`SMS send failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Send template message
   * @param {string} template - Template text
   * @returns {Promise<Object>} Template result
   */
  async sendTemplate(template) {
    await this.ensureValidToken();

    if (!template) {
      throw new Error('Template text is required');
    }

    try {
      const response = await this.api.post('/user/template', {
        template: template,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending template:', error.response?.data || error.message);
      throw new Error(`Template send failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Send test SMS (for test mode)
   * @param {string} phone - Phone number
   * @param {'ru'|'uz'|'en'} language - Language for test message
   * @returns {Promise<Object>} Send result
   */
  async sendTestSms(phone, language = 'en') {
    const testMessages = {
      ru: 'Это тест от Eskiz',
      uz: 'Bu Eskiz dan test',
      en: 'This is test from Eskiz',
    };

    const message = testMessages[language] || testMessages.en;
    return this.sendSms(phone, message);
  }
}

// Create singleton instance
const eskizSmsService = new EskizSmsService();

module.exports = {
  sendSms: (phone, message, from) => eskizSmsService.sendSms(phone, message, from),
  sendTestSms: (phone, language) => eskizSmsService.sendTestSms(phone, language),
  sendTemplate: (template) => eskizSmsService.sendTemplate(template),
  getUserInfo: () => eskizSmsService.getUserInfo(),
  eskizSmsService, // Export the class instance for advanced usage
};