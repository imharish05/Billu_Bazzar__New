'use strict';
const { verifyToken } = require('../config/jwt');
const { Customer, AdminUser } = require('../models');

/**
 * verifyCustomer — validates JWT from Authorization header for customer routes
 */
const verifyCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'No token provided' });

    const token = authHeader.split(' ')[1]?.trim();
    if (!token)
      return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = verifyToken(token);
    if (decoded.type && decoded.type !== 'CUSTOMER') {
      return res.status(401).json({ success: false, message: 'Invalid token for customer access' });
    }

    const customer = await Customer.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
    if (!customer || !customer.isActive)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    req.customer = customer;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * verifyAdmin — validates JWT for admin routes (Strictly no bypass fallbacks)
 */
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      return res.status(401).json({ success: false, message: 'Admin token missing' });
    }

    const decoded = verifyToken(token);
    if (decoded.type && decoded.type !== 'ADMIN') {
      return res.status(401).json({ success: false, message: 'Access denied: Not an administrator token' });
    }

    const admin = await AdminUser.findByPk(decoded.id, { 
      include: [{ association: 'role' }],
      attributes: { exclude: ['password'] }
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Unauthorized or inactive admin account' });
    }

    if (!admin.role) {
      admin.role = { name: 'Super Admin', permissions: { all: true } };
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
  }
};

const optionalCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]?.trim();
      if (token) {
        const decoded = verifyToken(token);
        if (!decoded.type || decoded.type === 'CUSTOMER') {
          const customer = await Customer.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
          if (customer && customer.isActive) {
            req.customer = customer;
          }
        }
      }
    }
    next();
  } catch (err) {
    next();
  }
};

const optionalAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]?.trim();
      if (token) {
        const decoded = verifyToken(token);
        if (!decoded.type || decoded.type === 'ADMIN') {
          const admin = await AdminUser.findByPk(decoded.id, {
            include: [{ association: 'role' }],
            attributes: { exclude: ['password'] }
          });
          if (admin && admin.isActive) {
            req.admin = admin;
          }
        }
      }
    }
    next();
  } catch (err) {
    next();
  }
};

module.exports = { verifyCustomer, verifyAdmin, optionalCustomer, optionalAdmin };

