'use strict';
const customer = require('../../controllers/customerController');
const auth = require('../../controllers/authController');

exports.getWishlist = (req, res, next) => customer.getWishlist(req, res, next);

exports.toggleWishlist = (req, res, next) => customer.toggleWishlist(req, res, next);

exports.getLoyalty = (req, res, next) => customer.getLoyalty(req, res, next);

exports.getTickets = (req, res, next) => customer.getTickets(req, res, next);

exports.getProfile = (req, res, next) => auth.getProfile(req, res, next);

exports.updateProfile = (req, res, next) => auth.updateProfile(req, res, next);

exports.changePassword = (req, res, next) => auth.changePassword(req, res, next);

const withOwnedOrder = require('../common/ownedOrder');
exports.createTicket = withOwnedOrder(customer.createTicket, true);
