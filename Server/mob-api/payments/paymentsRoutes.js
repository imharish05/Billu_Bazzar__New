'use strict';
const router = require('express').Router();
const controller = require('./paymentsController');

router.get('/payments/geo-detect', controller.detectGeoLocation);
router.post('/payments/initiate', controller.initiatePayment);
router.post('/payments/verify', controller.verifyPayment);

module.exports = router;
