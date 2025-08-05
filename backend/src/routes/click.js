const express = require('express');
const router = express.Router();
const clickController = require('../controllers/click.controller');

router.post('/prepare', clickController.prepare);
router.post('/complete', clickController.complete);

module.exports = router;
