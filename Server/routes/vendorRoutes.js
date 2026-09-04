'use strict';
const router = require('express').Router();
const { getAll, getOne, create, update, remove } = require('../controllers/vendorController');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/', verifyAdmin, hasPermission('view_vendors'), getAll);
router.get('/:id', verifyAdmin, hasPermission('view_vendors'), getOne);
router.post('/', verifyAdmin, hasPermission('add_vendor'), create);
router.put('/:id', verifyAdmin, hasPermission('edit_vendor'), update);
router.delete('/:id', verifyAdmin, hasPermission('delete_vendor'), remove);

module.exports = router;
