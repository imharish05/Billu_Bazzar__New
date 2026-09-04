'use strict';
const bcrypt = require('bcryptjs');
const { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../config/jwt');
const { Customer, AdminUser, Role, SiteSetting, LoyaltyLedger } = require('../models');
const { v4: uuidv4 } = require('uuid');

const { validatePhoneNumber } = require('../utils/phoneValidation');


const validateEmail = (email) => {
  if (!email) return { isValid: false, message: 'Email address is required' };
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }
  return { isValid: true };
};

const validatePassword = (password) => {
  if (!password) return { isValid: false, message: 'Password is required' };
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  return { isValid: true };
};

// ── Customer Auth ─────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};
    if (!name || !email || !password || !phone) return res.status(400).json({ success: false, message: 'Name, email, password, and phone number are required' });

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ success: false, message: phoneValidation.message });
    }

    const exists = await Customer.findOne({ where: { email } });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

    // Fetch site loyalty settings for signup bonus points
    const siteSetting = await SiteSetting.findOne({ where: { key: 'loyalty' } });
    let loyaltySettings = { signupPointsEnabled: true, signupPoints: 50 };
    if (siteSetting && siteSetting.value) {
      try { loyaltySettings = { ...loyaltySettings, ...JSON.parse(siteSetting.value) }; } catch (e) {}
    }

    let initialPoints = 0;
    if (loyaltySettings.signupPointsEnabled !== false && Number(loyaltySettings.signupPoints || 0) > 0) {
      initialPoints = Number(loyaltySettings.signupPoints);
    }

    const hashed = await bcrypt.hash(password, 12);
    const referralCode = uuidv4().slice(0, 8).toUpperCase();
    const customer = await Customer.create({
      name,
      email,
      password: hashed,
      phone: phoneValidation.formatted,
      referralCode,
      loyaltyPoints: initialPoints
    });

    if (initialPoints > 0) {
      await LoyaltyLedger.create({
        customerId: customer.id,
        type: 'BONUS',
        points: initialPoints,
        balance: initialPoints,
        description: 'Welcome Registration Bonus Points'
      });
    }

    const token = signAccessToken({ id: customer.id, type: 'CUSTOMER' });
    const refreshToken = signRefreshToken({ id: customer.id, type: 'CUSTOMER' });
    res.status(201).json({ success: true, token, refreshToken, bonusPointsEarned: initialPoints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const customer = await Customer.findOne({ where: { email } });
    if (!customer || !await bcrypt.compare(password, customer.password))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (!customer.isActive) return res.status(403).json({ success: false, message: 'Account suspended' });

    const token = signAccessToken({ id: customer.id, type: 'CUSTOMER' });
    const refreshToken = signRefreshToken({ id: customer.id, type: 'CUSTOMER' });
    res.json({ success: true, token, refreshToken });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getProfile = async (req, res) => {
  res.json({ success: true, customer: req.customer });
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, whatsappOptIn } = req.body || {};
    let formattedPhone = req.customer.phone;
    if (phone !== undefined) {
      if (phone && String(phone).trim()) {
        const phoneValidation = validatePhoneNumber(phone);
        if (!phoneValidation.isValid) {
          return res.status(400).json({ success: false, message: phoneValidation.message });
        }
        formattedPhone = phoneValidation.formatted;
      } else {
        formattedPhone = null;
      }
    }
    await req.customer.update({ name, phone: formattedPhone, address, whatsappOptIn });
    res.json({ success: true, customer: req.customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin Auth ────────────────────────────────────────────────────────────────
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const admin = await AdminUser.findOne({ where: { email }, include: [{ association: 'role' }] });
    if (!admin || !await bcrypt.compare(password, admin.password))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!admin.isActive) return res.status(403).json({ success: false, message: 'Account suspended' });

    await admin.update({ lastLogin: new Date() });
    const token = signAccessToken({ id: admin.id, type: 'ADMIN' });
    const refreshToken = signRefreshToken({ id: admin.id, type: 'ADMIN' });
    
    let permissions = admin.role?.permissions || {};
    if (typeof permissions === 'string') {
      try { permissions = JSON.parse(permissions); } catch (e) { permissions = {}; }
    }

    const adminData = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role?.name || 'Staff User',
      permissions
    };

    res.json({ success: true, token, refreshToken, admin: adminData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const newAccessToken = signAccessToken({ id: decoded.id, type: decoded.type });
    return res.json({ success: true, token: newAccessToken });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

const getRefreshToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No access token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const newRefreshToken = signRefreshToken({ id: decoded.id, type: decoded.type });
    return res.json({ success: true, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
};

const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // If token explicitly identified as ADMIN
    if (decoded.type === 'ADMIN') {
      const admin = await AdminUser.findByPk(decoded.id, {
        include: [{ association: 'role' }],
        attributes: { exclude: ['password'] }
      });
      if (admin && admin.isActive) {
        let permissions = admin.role?.permissions || {};
        if (typeof permissions === 'string') {
          try { permissions = JSON.parse(permissions); } catch (e) { permissions = {}; }
        }
        return res.json({
          success: true,
          admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role?.name || 'Staff User',
            permissions
          }
        });
      }
      return res.status(401).json({ success: false, message: 'Admin user not found or inactive' });
    }

    // If token explicitly identified as CUSTOMER
    if (decoded.type === 'CUSTOMER') {
      const customer = await Customer.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      if (customer && customer.isActive) {
        return res.json({ success: true, customer });
      }
      return res.status(401).json({ success: false, message: 'Customer not found or inactive' });
    }

    // Legacy tokens without type property: Check Customer first, then AdminUser
    const customer = await Customer.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });
    if (customer && customer.isActive) {
      return res.json({ success: true, customer });
    }

    const admin = await AdminUser.findByPk(decoded.id, {
      include: [{ association: 'role' }],
      attributes: { exclude: ['password'] }
    });
    if (admin && admin.isActive) {
      let permissions = admin.role?.permissions || {};
      if (typeof permissions === 'string') {
        try { permissions = JSON.parse(permissions); } catch (e) { permissions = {}; }
      }
      return res.json({
        success: true,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role?.name || 'Staff User',
          permissions
        }
      });
    }

    return res.status(401).json({ success: false, message: 'User not found or inactive' });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const adminRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    let [role] = await Role.findOrCreate({
      where: { name: 'ADMIN' },
      defaults: { permissions: { all: true } }
    });

    const hashed = await bcrypt.hash(password, 12);
    const cleanEmail = email.trim().toLowerCase();
    const adminName = name || cleanEmail.split('@')[0] || 'Admin User';

    let admin = await AdminUser.findOne({ where: { email: cleanEmail } });
    if (admin) {
      await admin.update({ password: hashed, isActive: true, roleId: role.id });
      return res.status(200).json({
        success: true,
        message: 'Admin account updated successfully with new password',
        admin: { id: admin.id, name: admin.name, email: admin.email }
      });
    }

    admin = await AdminUser.create({
      name: adminName,
      email: cleanEmail,
      password: hashed,
      roleId: role.id,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      admin: { id: admin.id, name: admin.name, email: admin.email }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Forgot / Reset Password (OTP flow) ───────────────────────────────────────
const crypto = require('crypto');
const { sendOtpEmail, sendFraudOtpEmail } = require('../services/emailService');

// ── Checkout Fraud Verification OTP ──────────────────────────────────────────
const checkoutOtpStore = new Map(); // targetEmail -> { hashedOtp, expiry }

const sendCheckoutOtp = async (req, res) => {
  try {
    const { email, name } = req.body || {};
    const targetEmail = (email || req.customer?.email || '').trim().toLowerCase();
    if (!targetEmail) return res.status(400).json({ success: false, message: 'Email address is required' });

    const emailValidation = validateEmail(targetEmail);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in-memory for all checkouts (both guest and registered users)
    checkoutOtpStore.set(targetEmail, { hashedOtp, expiry });

    let emailSent = true;
    try {
      await sendFraudOtpEmail(targetEmail, name || req.customer?.name || 'Customer', otp);
    } catch (emailErr) {
      emailSent = false;
      console.warn(`[Checkout OTP] Email delivery failed (${emailErr.message}).`);
    }

    return res.json({
      success: true,
      message: emailSent
        ? `Verification OTP sent to ${targetEmail}`
        : `Verification code sent to ${targetEmail}. Please check your spam folder or contact support if not received.`
    });
  } catch (err) {
    console.error('[sendCheckoutOtp] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const verifyCheckoutOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const targetEmail = (email || req.customer?.email || '').trim().toLowerCase();
    if (!targetEmail || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit verification code are required' });
    }

    const inputHash = crypto.createHash('sha256').update(otp.toString().trim()).digest('hex');
    let isValid = false;

    // Check in-memory store
    const memEntry = checkoutOtpStore.get(targetEmail);
    if (memEntry) {
      if (new Date() > new Date(memEntry.expiry)) {
        checkoutOtpStore.delete(targetEmail);
        return res.status(400).json({ success: false, message: 'Verification code has expired. Please resend.' });
      }
      if (memEntry.hashedOtp === inputHash) {
        isValid = true;
        checkoutOtpStore.delete(targetEmail);
      }
    }

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Incorrect or expired 6-digit verification code. Please try again.' });
    }

    return res.json({ success: true, message: 'Security verification successful' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const { signResetToken, verifyResetToken } = require('../config/jwt');

/**
 * Step 1 — Customer submits their email.
 * Generates a 6-digit OTP, stores a SHA-256 hash of it in the DB (10 min expiry),
 * and sends the plain OTP to the customer's email via Gmail.
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, message: 'Email address is required' });

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    const customer = await Customer.findOne({ where: { email: email.trim().toLowerCase() } });

    // Always respond with success to prevent email enumeration
    if (!customer) {
      return res.json({ success: true, message: 'If that email is registered, an OTP has been sent.' });
    }

    // Generate a cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store only the hash — never the plain OTP
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await customer.update({
      passwordResetToken: hashedOtp,
      passwordResetExpiry: expiry,
    });

    try {
      await sendOtpEmail(customer.email, customer.name, otp);
    } catch (emailErr) {
      console.error('OTP email failed:', emailErr.message);
      // Clear the token so the user can retry cleanly
      await customer.update({ passwordResetToken: null, passwordResetExpiry: null });
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
    }

    return res.json({ success: true, message: 'If that email is registered, an OTP has been sent.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Step 2 — Customer submits the 6-digit OTP.
 * Validates the OTP hash and expiry. On success, clears the OTP (one-time use)
 * and returns a short-lived resetToken JWT (10 min) the frontend uses for step 3.
 */
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const customer = await Customer.findOne({ where: { email: email.trim().toLowerCase() } });

    if (!customer || !customer.passwordResetToken || !customer.passwordResetExpiry) {
      return res.status(400).json({ success: false, message: 'OTP not found or already used. Please request a new one.' });
    }

    // Check expiry first
    if (new Date() > new Date(customer.passwordResetExpiry)) {
      await customer.update({ passwordResetToken: null, passwordResetExpiry: null });
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Verify the OTP hash
    const hashedOtp = crypto.createHash('sha256').update(otp.toString().trim()).digest('hex');
    if (hashedOtp !== customer.passwordResetToken) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    // OTP correct — clear it (one-time use)
    await customer.update({ passwordResetToken: null, passwordResetExpiry: null });

    // Issue a short-lived reset token so step 3 can proceed
    const resetToken = signResetToken({ id: customer.id });

    return res.json({ success: true, resetToken });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Step 3 — Customer submits their new password.
 * Verifies the resetToken JWT from step 2 and updates the password.
 */
const resetPassword = async (req, res) => {
  try {
    const { resetToken, password } = req.body || {};
    if (!resetToken || !password) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    // Verify the OTP-issued reset token
    let decoded;
    try {
      decoded = verifyResetToken(resetToken);
    } catch {
      return res.status(400).json({ success: false, message: 'Your session has expired. Please start the reset process again.' });
    }

    const customer = await Customer.findByPk(decoded.id);
    if (!customer || !customer.isActive) {
      return res.status(400).json({ success: false, message: 'Account not found.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    await customer.update({ password: hashed });

    return res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Customer changes password while logged in.
 * Requires: { currentPassword, newPassword }
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    const customer = await Customer.findByPk(req.customer.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, customer.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await customer.update({ password: hashed });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  register, login, getProfile, updateProfile, changePassword,
  adminLogin, adminRegister,
  refresh, getRefreshToken, getMe,
  forgotPassword, verifyOtp, resetPassword,
  sendCheckoutOtp, verifyCheckoutOtp,
};
