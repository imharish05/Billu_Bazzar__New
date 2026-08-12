'use strict';
const router = require('express').Router();
const { getAll, getOne, getWishlist, toggleWishlist, getLoyalty, getTickets, createTicket } = require('../controllers/customerController');
const { verifyCustomer, verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

// Customer self-service routes
router.get('/wishlist', verifyCustomer, getWishlist);
router.post('/wishlist', verifyCustomer, toggleWishlist);
router.get('/loyalty', verifyCustomer, getLoyalty);
router.get('/tickets', verifyCustomer, getTickets);
router.post('/tickets', verifyCustomer, createTicket);

// Admin-only routes
router.get('/', verifyAdmin, hasPermission('view_customers'), getAll);
router.get('/:id', verifyAdmin, hasPermission('view_customers'), getOne);

module.exports = router;
