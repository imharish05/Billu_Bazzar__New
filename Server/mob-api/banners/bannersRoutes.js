'use strict';
const router = require('express').Router();
const controller = require('./bannersController');

router.get('/banners', controller.getAll);
router.get('/marketing-messages', controller.getMarketingMessages);

module.exports = router;
