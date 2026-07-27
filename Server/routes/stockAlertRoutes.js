'use strict';
const router = require('express').Router();
const { createStockAlert, getStockAlerts, notifyStockAlert } = require('../controllers/stockAlertController');
const { optionalCustomer, verifyAdmin } = require('../middleware/auth');

router.post('/', optionalCustomer, createStockAlert);
router.get('/', verifyAdmin, getStockAlerts);
router.put('/:id/notify', verifyAdmin, notifyStockAlert);

module.exports = router;
