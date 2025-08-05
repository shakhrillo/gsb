const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { paymeCheckToken } = require('../middleware/payme.middleware');
const { validateUser } = require('../middleware/validateUser');

router.post('/', paymeCheckToken, transactionController.payme);
router.post('/checkout', validateUser, transactionController.checkout);
router.post('/cards', validateUser, transactionController.card);

module.exports = router;