'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { 
  signMobileToken,
  signResetToken, 
  verifyResetToken 
} = require('../../config/jwt');
const { Op } = require('sequelize');
const { 
  Customer, 
  Cart, 
  CartItem, 
  SiteSetting, 
  LoyaltyLedger 
} = require('../../models');
const { sendOtpEmail } = require('../../services/emailService');
const {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateOtp,
} = require('./authValidation');

/**
 * 1. Customer Registration
 * POST /mob-api/auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

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

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanName = name.trim();

    // Check if email already registered
    const existingEmail = await Customer.findOne({ where: { email: cleanEmail } });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    // Check if phone number is already registered (unique phone constraint)
    const cleanDigits = cleanPhone.replace(/^\+/, '').replace(/[\s\-()]/g, '');
    const phoneVariations = [cleanPhone, cleanDigits, `+${cleanDigits}`];
    if (cleanDigits.startsWith('91') && cleanDigits.length === 12) {
      phoneVariations.push(cleanDigits.slice(2));
    } else if (cleanDigits.length === 10) {
      phoneVariations.push(`+91${cleanDigits}`, `91${cleanDigits}`);
    }

    const existingPhone = await Customer.findOne({
      where: {
        phone: { [Op.in]: phoneVariations }
      }
    });
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'This phone number is already registered' });
    }

    // Fetch site loyalty settings for signup bonus points
    let initialPoints = 0;
    try {
      const siteSetting = await SiteSetting.findOne({ where: { key: 'loyalty' } });
      let loyaltySettings = { signupPointsEnabled: true, signupPoints: 50 };
      if (siteSetting && siteSetting.value) {
        loyaltySettings = { ...loyaltySettings, ...JSON.parse(siteSetting.value) };
      }
      if (loyaltySettings.signupPointsEnabled !== false && Number(loyaltySettings.signupPoints || 0) > 0) {
        initialPoints = Number(loyaltySettings.signupPoints);
      }
    } catch (e) {
      initialPoints = 0;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const referralCode = uuidv4().slice(0, 8).toUpperCase();

    const customer = await Customer.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      phone: cleanPhone,
      referralCode,
      loyaltyPoints: initialPoints,
      isActive: true,
    });

    if (initialPoints > 0) {
      try {
        await LoyaltyLedger.create({
          customerId: customer.id,
          type: 'BONUS',
          points: initialPoints,
          balance: initialPoints,
          description: 'Welcome Registration Bonus Points',
        });
      } catch (ledgerErr) {
        console.warn('[MobAuth Register] Failed to create loyalty ledger entry:', ledgerErr.message);
      }
    }

    // 10-Year Access Token with embedded customer details & cart count
    const tokenPayload = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      loyaltyPoints: customer.loyaltyPoints || 0,
      cartCount: 0,
    };

    const token = signMobileToken(tokenPayload);

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      token,
    });
  } catch (err) {
    console.error('[MobAuth Register] Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error during registration' });
  }
};

/**
 * 2. Customer Login
 * POST /mob-api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    const cleanEmail = email.trim().toLowerCase();
    const customer = await Customer.findOne({ where: { email: cleanEmail } });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'No account found with this email address' });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    if (!customer.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact customer support.' });
    }

    // Calculate customer's cart item count
    let cartCount = 0;
    const cart = await Cart.findOne({
      where: { customerId: customer.id },
      attributes: ['id'],
    });
    if (cart) {
      cartCount = await CartItem.count({ where: { cartId: cart.id } });
    }

    // 10-Year Access Token with embedded customer details & cart count
    const tokenPayload = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      loyaltyPoints: customer.loyaltyPoints || 0,
      cartCount,
    };

    const token = signMobileToken(tokenPayload);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
    });
  } catch (err) {
    console.error('[MobAuth Login] Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error during login' });
  }
};

/**
 * 3. Forgot Password (Send OTP)
 * POST /mob-api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    const cleanEmail = email.trim().toLowerCase();
    const customer = await Customer.findOne({ where: { email: cleanEmail } });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'No account found with this email address' });
    }

    if (!customer.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact support.' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await customer.update({
      passwordResetToken: hashedOtp,
      passwordResetExpiry: expiry,
    });

    try {
      await sendOtpEmail(customer.email, customer.name, otp);
    } catch (emailErr) {
      console.error('[MobAuth ForgotPassword] Email delivery failed:', emailErr.message);
      // Clean up token so user can retry cleanly
      await customer.update({ passwordResetToken: null, passwordResetExpiry: null });
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
    }

    console.log(`[MobAuth ForgotPassword] OTP generated for ${cleanEmail}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'A 6-digit verification code has been sent to your email',
    });
  } catch (err) {
    console.error('[MobAuth ForgotPassword] Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error during forgot password' });
  }
};

/**
 * 4. Verify OTP
 * POST /mob-api/auth/verify-otp
 */
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    const otpValidation = validateOtp(otp);
    if (!otpValidation.isValid) {
      return res.status(400).json({ success: false, message: otpValidation.message });
    }

    const cleanEmail = email.trim().toLowerCase();
    const customer = await Customer.findOne({ where: { email: cleanEmail } });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'No account found with this email address' });
    }

    if (!customer.passwordResetToken || !customer.passwordResetExpiry) {
      return res.status(400).json({ 
        success: false, 
        message: 'No active OTP request found or code was already used. Please request a new OTP.' 
      });
    }

    // Check expiry
    if (new Date() > new Date(customer.passwordResetExpiry)) {
      await customer.update({ passwordResetToken: null, passwordResetExpiry: null });
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    // Compare SHA-256 hash
    const inputHash = crypto.createHash('sha256').update(otp.toString().trim()).digest('hex');
    if (inputHash !== customer.passwordResetToken) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please check the code and try again.' });
    }

    // Clear OTP (one-time use)
    await customer.update({ passwordResetToken: null, passwordResetExpiry: null });

    // Issue short-lived reset token (valid for 10 minutes)
    const resetToken = signResetToken({ id: customer.id });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken,
    });
  } catch (err) {
    console.error('[MobAuth VerifyOtp] Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error during OTP verification' });
  }
};

