'use strict';

const isSuperAdminRole = (admin) => {
  if (!admin) return false;
  const role = admin.role;
  const roleName = typeof role === 'string' ? role : (role?.name || admin.roleName || '');
  const normalized = String(roleName).toLowerCase().replace(/[\s_-]/g, '');
  
  return (
    normalized === 'superadmin' ||
    normalized === 'admin' ||
    normalized === 'systemadmin' ||
    role?.permissions?.all === true ||
    admin.permissions?.all === true ||
    (typeof role?.permissions === 'string' && role.permissions.includes('"all":true'))
  );
};

/**
 * requireRole — require specific role name(s)
 */
const requireRole = (roles = []) => (req, res, next) => {
  if (!req.admin) return res.status(401).json({ success: false, message: 'Not authenticated' });
  
  // Super Admin always bypasses role checks
  if (isSuperAdminRole(req.admin)) return next();
  
  const role = req.admin.role;
  const roleName = typeof role === 'string' ? role : (role?.name || '');
  if (!roles.includes(roleName))
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  next();
};

/**
 * hasPermission — Granular permission check middleware
 * Usage: router.delete('/products/:id', verifyAdmin, hasPermission('delete_product'), deleteProduct);
 */
const hasPermission = (permissionKey) => (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  // Super Admin / System Admin bypasses all permission checks
  if (isSuperAdminRole(req.admin)) {
    return next();
  }

  const role = req.admin.role;
  const perms = role?.permissions || req.admin.permissions || {};

  // Parse JSON string permissions if stored as string
  let parsedPerms = perms;
  if (typeof perms === 'string') {
    try { parsedPerms = JSON.parse(perms); } catch (e) { parsedPerms = {}; }
  }

  // 1. Direct boolean key check (e.g. parsedPerms.view_products === true)
  if (parsedPerms[permissionKey] === true) {
    return next();
  }

  // 2. Module object mapping fallback (e.g. parsedPerms.products?.read === true)
  const keyMap = {
    view_products: ['products.read', 'products.create', 'products.update', 'products.delete'],
    add_product: ['products.create'],
    edit_product: ['products.update'],
    delete_product: ['products.delete'],
    view_orders: ['orders.read', 'orders.update'],
    update_orders: ['orders.update'],
    cancel_orders: ['orders.delete'],
    view_categories: ['categories.read', 'categories.create', 'categories.update'],
    add_category: ['categories.create'],
    edit_category: ['categories.update'],
    delete_category: ['categories.delete'],
    view_coupons: ['coupons.read', 'coupons.create', 'coupons.update'],
    add_coupon: ['coupons.create'],
    edit_coupon: ['coupons.update'],
    delete_coupon: ['coupons.delete'],
    view_vendors: ['vendors.read', 'vendors.create'],
    add_vendor: ['vendors.create'],
    edit_vendor: ['vendors.update'],
    view_warehouses: ['warehouses.read', 'inventory.read'],
    add_warehouse: ['warehouses.create', 'inventory.create'],
    edit_warehouse: ['warehouses.update', 'inventory.update'],
    view_customers: ['customers.read'],
    edit_customer: ['customers.update'],
    delete_customer: ['customers.delete'],
    view_reports: ['reports.read'],
    manage_roles: ['settings.update', 'settings.read'],
    manage_admin_users: ['settings.update', 'settings.read'],
    view_admin_users: ['settings.update', 'settings.read'],
  };

  const aliases = keyMap[permissionKey] || [];
  for (const alias of aliases) {
    const [mod, act] = alias.split('.');
    if (parsedPerms[mod] && typeof parsedPerms[mod] === 'object' && parsedPerms[mod][act] === true) {
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    message: `Access Denied: You do not have permission '${permissionKey}'`
  });
};

module.exports = { requireRole, hasPermission };
