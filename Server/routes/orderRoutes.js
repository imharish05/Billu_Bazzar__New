'use strict';
const router = require('express').Router();
const { getAll, getOne, getMyOrders, getMyOrderById, trackOrder, cancelMyOrder, placeOrder, updateStatus, getDashboardStats, getStatusCounts } = require('../controllers/orderController');
const { verifyCustomer, verifyAdmin, optionalCustomer } = require('../middleware/auth');

router.get('/stats', verifyAdmin, getDashboardStats);
router.get('/status-counts', verifyAdmin, getStatusCounts);
router.get('/track/:identifier', optionalCustomer, trackOrder);
router.get('/my', verifyCustomer, getMyOrders);
router.get('/my/:id', verifyCustomer, getMyOrderById);
router.post('/my/:id/cancel', verifyCustomer, cancelMyOrder);
router.post('/', optionalCustomer, placeOrder); // allow optional guest order placement
router.get('/', verifyAdmin, getAll);
router.get('/:id', verifyAdmin, getOne);
router.patch('/:id/status', verifyAdmin, updateStatus);
router.put('/:id/status', verifyAdmin, updateStatus);

module.exports = router;
