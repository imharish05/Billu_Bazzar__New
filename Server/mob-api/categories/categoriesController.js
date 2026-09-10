'use strict';
const category = require('../../controllers/categoryController');
const subCategory = require('../../controllers/subCategoryController');
const subSubCategory = require('../../controllers/subSubCategoryController');

exports.getTree = (req, res, next) => category.getTree(req, res, next);

exports.getAll = (req, res, next) => category.getAll(req, res, next);
exports.getSubCategories = (req, res, next) => subCategory.getAll(req, res, next);
exports.getSubSubCategories = (req, res, next) => subSubCategory.getAll(req, res, next);
