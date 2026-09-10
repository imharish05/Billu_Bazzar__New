'use strict';
const { verifyToken } = require('../../config/jwt');
const { Customer } = require('../../models');
// Compatible with the original mobile Auth token format.
module.exports = async (req, res, next) => {
  let token;
  try {
    const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
    if (!match) throw Error('Missing token');
    token = verifyToken(match[1]);
    if (token.purpose || (token.type && token.type !== 'CUSTOMER')) throw Error('Not a customer access token');
  } catch {
    return res.status(401).json({ success: false, message: 'Customer authentication required' });
  }
  try {
    const customer = await Customer.findByPk(token.id, { attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpiry'] } });
    if (!customer || !customer.isActive) return res.status(401).json({ success: false, message: 'Account unavailable' });
    req.customer = customer;
    return next();
  } catch (err) { return next(err); }
};
