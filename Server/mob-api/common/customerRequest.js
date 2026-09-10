'use strict';

module.exports = (req, res, next) => {
  // Express 5 exposes query as a getter: shadow it with the sanitized copy.
  const query = { ...req.query };
  delete query.admin;
  delete query.all;
  for (const key of ['page', 'limit']) {
    if (query[key] !== undefined) {
      if (!/^[1-9]\d*$/.test(String(query[key])) || !Number.isSafeInteger(Number(query[key]))) {
        return res.status(400).json({ success: false, message: `${key} must be a positive integer` });
      }
      if (key === 'limit') query[key] = String(Math.min(Number(query[key]), 100));
    }
  }
  Object.defineProperty(req, 'query', { configurable: true, value: query });
  req.body = req.body || {};
  res.setHeader('Cache-Control', 'no-store');
  return next();
};
