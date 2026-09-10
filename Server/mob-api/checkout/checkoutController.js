'use strict';
const auth = require('../../controllers/authController');

exports.sendCheckoutOtp = (req, res, next) => auth.sendCheckoutOtp(req, res, next);

exports.verifyCheckoutOtp = (req, res, next) => auth.verifyCheckoutOtp(req, res, next);
