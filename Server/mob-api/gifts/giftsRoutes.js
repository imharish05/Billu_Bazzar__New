'use strict';
const router = require('express').Router();
const controller = require('./giftsController');

router.get('/gift-service', controller.getGiftService);

module.exports = router;
