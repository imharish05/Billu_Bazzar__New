'use strict';
const router = require('express').Router();
const controller = require('./currencyController');

router.get('/currency/rate', controller.getExchangeRate);

module.exports = router;
