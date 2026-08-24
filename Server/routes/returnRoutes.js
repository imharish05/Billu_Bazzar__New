'use strict';
const router = require('express').Router();
const {
  requestReturn,
  getMyReturns,
  getMyReturnById,
  getAllAdmin,
  updateStatusAdmin,
  initiateRefundAdmin,
} = require('../controllers/returnController');
const { verifyCustomer, verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const upload = require('../middleware/upload');

// Customer routes
router.post(
  '/request',
  verifyCustomer,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'unboxingVideo', maxCount: 1 },
    { name: 'images', maxCount: 5 },
  ]),
  requestReturn
);
router.get('/my', verifyCustomer, getMyReturns);
router.get('/my/:id', verifyCustomer, getMyReturnById);

// Admin routes
router.get('/', verifyAdmin, hasPermission('view_orders'), getAllAdmin);
router.get('/admin/all', verifyAdmin, hasPermission('view_orders'), getAllAdmin);
router.patch('/:id/status', verifyAdmin, hasPermission('update_orders'), updateStatusAdmin);
router.put('/:id/status', verifyAdmin, hasPermission('update_orders'), updateStatusAdmin);
router.patch('/admin/:id/status', verifyAdmin, hasPermission('update_orders'), updateStatusAdmin);
router.put('/admin/:id/status', verifyAdmin, hasPermission('update_orders'), updateStatusAdmin);
router.post('/:id/refund', verifyAdmin, hasPermission('update_orders'), initiateRefundAdmin);
router.post('/admin/:id/refund', verifyAdmin, hasPermission('update_orders'), initiateRefundAdmin);

module.exports = router;
