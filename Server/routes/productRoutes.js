'use strict';
const router = require('express').Router();
const { getAll, getOne, create, update, remove, getFeatured, search, getPriceRange } = require('../controllers/productController');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.get('/', getAll);
router.get('/featured', getFeatured);
router.get('/search', search);
router.get('/price-range', getPriceRange);
router.get('/:slug', getOne);
router.post('/', verifyAdmin, hasPermission('add_product'), upload.any(), create);
router.put('/:id', verifyAdmin, hasPermission('edit_product'), upload.any(), update);
router.delete('/:id', verifyAdmin, hasPermission('delete_product'), remove);

module.exports = router;
