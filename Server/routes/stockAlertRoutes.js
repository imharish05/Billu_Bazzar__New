'use strict';
const router = require('express').Router();
const { createStockAlert, getStockAlerts, notifyStockAlert } = require('../controllers/stockAlertController');
const { optionalCustomer, verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.post('/', optionalCustomer, createStockAlert);
router.get('/', verifyAdmin, hasPermission('view_stock_alerts'), getStockAlerts);
router.put('/:id/notify', verifyAdmin, hasPermission('view_stock_alerts'), notifyStockAlert);

module.exports = router;
