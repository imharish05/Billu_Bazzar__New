'use strict';
const giftService = require('../../controllers/giftServiceController');

exports.getGiftService = (req, res, next) => giftService.getGiftService(req, res, next);
