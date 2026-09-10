'use strict';
const deliveryZone = require('../../controllers/deliveryZoneController');

exports.checkPincodeDelivery = (req, res, next) => deliveryZone.checkPincodeDelivery(req, res, next);
