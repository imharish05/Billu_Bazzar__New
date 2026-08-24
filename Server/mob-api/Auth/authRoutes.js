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
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { success: false, message: 'Too many OTP requests. Please try again in 15 minutes.' },
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { success: false, message: 'Too many reset attempts. Please try again in 1 hour.' },
});

// ── Public Unprotected Endpoints ──────────────────────────────────────────────

/**
 * POST /mob-api/auth/register
 */
router.post('/register', authLimiter, (req, res, next) => {
  /*
    #swagger.tags = ['Auth & Security']
    #swagger.summary = 'Mobile Customer Registration'
    #swagger.description = 'Registers a new customer, enforces unique email and phone number, awards loyalty bonus points, and returns a 10-year access token.'
    #swagger.autoHeaders = false
    #swagger.parameters = []
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["name", "email", "password", "phone"],
            properties: {
              name: { type: "string", example: "Nantha Kumar" },
              email: { type: "string", example: "nantha@example.com" },
              password: { type: "string", example: "Password123!" },
              phone: { type: "string", example: "+919876543210" }
            }
          }
        }
      }
    }
    #swagger.responses[201] = {
      description: "Registration successful",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Customer registered successfully" },
              token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
            }
          }
        }
      }
    }
    #swagger.responses[400] = {
      description: "Validation failure",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "Please enter a valid email address" }
            }
          }
        }
      }
    }
    #swagger.responses[409] = {
      description: "Email or Phone already registered",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "This phone number is already registered" }
            }
          }
        }
      }
    }
  */
  return register(req, res, next);
});

/**
 * POST /mob-api/auth/login
 */
router.post('/login', authLimiter, (req, res, next) => {
  /*
    #swagger.tags = ['Auth & Security']
    #swagger.summary = 'Mobile Customer Login'
    #swagger.description = 'Authenticates customer by email and password and returns a 10-year access token containing embedded customer data and cart count.'
    #swagger.autoHeaders = false
    #swagger.parameters = []
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", example: "nantha@example.com" },
              password: { type: "string", example: "Password123!" }
            }
          }
        }
      }
    }
    #swagger.responses[200] = {
      description: "Login successful",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Login successful" },
              token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
            }
          }
        }
      }
    }
    #swagger.responses[400] = {
      description: "Missing or invalid email/password",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "Email and password are required" }
            }
          }
        }
      }
    }
    #swagger.responses[401] = {
      description: "Incorrect password",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "Incorrect password" }
            }
          }
        }
      }
    }
    #swagger.responses[404] = {
      description: "Account not found",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "No account found with this email address" }
            }
          }
        }
      }
    }
  */
  return login(req, res, next);
});

/**
 * POST /mob-api/auth/forgot-password
 */
router.post('/forgot-password', otpLimiter, (req, res, next) => {
  /*
    #swagger.tags = ['Auth & Security']
    #swagger.summary = 'Mobile Forgot Password'
    #swagger.description = 'Generates a 6-digit OTP code with 10-minute expiry and sends it to the customer email address.'
    #swagger.autoHeaders = false
    #swagger.parameters = []
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["email"],
            properties: {
              email: { type: "string", example: "nantha@example.com" }
            }
          }
        }
      }
    }
    #swagger.responses[200] = {
      description: "OTP sent successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "A 6-digit verification code has been sent to your email" }
            }
          }
        }
      }
    }
    #swagger.responses[404] = {
      description: "Email not found",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "No account found with this email address" }
            }
          }
        }
      }
    }
  */
  return forgotPassword(req, res, next);
});

/**
 * POST /mob-api/auth/verify-otp
 */
router.post('/verify-otp', otpLimiter, (req, res, next) => {
  /*
    #swagger.tags = ['Auth & Security']
    #swagger.summary = 'Mobile Verify OTP'
    #swagger.description = 'Verifies the 6-digit OTP code against the hashed token and issues a short-lived resetToken for setting a new password.'
    #swagger.autoHeaders = false
    #swagger.parameters = []
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["email", "otp"],
            properties: {
              email: { type: "string", example: "nantha@example.com" },
              otp: { type: "string", example: "492817" }
            }
          }
        }
      }
    }
    #swagger.responses[200] = {
      description: "OTP verified successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "OTP verified successfully" },
              resetToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
            }
          }
        }
      }
    }
    #swagger.responses[400] = {
      description: "Invalid or expired OTP",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "Invalid OTP. Please check the code and try again." }
            }
          }
        }
      }
    }
  */
  return verifyOtp(req, res, next);
});

/**
 * POST /mob-api/auth/new-password
 */
router.post('/new-password', resetLimiter, (req, res, next) => {
  /*
    #swagger.tags = ['Auth & Security']
    #swagger.summary = 'Mobile Set New Password'
    #swagger.description = 'Updates customer password using the verified resetToken.'
    #swagger.autoHeaders = false
    #swagger.parameters = []
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["resetToken", "newPassword"],
            properties: {
              resetToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
              newPassword: { type: "string", example: "NewSecurePassword123!" }
            }
          }
        }
      }
    }
    #swagger.responses[200] = {
      description: "Password updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Password has been updated successfully. You can now login." }
            }
          }
        }
      }
    }
    #swagger.responses[401] = {
      description: "Invalid or expired reset session",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "Password reset session has expired or is invalid. Please restart the process." }
            }
          }
        }
      }
    }
  */
  return resetPassword(req, res, next);
});

// ── Protected Endpoints ───────────────────────────────────────────────────────

/**
 * GET /mob-api/auth/getme
 */
router.get('/getme', verifyCustomer, (req, res, next) => {
  /*
    #swagger.tags = ['Auth & Security']
    #swagger.summary = 'Get Mobile Customer Profile & Cart Count'
    #swagger.description = 'Returns fresh customer basic profile details along with only the cart item count (cartCount).'
    #swagger.autoHeaders = false
    #swagger.parameters = []
    #swagger.security = [{
      "bearerAuth": []
    }]
    #swagger.responses[200] = {
      description: "Customer profile and cart count",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              customer: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 8 },
                  name: { type: "string", example: "Nantha Kumar" },
                  email: { type: "string", example: "nantha@example.com" },
                  phone: { type: "string", example: "+919876543210" },
                  loyaltyPoints: { type: "integer", example: 50 },
                  preferredCurrency: { type: "string", example: "INR" },
                  createdAt: { type: "string", example: "2026-08-22T09:38:04.000Z" }
                }
              },
              cartCount: { type: "integer", example: 2 }
            }
          }
        }
      }
    }
    #swagger.responses[401] = {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "No token provided" }
            }
          }
        }
      }
    }
  */
  return getMe(req, res, next);
});

module.exports = router;
