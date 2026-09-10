'use strict';
const payment = require('../../controllers/paymentController');

exports.detectGeoLocation = (req, res, next) => payment.detectGeoLocation(req, res, next);

const withOwnedOrder = require('../common/ownedOrder');
exports.initiatePayment = withOwnedOrder(payment.initiatePayment);
exports.verifyPayment = withOwnedOrder(payment.verifyPayment);
