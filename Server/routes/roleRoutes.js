'use strict';
const express = require('express');
const router = express.Router();
const { Role, AdminUser } = require('../models');
const { verifyAdmin } = require('../middleware/auth');

const DEFAULT_MODULES = [
  { key: 'products', name: 'Products & Catalog' },
  { key: 'orders', name: 'Orders & Shipping' },
  { key: 'customers', name: 'Customers & CRM' },
  { key: 'coupons', name: 'Coupons & Marketing' },
  { key: 'inventory', name: 'Inventory & Warehouses' },
  { key: 'reports', name: 'Reports & Analytics' },
  { key: 'settings', name: 'Settings & Security' },
  { key: 'gift_services', name: 'Gift Services' },
  { key: 'affiliates', name: 'Affiliates & Marketing' },
  { key: 'loyalty', name: 'Loyalty & Rewards' },
  { key: 'vendors', name: 'Vendors & Suppliers' },
  { key: 'warehouses', name: 'Warehouse Management' }
];

const createFullCrudPermissions = () => {
  const perm = {};
  DEFAULT_MODULES.forEach(mod => {
    perm[mod.key] = { create: true, read: true, update: true, delete: true };
  });
  return perm;
};

// GET /api/roles - Fetch all roles and permissions
router.get('/', verifyAdmin, async (req, res) => {
  try {
    let roles = await Role.findAll({ order: [['id', 'ASC']] });
    
    // Seed default roles if table is empty
    if (roles.length === 0) {
      const fullCrud = createFullCrudPermissions();
      const defaultRoles = [
        { name: 'Super Admin', description: 'Full un-lockable CRUD access to all modules', permissions: fullCrud },
        { name: 'Store Admin', description: 'Full access to Products, Orders, Coupons, and Inventory', permissions: {
          products: { create: true, read: true, update: true, delete: true },
          orders: { create: true, read: true, update: true, delete: true },
          customers: { create: true, read: true, update: true, delete: false },
          coupons: { create: true, read: true, update: true, delete: true },
          inventory: { create: true, read: true, update: true, delete: false },
          reports: { create: false, read: true, update: false, delete: false },
          settings: { create: false, read: true, update: true, delete: false },
        }},
        { name: 'Inventory Manager', description: 'Manage Stock, Warehouses, and Products', permissions: {
          products: { create: true, read: true, update: true, delete: false },
          orders: { create: false, read: true, update: true, delete: false },
          inventory: { create: true, read: true, update: true, delete: true },
          warehouses: { create: true, read: true, update: true, delete: true },
        }},
        { name: 'Support Agent', description: 'Customer service, Orders inspection, and Ticket resolution', permissions: {
          orders: { create: false, read: true, update: true, delete: false },
          customers: { create: false, read: true, update: true, delete: false },
          products: { create: false, read: true, update: false, delete: false },
        }}
      ];
      roles = await Role.bulkCreate(defaultRoles);
    }

    res.json({ success: true, roles, modules: DEFAULT_MODULES });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/roles - Create custom role
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const existing = await Role.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Role with this name already exists' });
    }

    const role = await Role.create({
      name: name.trim(),
      description: description || '',
      permissions: permissions || createFullCrudPermissions()
    });

    res.status(201).json({ success: true, role, message: 'Role created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/roles/:id - Update role permissions
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const { name, description, permissions } = req.body;
    await role.update({
      name: name ? name.trim() : role.name,
      description: description !== undefined ? description : role.description,
      permissions: permissions || role.permissions
    });

    res.json({ success: true, role, message: `Permissions updated for ${role.name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/roles/:id - Delete custom role
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.name === 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete Super Admin system role' });
    }

    await role.destroy();
    res.json({ success: true, message: `Role ${role.name} deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
