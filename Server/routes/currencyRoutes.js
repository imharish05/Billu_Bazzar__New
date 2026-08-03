'use strict';

const express = require('express');
const router  = express.Router();
const { getExchangeRate } = require('../controllers/currencyController');

// Public endpoint — no auth required
router.get('/rate', getExchangeRate);

module.exports = router;
