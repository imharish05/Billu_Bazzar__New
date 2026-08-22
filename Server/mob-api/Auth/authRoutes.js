'use strict';
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getMe,
} = require('./authController');
const { verifyCustomer } = require('../../middleware/auth');

// ── Rate Limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                  // 20 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 OTP attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { success: false, message: 'Too many OTP requests. Please try again in 15 minutes.' },
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                   // 10 reset attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { success: false, message: 'Too many reset attempts. Please try again in 1 hour.' },
});

// ── Public Unprotected Endpoints ──────────────────────────────────────────────
router.post('/register',        authLimiter,  register);
router.post('/login',           authLimiter,  login);
router.post('/forgot-password', otpLimiter,   forgotPassword);
router.post('/verify-otp',      otpLimiter,   verifyOtp);
router.post('/new-password',    resetLimiter, resetPassword);
router.post('/reset-password',  resetLimiter, resetPassword);

// ── Protected Endpoints ───────────────────────────────────────────────────────
router.get('/me',               verifyCustomer, getMe);

module.exports = router;
