'use strict';
const affiliate = require('../../controllers/affiliateController');

exports.getAll = (req, res, next) => affiliate.getAll(req, res, next);

exports.trackClick = (req, res, next) => affiliate.trackClick(req, res, next);
