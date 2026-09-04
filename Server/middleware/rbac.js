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
  if (parsedPerms[permissionKey] === true || parsedPerms[permissionKey] === 'true') {
    return next();
  }

  // 2. Comprehensive Module & Role Mapping Aliases
  const keyMap = {
    // Categories & Structure
    view_categories: ['view_products', 'add_product', 'categories.read', 'categories.create', 'categories.update'],
    add_category: ['categories.create'],
    edit_category: ['add_category', 'categories.update'],
    delete_category: ['categories.delete'],
    view_sub_categories: ['view_categories', 'view_products', 'add_product', 'categories.read', 'sub_categories.read'],
    add_sub_category: ['add_category', 'categories.create', 'sub_categories.create'],
    edit_sub_category: ['add_category', 'categories.update', 'sub_categories.update'],
    delete_sub_category: ['delete_category', 'categories.delete', 'sub_categories.delete'],
    view_sub_sub_categories: ['view_categories', 'view_products', 'add_product', 'categories.read'],
    add_sub_sub_category: ['add_category', 'categories.create'],
    edit_sub_sub_category: ['add_category', 'categories.update'],
    delete_sub_sub_category: ['delete_category', 'categories.delete'],

    // Products & Catalog
    view_products: ['products.read', 'products.create', 'products.update', 'products.delete'],
    add_product: ['products.create'],
    edit_product: ['add_product', 'products.update'],
    delete_product: ['products.delete'],
    view_variants: ['view_products', 'variants.read', 'products.read'],
    add_variant: ['add_product', 'variants.create', 'products.create'],
    edit_variant: ['add_product', 'variants.update', 'products.update'],
    delete_variant: ['delete_product', 'variants.delete', 'products.delete'],
    view_reviews: ['view_products', 'reviews.read', 'products.read'],
    delete_review: ['delete_product', 'reviews.delete', 'products.delete'],
    view_stock_alerts: ['view_products', 'manage_operations', 'stock_alerts.read', 'products.read'],

    // Orders & Carts
    view_orders: ['orders.read', 'orders.update'],
    update_orders: ['view_orders', 'orders.update'],
    cancel_orders: ['update_orders', 'orders.delete'],
    view_abandoned_carts: ['view_orders', 'orders.read', 'abandoned_carts.read'],
    delete_abandoned_cart: ['cancel_orders', 'orders.delete', 'abandoned_carts.delete'],

    // Marketing & Promotions
    view_marketing: ['view_coupons', 'view_banners', 'view_slider_messages', 'view_gift_services', 'manage_affiliates', 'manage_loyalty'],
    manage_marketing: ['view_marketing', 'add_coupon', 'edit_coupon', 'delete_coupon', 'add_banner', 'delete_banner', 'add_slider_message', 'delete_slider_message'],
    view_coupons: ['view_marketing', 'coupons.read', 'coupons.create', 'coupons.update'],
    add_coupon: ['manage_marketing', 'coupons.create'],
    edit_coupon: ['manage_marketing', 'coupons.update'],
    delete_coupon: ['manage_marketing', 'coupons.delete'],
    view_banners: ['view_marketing', 'banners.read'],
    add_banner: ['manage_marketing', 'banners.create'],
    delete_banner: ['manage_marketing', 'banners.delete'],
    view_slider_messages: ['view_marketing', 'slider_messages.read', 'banners.read'],
    add_slider_message: ['manage_marketing', 'slider_messages.create', 'banners.create'],
    delete_slider_message: ['manage_marketing', 'slider_messages.delete', 'banners.delete'],
    view_gift_services: ['view_marketing', 'manage_marketing', 'gift_services.read', 'marketing.read'],
    manage_affiliates: ['view_marketing', 'manage_marketing', 'affiliates.manage'],
    manage_loyalty: ['view_marketing', 'manage_marketing', 'loyalty.manage', 'marketing.update'],
    view_loyalty: ['view_marketing', 'loyalty.manage', 'marketing.read'],

    // Operations & Logistics
    view_operations: ['view_vendors', 'view_warehouses', 'view_delivery_zones'],
    manage_operations: ['view_operations', 'add_vendor', 'edit_vendor', 'delete_vendor', 'add_warehouse', 'edit_warehouse', 'delete_warehouse', 'add_delivery_zone', 'edit_delivery_zone', 'delete_delivery_zone'],
    view_vendors: ['view_operations', 'vendors.read', 'vendors.create'],
    add_vendor: ['manage_operations', 'vendors.create'],
    edit_vendor: ['manage_operations', 'vendors.update'],
    delete_vendor: ['manage_operations', 'vendors.delete'],
    view_warehouses: ['view_operations', 'warehouses.read', 'inventory.read'],
    add_warehouse: ['manage_operations', 'warehouses.create', 'inventory.create'],
    edit_warehouse: ['manage_operations', 'warehouses.update', 'inventory.update'],
    delete_warehouse: ['manage_operations', 'warehouses.delete', 'inventory.delete'],
    view_delivery_zones: ['view_operations', 'delivery_zones.read', 'warehouses.read'],
    add_delivery_zone: ['manage_operations', 'delivery_zones.create', 'warehouses.create'],
    edit_delivery_zone: ['manage_operations', 'delivery_zones.update', 'warehouses.update'],
    delete_delivery_zone: ['manage_operations', 'delivery_zones.delete', 'warehouses.delete'],

    // Customers & Support
    view_customers: ['customers.read'],
    manage_customers: ['view_customers', 'edit_customer', 'delete_customer', 'delete_contact_enquiry'],
    edit_customer: ['manage_customers', 'customers.update'],
    delete_customer: ['manage_customers', 'customers.delete'],
    view_contact_enquiries: ['view_customers', 'manage_customers', 'enquiries.read', 'customers.read'],
    delete_contact_enquiry: ['manage_customers', 'enquiries.delete', 'customers.delete'],
    view_personal_shopper: ['view_customers', 'manage_customers', 'personal_shopper.read', 'customers.read'],
    delete_personal_shopper: ['manage_customers', 'personal_shopper.delete', 'customers.delete'],

    // Finance & Analytics
    view_finance: ['view_payments', 'view_reports'],
    manage_finance: ['view_finance', 'refund_payment', 'export_reports'],
    view_payments: ['view_finance', 'payments.read'],
    refund_payment: ['manage_finance', 'payments.refund'],
    view_reports: ['view_finance', 'reports.read'],
    export_reports: ['manage_finance', 'reports.export'],

    // Settings & Access Control
    view_settings: ['view_site_settings', 'view_system_settings', 'view_admin_users'],
    manage_settings: ['view_settings', 'edit_site_settings', 'edit_system_settings', 'manage_roles', 'manage_admin_users'],
    view_site_settings: ['view_settings', 'settings.read'],
    edit_site_settings: ['manage_settings', 'settings.update', 'settings.edit', 'settings.create'],
    view_system_settings: ['view_settings', 'settings.read'],
    edit_system_settings: ['manage_settings', 'settings.update'],
    manage_roles: ['manage_settings', 'settings.update', 'settings.read'],
    manage_admin_users: ['manage_settings', 'settings.update', 'settings.read'],
    view_admin_users: ['view_settings', 'manage_settings', 'settings.read'],
  };

  const aliases = keyMap[permissionKey] || [];
  for (const alias of aliases) {
    // Check direct boolean key match (e.g. parsedPerms.view_marketing === true)
    if (parsedPerms[alias] === true || parsedPerms[alias] === 'true') {
      return next();
    }
    // Check nested modular permission match (e.g. parsedPerms.products?.read === true)
    if (alias.includes('.')) {
      const [mod, act] = alias.split('.');
      if (parsedPerms[mod] && typeof parsedPerms[mod] === 'object' && (parsedPerms[mod][act] === true || parsedPerms[mod][act] === 'true')) {
        return next();
      }
    }
  }

  return res.status(403).json({
    success: false,
    message: `Access Denied: You do not have permission '${permissionKey}'`
  });
};

module.exports = { requireRole, hasPermission };
