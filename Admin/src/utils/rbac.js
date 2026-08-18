'use strict';

/**
 * checkPermission — Centralized helper to check if admin user has specific permission key
 * @param {Object} admin - Redux auth admin object
 * @param {string} permKey - Permission key e.g. 'view_products', 'add_product', 'edit_product', 'delete_product', 'update_orders', etc.
 * @returns {boolean}
 */
export const checkPermission = (admin, permKey) => {
  if (!admin) return false;
  
  let roleName = '';
  if (typeof admin.role === 'string') {
    roleName = admin.role;
  } else if (admin.role && typeof admin.role === 'object' && admin.role.name) {
    roleName = admin.role.name;
  } else if (admin.roleName) {
    roleName = admin.roleName;
  }

  const normalizedRole = String(roleName).toLowerCase().replace(/[\s_-]/g, '');

  // Super Admin / System Admin bypasses all checks
  if (
    normalizedRole === 'superadmin' || 
    normalizedRole === 'admin' || 
    normalizedRole === 'systemadmin' || 
    admin.permissions?.all === true ||
    (admin.role && typeof admin.role === 'object' && admin.role.permissions?.all === true)
  ) {
    return true;
  }

  const perms = admin.permissions || (admin.role && typeof admin.role === 'object' ? admin.role.permissions : {}) || {};
  let parsedPerms = perms;
  if (typeof perms === 'string') {
    try { parsedPerms = JSON.parse(perms); } catch (e) { parsedPerms = {}; }
  }

  // 1. Direct key check (e.g. view_products, add_product)
  if (parsedPerms[permKey] === true) {
    return true;
  }

  // 2. Generous & Simplified Module Aliases / Fallbacks
  const keyMap = {
    // Categories (Generous: also allowed if user has product view/add rights)
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
    view_reviews: ['view_products', 'reviews.read'],
    delete_review: ['delete_product', 'reviews.delete'],
    view_stock_alerts: ['view_products', 'stock_alerts.read'],

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
    view_gift_services: ['view_marketing', 'gift_services.read'],
    manage_affiliates: ['view_marketing', 'manage_marketing', 'affiliates.manage'],
    manage_loyalty: ['view_marketing', 'manage_marketing', 'loyalty.manage'],

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
    view_contact_enquiries: ['view_customers', 'enquiries.read'],
    delete_contact_enquiry: ['manage_customers', 'enquiries.delete'],
    view_personal_shopper: ['view_customers', 'personal_shopper.read'],
    delete_personal_shopper: ['manage_customers', 'personal_shopper.delete'],

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
    edit_site_settings: ['manage_settings', 'settings.update'],
    view_system_settings: ['view_settings', 'settings.read'],
    edit_system_settings: ['manage_settings', 'settings.update'],
    manage_roles: ['manage_settings', 'settings.update', 'settings.read'],
    manage_admin_users: ['manage_settings', 'settings.update', 'settings.read'],
    view_admin_users: ['view_settings', 'manage_settings', 'settings.read'],
  };

  const aliases = keyMap[permKey] || [];
  for (const alias of aliases) {
    if (parsedPerms[alias] === true) {
      return true;
    }
    if (alias.includes('.')) {
      const [mod, act] = alias.split('.');
      if (parsedPerms[mod] && typeof parsedPerms[mod] === 'object' && parsedPerms[mod][act] === true) {
        return true;
      }
    }
  }

  return false;
};

/**
 * canAccessNav — Check if admin user has access permission for a specific route path
 * @param {Object} adminObj - Redux auth admin object
 * @param {string} path - URL path e.g. '/roles', '/products', '/orders', etc.
 * @returns {boolean}
 */
export const canAccessNav = (adminObj, path) => {
  if (!adminObj) return true;
  switch (path) {
    case '/dashboard': return true;
    case '/products':
    case '/variants': return checkPermission(adminObj, 'view_products');
    case '/stock-alerts': return checkPermission(adminObj, 'view_stock_alerts');
    case '/reviews': return checkPermission(adminObj, 'view_reviews');
    case '/categories':
    case '/sub-categories':
    case '/sub-sub-categories': return checkPermission(adminObj, 'view_categories');
    case '/orders':
    case '/abandoned-carts': return checkPermission(adminObj, 'view_orders');
    case '/coupons': return checkPermission(adminObj, 'view_coupons');
    case '/banners': return checkPermission(adminObj, 'view_banners');
    case '/slider-messages': return checkPermission(adminObj, 'view_slider_messages');
    case '/vendors': return checkPermission(adminObj, 'view_vendors');
    case '/warehouses': return checkPermission(adminObj, 'view_warehouses');
    case '/delivery-zones': return checkPermission(adminObj, 'view_delivery_zones');
    case '/gift-services': return checkPermission(adminObj, 'view_gift_services');
    case '/affiliates': return checkPermission(adminObj, 'manage_affiliates');
    case '/loyalty': return checkPermission(adminObj, 'manage_loyalty');
    case '/customers': return checkPermission(adminObj, 'view_customers');
    case '/contact-enquiries': return checkPermission(adminObj, 'view_contact_enquiries');
    case '/personal-shopper': return checkPermission(adminObj, 'view_personal_shopper');
    case '/payments': return checkPermission(adminObj, 'view_payments');
    case '/reports': return checkPermission(adminObj, 'view_reports');
    case '/roles': return checkPermission(adminObj, 'manage_roles');
    case '/admin-users': return checkPermission(adminObj, 'view_admin_users');
    case '/site-settings':
    case '/settings': return checkPermission(adminObj, 'view_site_settings');
    default: return true;
  }
};

