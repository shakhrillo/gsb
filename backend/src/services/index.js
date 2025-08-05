/**
 * Services Index
 * 
 * Centralized exports for all services
 */

const authService = require('./auth.service');
const userService = require('./user.service');
const { sendSms } = require('./sms');
const { db } = require('./firebase');

module.exports = {
  authService,
  userService,
  smsService: { sendSms },
  database: { db }
};
