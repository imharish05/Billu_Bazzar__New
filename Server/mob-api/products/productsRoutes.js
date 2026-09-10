'use strict';
const router = require('express').Router();
const controller = require('./productsController');

router.get('/products', controller.getAll);
router.get('/products/featured', controller.getFeatured);
router.get('/products/search', controller.search);
router.get('/products/price-range', controller.getPriceRange);
router.get('/products/:slug', controller.getOne);
router.get('/variants/product/:productId', controller.getVariants);

module.exports = router;
