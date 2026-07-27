'use strict';

const router = require('express').Router();
const {
  submitContactEnquiry,
  getContactEnquiries,
  getContactEnquiryById,
  updateContactEnquiry,
  deleteContactEnquiry,
  bulkDeleteContactEnquiries,
} = require('../controllers/contactEnquiryController');
const { verifyAdmin } = require('../middleware/auth');

// Public route: Storefront contact form submit
router.post('/', submitContactEnquiry);

// Admin routes
router.get('/', verifyAdmin, getContactEnquiries);
router.get('/:id', verifyAdmin, getContactEnquiryById);
router.put('/:id', verifyAdmin, updateContactEnquiry);
router.delete('/bulk', verifyAdmin, bulkDeleteContactEnquiries);
router.delete('/:id', verifyAdmin, deleteContactEnquiry);

module.exports = router;
