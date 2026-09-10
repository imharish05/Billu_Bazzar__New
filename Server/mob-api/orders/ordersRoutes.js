'use strict';
const router = require('express').Router();
const controller = require('./ordersController');

router.get('/orders/my', controller.getMyOrders);
router.get('/orders/my/:id', controller.getMyOrderById);
router.post('/orders/my/:id/cancel', controller.cancelMyOrder);
router.post('/orders', controller.placeOrder);
router.get('/orders/track/:identifier', controller.trackOrder);

module.exports = router;
