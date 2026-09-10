'use strict';
const router = require('express').Router();
const controller = require('./contactController');

router.post('/contact-enquiries', controller.submitContactEnquiry);

module.exports = router;
