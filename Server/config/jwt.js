'use strict';
const jwt = require('jsonwebtoken');

const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '30d' });

const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

// Short-lived token issued after OTP verification — allows one password reset (10 min)
const signResetToken = (payload) =>
  jwt.sign({ ...payload, purpose: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '10m' });

const verifyResetToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== 'password_reset') throw new Error('Invalid token purpose');
  return decoded;
};

// Mobile App 10-year Access Token
const signMobileToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3650d' });

const signToken = (payload) => signAccessToken(payload);
const verifyToken = (token) => verifyAccessToken(token);

module.exports = {
  signAccessToken,
  signRefreshToken,
  signMobileToken,
  verifyAccessToken,
  verifyRefreshToken,
  signResetToken,
  verifyResetToken,
  signToken,
  verifyToken
};
