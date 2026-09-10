'use strict';
const currency = require('../../controllers/currencyController');

exports.getExchangeRate = (req, res, next) => currency.getExchangeRate(req, res, next);
