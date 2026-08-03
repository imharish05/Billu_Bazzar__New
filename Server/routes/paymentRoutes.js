'use strict';

const router = require('express').Router();
const {
  detectGeoLocation,
  initiatePayment,
  handleRazorpayWebhook,
  handleTelrWebhook,
  getPaymentSummary,
  verifyRazorpayPayment
} = require('../controllers/paymentController');
const { optionalCustomer, verifyAdmin } = require('../middleware/auth');

// Public geo-detection endpoint
router.get('/geo-detect', detectGeoLocation);

// Client checkout endpoints
router.post('/initiate', optionalCustomer, initiatePayment);
router.post('/verify', optionalCustomer, verifyRazorpayPayment);



// Webhook endpoints for each gateway provider
router.post('/webhook/razorpay', handleRazorpayWebhook);
router.post('/webhook/telr', handleTelrWebhook);

// Admin dashboard reporting endpoints
router.get('/admin/summary', verifyAdmin, getPaymentSummary);

module.exports = router;
