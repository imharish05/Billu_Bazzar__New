'use strict';
const router = require('express').Router();
const controller = require('./cartController');

router.get('/cart', controller.getCart);
router.post('/cart/add', controller.addToCart);
router.post('/cart/sync', controller.syncCart);
router.put('/cart/item/:itemId', controller.updateCartItem);
router.delete('/cart/item/:itemId', controller.removeFromCart);
router.delete('/cart/clear', controller.clearCart);

module.exports = router;
