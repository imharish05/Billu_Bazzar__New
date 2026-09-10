'use strict';
const router = require('express').Router();
const controller = require('./myaccountController');
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, keyGenerator: req => String(req.customer.id) });

router.get('/customers/wishlist', controller.getWishlist);
router.post('/customers/wishlist', controller.toggleWishlist);
router.get('/customers/loyalty', controller.getLoyalty);
router.get('/customers/tickets', controller.getTickets);
router.post('/customers/tickets', controller.createTicket);
router.get('/auth/profile', controller.getProfile);
router.put('/auth/profile', controller.updateProfile);
router.put('/auth/change-password', limiter, controller.changePassword);
router.get('/myaccount/wishlist', controller.getWishlist);
router.post('/myaccount/wishlist', controller.toggleWishlist);
router.get('/myaccount/loyalty', controller.getLoyalty);
router.get('/myaccount/tickets', controller.getTickets);
router.post('/myaccount/tickets', controller.createTicket);
router.get('/myaccount/profile', controller.getProfile);
router.put('/myaccount/profile', controller.updateProfile);
router.put('/myaccount/change-password', limiter, controller.changePassword);

module.exports = router;
