'use strict';
const router = require('express').Router();
const controller = require('./stockController');

router.get('/stock-status', controller.getStockStatus);
router.post('/stock-alerts', controller.createStockAlert);

module.exports = router;
