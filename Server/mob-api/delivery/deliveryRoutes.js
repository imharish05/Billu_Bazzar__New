'use strict';
const router = require('express').Router();
const controller = require('./deliveryController');

router.get('/delivery-zones/check/:pincode', controller.checkPincodeDelivery);
router.get('/delivery-zones/check', controller.checkPincodeDelivery);

module.exports = router;
