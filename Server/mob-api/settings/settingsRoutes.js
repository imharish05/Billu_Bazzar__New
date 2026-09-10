'use strict';
const router = require('express').Router();
const controller = require('./settingsController');

router.get('/site-settings/:key', controller.getSetting);
router.post('/settings/newsletter-subscribe', controller.subscribeNewsletter);
router.get('/settings/:key', controller.getSetting);

module.exports = router;
