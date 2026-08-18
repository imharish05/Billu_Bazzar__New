'use strict';

const router = require('express').Router();
const {
  submitRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  bulkDeleteRequests,
} = require('../controllers/personalShopperController');
const { verifyAdmin, optionalCustomer } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

// Storefront customer submit (Public or logged-in)
router.post('/', optionalCustomer, submitRequest);

// Admin routes
router.get('/', verifyAdmin, hasPermission('view_personal_shopper'), getRequests);
router.get('/:id', verifyAdmin, hasPermission('view_personal_shopper'), getRequestById);
router.put('/:id', verifyAdmin, hasPermission('manage_customers'), updateRequest);
router.patch('/:id', verifyAdmin, hasPermission('manage_customers'), updateRequest);
router.delete('/bulk', verifyAdmin, hasPermission('delete_personal_shopper'), bulkDeleteRequests);
router.delete('/:id', verifyAdmin, hasPermission('delete_personal_shopper'), deleteRequest);

module.exports = router;
