'use strict';

const router = require('express').Router();
const {
  detectGeoLocation,
  initiatePayment,
  handleRazorpayWebhook,
  handleTelrWebhook,
  getPaymentSummary,
  verifyPayment
} = require('../controllers/paymentController');
const { optionalCustomer, verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

// Public geo-detection endpoint
router.get('/geo-detect', detectGeoLocation);

// Client checkout endpoints (handles both INR/Razorpay and AED/Telr)
router.post('/initiate', optionalCustomer, initiatePayment);
router.post('/verify', optionalCustomer, verifyPayment);



// Webhook endpoints for each gateway provider
router.post('/webhook/razorpay', handleRazorpayWebhook);
router.post('/webhook/telr', handleTelrWebhook);

// Admin dashboard reporting endpoints
router.get('/admin/summary', verifyAdmin, hasPermission('view_payments'), getPaymentSummary);

module.exports = router;
