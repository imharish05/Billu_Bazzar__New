'use strict';
const cart = require('../../controllers/cartController');

exports.getCart = (req, res, next) => cart.getCart(req, res, next);

exports.addToCart = (req, res, next) => cart.addToCart(req, res, next);

exports.syncCart = (req, res, next) => cart.syncCart(req, res, next);

exports.updateCartItem = (req, res, next) => cart.updateCartItem(req, res, next);

exports.removeFromCart = (req, res, next) => cart.removeFromCart(req, res, next);

exports.clearCart = (req, res, next) => cart.clearCart(req, res, next);
