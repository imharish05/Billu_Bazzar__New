'use strict';
const router = require('express').Router();
const controller = require('./reviewsController');

router.get('/reviews/product/:productId', controller.getProductReviews);
router.get('/reviews/my-delivered-items', controller.getMyDeliveredItems);
router.post('/reviews', controller.createReview);
router.put('/reviews/:id', controller.updateReview);
router.delete('/reviews/:id', controller.deleteReview);

module.exports = router;
