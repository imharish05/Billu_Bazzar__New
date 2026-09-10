'use strict';
const contactEnquiry = require('../../controllers/contactEnquiryController');

exports.submitContactEnquiry = (req, res, next) => contactEnquiry.submitContactEnquiry(req, res, next);
