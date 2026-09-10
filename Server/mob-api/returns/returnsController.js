'use strict';
const returns = require('../../controllers/returnController');

exports.getMyReturns = (req, res, next) => returns.getMyReturns(req, res, next);

exports.getMyReturnById = (req, res, next) => returns.getMyReturnById(req, res, next);

exports.requestReturn = (req, res, next) => returns.requestReturn(req, res, next);
