'use strict';
const router = require('express').Router();
const { getAll, getOne, create, update, remove, getOrders, trackClick } = require('../controllers/affiliateController');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.get('/track', trackClick);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', verifyAdmin, hasPermission('manage_affiliates'), upload.single('documentProof'), create);
router.put('/:id', verifyAdmin, hasPermission('manage_affiliates'), upload.single('documentProof'), update);
router.delete('/:id', verifyAdmin, hasPermission('manage_affiliates'), remove);
router.get('/:id/orders', verifyAdmin, hasPermission('manage_affiliates'), getOrders);

module.exports = router;
