'use strict';
// Client URL aliases; the original Auth routes and controllers stay unchanged.
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const controller = require('./authController');
const verifyCustomer = require('../common/auth');
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, validate: { trustProxy: false } });
router.post('/reset-password', limiter, controller.resetPassword);
router.get('/me', verifyCustomer, controller.getMe);
module.exports = router;
