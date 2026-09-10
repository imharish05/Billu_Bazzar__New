'use strict';
const review = require('../../controllers/reviewController');

exports.getProductReviews = (req, res, next) => review.getProductReviews(req, res, next);

exports.getMyDeliveredItems = (req, res, next) => review.getMyDeliveredItems(req, res, next);

exports.createReview = (req, res, next) => review.createReview(req, res, next);

exports.updateReview = (req, res, next) => review.updateReview(req, res, next);

exports.deleteReview = (req, res, next) => review.deleteReview(req, res, next);
