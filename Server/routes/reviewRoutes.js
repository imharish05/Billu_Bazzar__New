'use strict';
const router = require('express').Router();
const {
  getProductReviews,
  getMyDeliveredItems,
  createReview,
  updateReview,
  deleteReview,
  getAllReviewsAdmin,
  updateReviewStatusAdmin,
} = require('../controllers/reviewController');
const { verifyCustomer, verifyAdmin, optionalCustomer } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

// Admin routes (must be before generic /:id routes)
router.get('/admin/all', verifyAdmin, hasPermission('view_reviews'), getAllReviewsAdmin);
router.patch('/admin/:id/status', verifyAdmin, hasPermission('view_reviews'), updateReviewStatusAdmin);
router.delete('/admin/:id', verifyAdmin, hasPermission('delete_review'), deleteReview);

// Customer routes
router.get('/product/:productId', optionalCustomer, getProductReviews);
router.get('/my-delivered-items', verifyCustomer, getMyDeliveredItems);
router.post('/', verifyCustomer, createReview);
router.put('/:id', verifyCustomer, updateReview);
router.delete('/:id', verifyCustomer, deleteReview);

module.exports = router;

