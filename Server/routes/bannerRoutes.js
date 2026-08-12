'use strict';
const router = require('express').Router();
const { getAll, create, update, remove } = require('../controllers/bannerController');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.get('/', getAll);
router.post('/', verifyAdmin, hasPermission('add_banner'), upload.single('image'), create);
router.put('/:id', verifyAdmin, hasPermission('add_banner'), upload.single('image'), update);
router.delete('/:id', verifyAdmin, hasPermission('delete_banner'), remove);

module.exports = router;
