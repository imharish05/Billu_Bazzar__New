'use strict';
const router = require('express').Router();
const controller = require('./offersController');

router.get('/coupons', controller.getCoupons);
router.post('/coupons/validate', controller.validate);
router.get('/offers', controller.getCoupons);
router.post('/offers/validate', controller.validate);

module.exports = router;
