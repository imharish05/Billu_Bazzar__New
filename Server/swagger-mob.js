'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 5000;
const defaultHost = `http://localhost:${port}`;
const serverUrl = process.env.API_URL || process.env.SWAGGER_HOST || defaultHost;

const swaggerMobDoc = {
  openapi: '3.0.0',
  info: {
    title: 'Billu Bazaar Mobile API Documentation',
    description: 'Dedicated OpenAPI 3.0 Swagger specification for Billu Bazaar Mobile Application endpoints.',
    version: '1.0.0',
    contact: {
      name: 'Billu Bazaar Mobile API Team',
      email: process.env.ADMIN_EMAIL || 'support@billubazaar.com'
    }
  },
  servers: [
    {
      url: '/',
      description: 'Current Domain / Relative Path (Recommended for Live HTTPS)'
    },
    {
      url: serverUrl,
      description: 'Environment API Server'
    },
    {
      url: `http://localhost:${port}`,
      description: 'Local Development Server'
    }
  ],
  tags: [
    {
      name: 'Auth & Security',
      description: 'Mobile Customer Authentication, 10-year Token, OTP Verification, and Profile'
    }
  ],
  paths: {
    '/mob-api/auth/register': {
      post: {
        tags: ['Auth & Security'],
        summary: 'Mobile Customer Registration',
        description: 'Registers a new customer account, enforces unique email and unique phone number, awards loyalty bonus points, and returns a 10-year access token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'phone'],
                properties: {
                  name: { type: 'string', example: 'Nantha Kumar' },
                  email: { type: 'string', example: 'nantha@example.com' },
                  password: { type: 'string', example: 'Password123!' },
                  phone: { type: 'string', example: '+919876543210' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Customer registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Customer registered successfully' },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Validation failure (missing field / invalid email / weak password / invalid phone)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Please enter a valid email address' }
                  }
                }
              }
            }
          },
          '409': {
            description: 'Conflict — Email or Phone number already registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'This phone number is already registered' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/mob-api/auth/login': {
      post: {
        tags: ['Auth & Security'],
        summary: 'Mobile Customer Login',
        description: 'Authenticates customer by email and password, returning a 10-year access token embedded with customer profile and cartCount.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'nantha@example.com' },
                  password: { type: 'string', example: 'Password123!' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Missing or invalid email/password format',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Email and password are required' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Incorrect password',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Incorrect password' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'No account found with this email address',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'No account found with this email address' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Account deactivated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Your account has been deactivated. Please contact customer support.' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/mob-api/auth/forgot-password': {
      post: {
        tags: ['Auth & Security'],
        summary: 'Mobile Forgot Password (Send OTP)',
        description: 'Generates a 6-digit OTP code valid for 10 minutes and emails it to the customer.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', example: 'nantha@example.com' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OTP code emailed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'A 6-digit verification code has been sent to your email' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Missing or invalid email address',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Please enter a valid email address' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Email not registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'No account found with this email address' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/mob-api/auth/verify-otp': {
      post: {
        tags: ['Auth & Security'],
        summary: 'Mobile Verify OTP',
        description: 'Verifies the 6-digit OTP code against the hashed token and issues a short-lived resetToken for setting a new password.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'otp'],
                properties: {
                  email: { type: 'string', example: 'nantha@example.com' },
                  otp: { type: 'string', example: '492817' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OTP verified successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'OTP verified successfully' },
                    resetToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid OTP / expired OTP / no active OTP',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Invalid OTP. Please check the code and try again.' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'No account found with this email address' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/mob-api/auth/new-password': {
      post: {
        tags: ['Auth & Security'],
        summary: 'Mobile Set New Password',
        description: 'Updates customer password using the verified resetToken.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['resetToken', 'newPassword'],
                properties: {
                  resetToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                  newPassword: { type: 'string', example: 'NewSecurePassword123!' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Password updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Password has been updated successfully. You can now login.' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Missing resetToken or password too short',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Password must be at least 6 characters long' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Password reset session expired or invalid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Password reset session has expired or is invalid. Please restart the process.' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Account not found or deactivated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Account not found or deactivated' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/mob-api/auth/getme': {
      get: {
        tags: ['Auth & Security'],
        summary: 'Get Mobile Customer Profile & Cart Count',
        description: 'Returns fresh customer basic profile details along with only the cart item count (cartCount). Authenticate via Swagger Authorize button.',
        security: [
          {
            bearerAuth: []
          }
        ],
        responses: {
          '200': {
            description: 'Customer profile and cart count',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    customer: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 2 },
                        name: { type: 'string', example: 'Harish' },
                        email: { type: 'string', example: 'harish05082004@gmail.com' },
                        phone: { type: 'string', example: '+916382488167' },
                        loyaltyPoints: { type: 'integer', example: 205 },
                        preferredCurrency: { type: 'string', example: 'INR' },
                        createdAt: { type: 'string', example: '2026-08-03T11:28:44.000Z' }
                      }
                    },
                    cartCount: { type: 'integer', example: 0 }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized — No token provided or token expired',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'No token provided' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste your 10-year JWT access token (without Bearer prefix).'
      }
    }
  }
};

const outputFile = path.join(__dirname, 'swagger-mob-output.json');
fs.writeFileSync(outputFile, JSON.stringify(swaggerMobDoc, null, 2), 'utf8');
console.log(`✅ Clean Mobile Swagger documentation generated successfully into swagger-mob-output.json`);
