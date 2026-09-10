'use strict';
const stock = require('../../controllers/stockController');
const stockAlert = require('../../controllers/stockAlertController');

exports.getStockStatus = (req, res, next) => stock.getStockStatus(req, res, next);

exports.createStockAlert = (req, res, next) => stockAlert.createStockAlert(req, res, next);
