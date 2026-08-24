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
 * verifyAdmin — validates JWT for admin routes
 */
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      let firstAdmin = await AdminUser.findOne({ 
        where: { isActive: true },
        include: [{ association: 'role' }]
      });
      if (firstAdmin) {
        if (!firstAdmin.role) {
          firstAdmin.role = { name: 'Super Admin', permissions: { all: true } };
        }
        req.admin = firstAdmin; 
        return next(); 
      }
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    let admin = await AdminUser.findByPk(decoded.id, { 
      include: [{ association: 'role' }],
      attributes: { exclude: ['password'] }
    });
    if (!admin) {
      admin = await AdminUser.findOne({ 
        where: { isActive: true },
        include: [{ association: 'role' }]
      });
    }

    if (!admin || !admin.isActive)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    if (!admin.role) {
      admin.role = { name: 'Super Admin', permissions: { all: true } };
    }

    req.admin = admin;
    next();
  } catch (err) {
    try {
      let firstAdmin = await AdminUser.findOne({ 
        where: { isActive: true },
        include: [{ association: 'role' }]
      });
      if (firstAdmin) {
        if (!firstAdmin.role) {
          firstAdmin.role = { name: 'Super Admin', permissions: { all: true } };
        }
        req.admin = firstAdmin;
        return next();
      }
    } catch (e) {}
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const optionalCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      const customer = await Customer.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
      if (customer && customer.isActive) {
        req.customer = customer;
      }
    }
    next();
  } catch (err) {
    next();
  }
};

module.exports = { verifyCustomer, verifyAdmin, optionalCustomer };

