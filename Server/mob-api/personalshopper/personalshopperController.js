'use strict';
const personalShopper = require('../../controllers/personalShopperController');

exports.submitRequest = (req, res, next) => personalShopper.submitRequest(req, res, next);
