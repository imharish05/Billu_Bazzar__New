'use strict';
const express = require('express');
const router = express.Router();
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getModules,
} = require('../controllers/roleController');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

// GET /api/roles/modules - Fetch module list schema
router.get('/modules', verifyAdmin, getModules);

// GET /api/roles - Fetch all roles and permissions
router.get('/', verifyAdmin, hasPermission('manage_roles'), getAllRoles);

// GET /api/roles/:id - Fetch single role details
router.get('/:id', verifyAdmin, hasPermission('manage_roles'), getRoleById);

// POST /api/roles - Create custom role
router.post('/', verifyAdmin, hasPermission('manage_roles'), createRole);

// PUT /api/roles/:id - Update role permissions
router.put('/:id', verifyAdmin, hasPermission('manage_roles'), updateRole);

// DELETE /api/roles/:id - Delete custom role
router.delete('/:id', verifyAdmin, hasPermission('manage_roles'), deleteRole);

module.exports = router;
