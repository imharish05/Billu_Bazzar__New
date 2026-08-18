'use strict';
const router = require('express').Router();
const { getTree, getAll, create, update, remove, reorder, seed } = require('../controllers/categoryController');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.get('/tree', getTree);
router.get('/seed', seed);
router.post('/seed', seed);
router.get('/', getAll);
router.post('/', verifyAdmin, hasPermission('add_category'), upload.single('image'), create);
router.patch('/reorder', verifyAdmin, hasPermission('edit_category'), reorder);
router.put('/:id', verifyAdmin, hasPermission('edit_category'), upload.single('image'), update);
router.delete('/:id', verifyAdmin, hasPermission('delete_category'), remove);

module.exports = router;
