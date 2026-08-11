'use strict';
const router = require('express').Router();
const { getAll, getOne, getMyOrders, getMyOrderById, trackOrder, cancelMyOrder, placeOrder, updateStatus, getDashboardStats, getStatusCounts } = require('../controllers/orderController');
const { verifyCustomer, verifyAdmin, optionalCustomer } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/stats', verifyAdmin, hasPermission('view_orders'), getDashboardStats);
router.get('/status-counts', verifyAdmin, hasPermission('view_orders'), getStatusCounts);
router.get('/track/:identifier', optionalCustomer, trackOrder);
router.get('/my', verifyCustomer, getMyOrders);
router.get('/my/:id', verifyCustomer, getMyOrderById);
router.post('/my/:id/cancel', verifyCustomer, cancelMyOrder);
router.post('/', optionalCustomer, placeOrder); // allow optional guest order placement
router.get('/', verifyAdmin, hasPermission('view_orders'), getAll);
router.get('/:id', verifyAdmin, hasPermission('view_orders'), getOne);
router.patch('/:id/status', verifyAdmin, hasPermission('update_orders'), updateStatus);
router.put('/:id/status', verifyAdmin, hasPermission('update_orders'), updateStatus);

module.exports = router;
