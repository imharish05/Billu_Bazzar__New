'use strict';
const router = require('express').Router();
const controller = require('./categoriesController');

router.get('/categories/tree', controller.getTree);
router.get('/categories', controller.getAll);
router.get('/subcategories', controller.getSubCategories);
router.get('/subsubcategories', controller.getSubSubCategories);

module.exports = router;
