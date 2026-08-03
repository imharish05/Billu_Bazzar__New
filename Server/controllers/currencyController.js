'use strict';

const rateService = require('../services/currencyRateService');

/**
 * GET /api/currency/rate
 * Returns the current AED→INR exchange rate from the in-memory cache.
 * The cache refreshes in the background every 6 hours.
 * This endpoint itself is extremely cheap — no DB query, no outbound request on hit.
 */
const getExchangeRate = (req, res) => {
  const rate = rateService.getRate();
  res.json({
    success: true,
    base: 'AED',
    target: 'INR',
    rate,
    note: 'Rate is cached and refreshed every 6 hours from open.er-api.com'
  });
};

module.exports = { getExchangeRate };
