'use strict';
const banner = require('../../controllers/bannerController');
const marketingMessage = require('../../controllers/marketingMessageController');

exports.getAll = (req, res, next) => banner.getAll(req, res, next);
exports.getMarketingMessages = (req, res, next) => marketingMessage.getAll(req, res, next);
