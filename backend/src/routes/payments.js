const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { paymeCheckToken } = require('../middleware/payme.middleware');
const { validateUser } = require('../middleware/validateUser');

//!!! DIQQAT: Bularni o'zgaruvchi fayllarda (masalan, .env) saqlash kerak, kodda emas!
// const PAYME_MERCHANT_ID = '6857d462ce1722a4c53ba5ca';
// const PAYME_SECRET_KEY = 'J%jv40r2yEGzQPWgEgGNCAmg#m0zCpPvR%T5'; // Bu token emas, maxfiy kalit!
// const PAYME_BASE_URL = 'https://test.paycom.uz/api';


router.post('/', paymeCheckToken, transactionController.payme);
router.post('/checkout', validateUser, transactionController.checkout);

module.exports = router;