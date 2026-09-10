'use strict';
const router = require('express').Router();
const controller = require('./personalshopperController');

router.post('/personal-shopper', controller.submitRequest);

module.exports = router;
