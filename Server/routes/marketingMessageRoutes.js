'use strict';
const router = require('express').Router();
const { getAll, create, update, remove } = require('../controllers/marketingMessageController');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/', getAll);
router.post('/', verifyAdmin, hasPermission('add_slider_message'), create);
router.put('/:id', verifyAdmin, hasPermission('add_slider_message'), update);
router.delete('/:id', verifyAdmin, hasPermission('delete_slider_message'), remove);

module.exports = router;