/**
 * 5. Reset Password / New Password
 * POST /mob-api/auth/new-password
 * POST /mob-api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, password } = req.body || {};
    const finalPassword = newPassword || password;

    if (!resetToken || typeof resetToken !== 'string') {
      return res.status(400).json({ success: false, message: 'Reset token is required' });
    }

    const passwordValidation = validatePassword(finalPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    let decoded;
    try {
      decoded = verifyResetToken(resetToken);
    } catch (tokenErr) {
      return res.status(401).json({ 
        success: false, 
        message: 'Password reset session has expired or is invalid. Please restart the process.' 
      });
    }

    const customer = await Customer.findByPk(decoded.id);
    if (!customer || !customer.isActive) {
      return res.status(404).json({ success: false, message: 'Account not found or deactivated' });
    }

    const hashedPassword = await bcrypt.hash(finalPassword, 12);
    await customer.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been updated successfully. You can now login.',
    });
  } catch (err) {
    console.error('[MobAuth ResetPassword] Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error during password reset' });
  }
};

/**
 * 6. Get Current User & Cart Count
 * GET /mob-api/auth/getme
 * GET /mob-api/auth/me
 * Protected Route (Requires Bearer token)
 */
const getMe = async (req, res) => {
  try {
    if (!req.customer || !req.customer.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login again.' });
    }

    const customerId = req.customer.id;

    // Fetch fresh customer details
    const customer = await Customer.findOne({
      where: { id: customerId, isActive: true },
      attributes: [
        'id',
        'name',
        'email',
        'phone',
        'loyaltyPoints',
        'preferredCurrency',
        'createdAt',
      ],
    });

    if (!customer) {
      return res.status(401).json({ success: false, message: 'Account is deactivated or not found' });
    }

    // Fetch cart count (only item count)
    let cartCount = 0;
    const cart = await Cart.findOne({
      where: { customerId },
      attributes: ['id'],
    });

    if (cart) {
      cartCount = await CartItem.count({ where: { cartId: cart.id } });
    }

    return res.status(200).json({
      success: true,
      customer,
      cartCount,
    });
  } catch (err) {
    console.error('[MobAuth GetMe] Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error fetching user profile' });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getMe,
};
