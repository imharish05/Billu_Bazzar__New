'use strict';
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { AdminUser, Role } = require('../models');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

// GET /api/admin-users - Fetch all admin/staff users with their associated Role
router.get('/', verifyAdmin, hasPermission('manage_admin_users'), async (req, res) => {
  try {
    const users = await AdminUser.findAll({
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'permissions']
        }
      ],
      order: [['id', 'ASC']]
    });

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin-users - Create new admin/staff user
router.post('/', verifyAdmin, hasPermission('manage_admin_users'), async (req, res) => {
  try {
    const { name, email, password, roleId, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'User name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'User email is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (!roleId) {
      return res.status(400).json({ success: false, message: 'Role selection is required' });
    }

    const roleExists = await Role.findByPk(roleId);
    if (!roleExists) {
      return res.status(400).json({ success: false, message: 'Selected role does not exist' });
    }

    const existing = await AdminUser.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An admin account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await AdminUser.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      roleId: Number(roleId),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    const userWithRole = await AdminUser.findByPk(newUser.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'permissions'] }]
    });

    res.status(201).json({
      success: true,
      user: userWithRole,
      message: `Staff user "${name}" created successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin-users/:id - Update admin/staff user
router.put('/:id', verifyAdmin, hasPermission('manage_admin_users'), async (req, res) => {
  try {
    const user = await AdminUser.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }

    const { name, email, password, roleId, isActive } = req.body;

    if (email && email.trim().toLowerCase() !== user.email) {
      const existing = await AdminUser.findOne({ where: { email: email.trim().toLowerCase() } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'An admin account with this email already exists' });
      }
      user.email = email.trim().toLowerCase();
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }

    if (roleId) {
      const roleExists = await Role.findByPk(roleId);
      if (!roleExists) {
        return res.status(400).json({ success: false, message: 'Selected role does not exist' });
      }
      user.roleId = Number(roleId);
    }

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    if (password && password.trim().length >= 6) {
      user.password = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();

    const updatedUser = await AdminUser.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'permissions'] }]
    });

    res.json({
      success: true,
      user: updatedUser,
      message: `Staff user "${updatedUser.name}" updated successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin-users/:id - Delete staff user
router.delete('/:id', verifyAdmin, hasPermission('manage_admin_users'), async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const user = await AdminUser.findByPk(targetId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }

    if (req.admin && req.admin.id === targetId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own logged-in account' });
    }

    const adminCount = await AdminUser.count();
    if (adminCount <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the only remaining admin user' });
    }

    await user.destroy();
    res.json({ success: true, message: `Staff user "${user.name}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
