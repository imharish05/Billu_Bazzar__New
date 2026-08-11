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

  // 2. Module alias fallback (e.g. products.read, products.create)
  const keyMap = {
    view_products: ['products.read', 'products.create', 'products.update', 'products.delete'],
    add_product: ['products.create'],
    edit_product: ['products.update'],
    delete_product: ['products.delete'],
    view_variants: ['variants.read', 'products.read'],
    add_variant: ['variants.create', 'products.create'],
    edit_variant: ['variants.update', 'products.update'],
    delete_variant: ['variants.delete', 'products.delete'],
    view_orders: ['orders.read', 'orders.update'],
    update_orders: ['orders.update'],
    cancel_orders: ['orders.delete'],
    view_abandoned_carts: ['orders.read', 'abandoned_carts.read'],
    delete_abandoned_cart: ['orders.delete', 'abandoned_carts.delete'],
    view_categories: ['categories.read', 'categories.create', 'categories.update'],
    add_category: ['categories.create'],
    edit_category: ['categories.update'],
    delete_category: ['categories.delete'],
    view_sub_categories: ['categories.read', 'sub_categories.read'],
    add_sub_category: ['categories.create', 'sub_categories.create'],
    edit_sub_category: ['categories.update', 'sub_categories.update'],
    delete_sub_category: ['categories.delete', 'sub_categories.delete'],
    view_sub_sub_categories: ['categories.read'],
    add_sub_sub_category: ['categories.create'],
    edit_sub_sub_category: ['categories.update'],
    delete_sub_sub_category: ['categories.delete'],
    view_coupons: ['coupons.read', 'coupons.create', 'coupons.update'],
    add_coupon: ['coupons.create'],
    edit_coupon: ['coupons.update'],
    delete_coupon: ['coupons.delete'],
    view_banners: ['banners.read'],
    add_banner: ['banners.create'],
    delete_banner: ['banners.delete'],
    view_slider_messages: ['slider_messages.read', 'banners.read'],
    add_slider_message: ['slider_messages.create', 'banners.create'],
    delete_slider_message: ['slider_messages.delete', 'banners.delete'],
    view_vendors: ['vendors.read', 'vendors.create'],
    add_vendor: ['vendors.create'],
    edit_vendor: ['vendors.update'],
    delete_vendor: ['vendors.delete'],
    view_warehouses: ['warehouses.read', 'inventory.read'],
    add_warehouse: ['warehouses.create', 'inventory.create'],
    edit_warehouse: ['warehouses.update', 'inventory.update'],
    delete_warehouse: ['warehouses.delete', 'inventory.delete'],
    view_delivery_zones: ['delivery_zones.read', 'warehouses.read'],
    add_delivery_zone: ['delivery_zones.create', 'warehouses.create'],
    edit_delivery_zone: ['delivery_zones.update', 'warehouses.update'],
    delete_delivery_zone: ['delivery_zones.delete', 'warehouses.delete'],
    view_customers: ['customers.read'],
    edit_customer: ['customers.update'],
    delete_customer: ['customers.delete'],
    view_reports: ['reports.read'],
    manage_roles: ['settings.update', 'settings.read'],
    manage_admin_users: ['settings.update', 'settings.read'],
  };

  const aliases = keyMap[permKey] || [];
  for (const alias of aliases) {
    const [mod, act] = alias.split('.');
    if (parsedPerms[mod] && typeof parsedPerms[mod] === 'object' && parsedPerms[mod][act] === true) {
      return true;
    }
  }

  return false;
};
