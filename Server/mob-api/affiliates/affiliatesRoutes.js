'use strict';
const router = require('express').Router();
const controller = require('./affiliatesController');

router.get('/affiliates', controller.getAll);
router.get('/affiliates/track', controller.trackClick);

module.exports = router;
