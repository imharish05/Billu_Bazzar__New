'use strict';

/**
 * requireRole — require specific role name(s)
 */
const requireRole = (roles = []) => (req, res, next) => {
  if (!req.admin) return res.status(401).json({ success: false, message: 'Not authenticated' });
  
  // Super Admin always bypasses role checks
  if (req.admin.role?.name === 'Super Admin' || req.admin.role?.name === 'ADMIN') return next();
  
  if (!roles.includes(req.admin.role?.name))
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  next();
};

/**
 * hasPermission — Spatie-style granular CRUD permission check
 * Usage: router.delete('/products/:id', verifyAdmin, hasPermission('products', 'delete'), deleteProduct);
 */
const hasPermission = (moduleKey, action = 'view') => (req, res, next) => {
  if (!req.admin) return res.status(401).json({ success: false, message: 'Not authenticated' });

  const roleName = req.admin.role?.name;
  
  // Super Admin bypasses all permission checks
  if (roleName === 'Super Admin' || roleName === 'ADMIN') return next();

  const permissions = req.admin.role?.permissions || {};
  const modulePerms = permissions[moduleKey];

  if (!modulePerms) {
    return res.status(403).json({ success: false, message: `Access Denied: No permissions configured for module '${moduleKey}'` });
  }

  // Check if specific action (view, create, update, delete) is enabled
  const isAllowed = Boolean(modulePerms[action]);

  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      message: `Access Denied: You do not have '${action.toUpperCase()}' permission for '${moduleKey}'`
    });
  }

  next();
};

module.exports = { requireRole, hasPermission };
