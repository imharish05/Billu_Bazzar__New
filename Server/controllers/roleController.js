'use strict';
const { Role, AdminUser } = require('../models');

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

/**
 * GET /api/roles - Fetch all roles and permissions
 */
const getAllRoles = async (req, res) => {
  try {
    let roles = await Role.findAll({ order: [['id', 'ASC']] });

    // Seed default roles if table is empty
    if (roles.length === 0) {
      const fullCrud = createFullCrudPermissions();
      const defaultRoles = [
        { name: 'Super Admin', permissions: fullCrud },
      ];
      roles = await Role.bulkCreate(defaultRoles);
    }

    res.json({ success: true, roles, modules: DEFAULT_MODULES });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/roles/:id - Fetch single role by ID
 */
const getRoleById = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    res.json({ success: true, role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/roles - Create custom role
 */
const createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const trimmedName = name ? name.trim() : '';

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    // Case-insensitive uniqueness check
    const existing = await Role.findOne({
      where: Role.sequelize.where(
        Role.sequelize.fn('LOWER', Role.sequelize.col('name')),
        trimmedName.toLowerCase()
      )
    }).catch(() => null);

    if (existing) {
      return res.status(400).json({ success: false, message: `Role "${trimmedName}" already exists` });
    }

    const formattedPermissions = (typeof permissions === 'object' && permissions !== null)
      ? permissions
      : {};

    const role = await Role.create({
      name: trimmedName,
      permissions: formattedPermissions
    });

    res.status(201).json({ success: true, role, message: 'Role created successfully' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError' || err.name === 'SequelizeValidationError') {
      const errMsg = err.errors && err.errors[0] ? err.errors[0].message : 'Role name must be unique';
      return res.status(400).json({ success: false, message: errMsg });
    }
    res.status(500).json({ success: false, message: err.message || 'Failed to create role' });
  }
};

/**
 * PUT /api/roles/:id - Update role permissions
 */
const updateRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const { name, permissions } = req.body;
    const updateData = {};
    if (name && name.trim()) {
      const trimmedName = name.trim();
      const existing = await Role.findOne({
        where: {
          [Role.sequelize.Sequelize.Op.and]: [
            Role.sequelize.where(
              Role.sequelize.fn('LOWER', Role.sequelize.col('name')),
              trimmedName.toLowerCase()
            ),
            { id: { [Role.sequelize.Sequelize.Op.ne]: req.params.id } }
          ]
        }
      }).catch(() => null);

      if (existing) {
        return res.status(400).json({ success: false, message: `Another role named "${trimmedName}" already exists` });
      }
      updateData.name = trimmedName;
    }

    if (permissions !== undefined) {
      updateData.permissions = permissions;
    }

    await role.update(updateData);

    res.json({ success: true, role, message: 'Role updated successfully' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError' || err.name === 'SequelizeValidationError') {
      const errMsg = err.errors && err.errors[0] ? err.errors[0].message : 'Role name must be unique';
      return res.status(400).json({ success: false, message: errMsg });
    }
    res.status(500).json({ success: false, message: err.message || 'Failed to update role' });
  }
};

/**
 * DELETE /api/roles/:id - Delete custom role and all assigned admin users
 */
const deleteRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.name === 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete Super Admin system role' });
    }

    // Cascade delete all admin users assigned to this role
    let deletedUsersCount = 0;
    if (AdminUser) {
      deletedUsersCount = await AdminUser.destroy({ where: { roleId: role.id } }).catch(() => 0);
    }

    await role.destroy();
    res.json({ 
      success: true, 
      message: `Role "${role.name}" and ${deletedUsersCount} assigned admin user(s) deleted successfully` 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/roles/modules - Fetch system module definitions
 */
const getModules = async (req, res) => {
  res.json({ success: true, modules: DEFAULT_MODULES });
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getModules,
  DEFAULT_MODULES,
};
