'use strict';
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const {
  register, login, getProfile, updateProfile,
  adminLogin, adminRegister,
  refresh, getRefreshToken, getMe,
  forgotPassword, verifyOtp, resetPassword,
  sendCheckoutOtp, verifyCheckoutOtp
} = require('../controllers/authController');
const { verifyCustomer, verifyAdmin } = require('../middleware/auth');

// ── Rate Limiters ─────────────────────────────────────────────────────────────
// Applied only to auth endpoints that risk brute-force or abuse
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset attempts. Please try again in 1 hour.' },
});

// ── Customer Auth ─────────────────────────────────────────────────────────────
router.post('/register',            authLimiter, register);
router.post('/login',               authLimiter, login);
router.post('/forgot-password',     authLimiter, forgotPassword);
router.post('/verify-otp',          authLimiter, verifyOtp);
router.post('/reset-password',      resetLimiter, resetPassword);
router.post('/send-checkout-otp',   authLimiter, sendCheckoutOtp);
router.post('/verify-checkout-otp', authLimiter, verifyCheckoutOtp);

router.post('/refresh',           refresh);
router.post('/get-refresh-token', getRefreshToken);
router.get('/getme',              getMe);
router.get('/me',                 getMe);
router.get('/profile',            verifyCustomer, getProfile);
router.put('/profile',            verifyCustomer, updateProfile);

// ── Admin Auth ────────────────────────────────────────────────────────────────
router.post('/admin/login',    authLimiter, adminLogin);
router.post('/admin/register', verifyAdmin,  adminRegister);  // 🔒 requires valid admin JWT

module.exports = router;
