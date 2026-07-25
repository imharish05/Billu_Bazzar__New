'use strict';
const { SubCategory, SubSubCategory, sequelize } = require('../models');
const fs = require('fs');
const path = require('path');

const handleDBError = (err, res, type = 'item') => {
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ success: false, message: `A ${type} with this name or slug already exists.` });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ success: false, message: 'Foreign key constraint fails. Please verify that all parent links are valid.' });
  }
  if (err.name === 'SequelizeValidationError') {
    const msg = err.errors.map(e => e.message).join(', ');
    return res.status(400).json({ success: false, message: msg });
  }
  return res.status(500).json({ success: false, message: err.message });
};

const deleteLocalFile = (imagePath) => {
  if (imagePath && imagePath.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '..', imagePath.substring(1));
    try {
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`[Upload] Deleted local file: ${localPath}`);
      }
    } catch (err) {
      console.error(`[Upload] Error deleting local file: ${err.message}`);
    }
  }
};

const getAll = async (req, res) => {
  try {
    const { all, page, limit, subCategoryId, search } = req.query;
    const { Op } = require('sequelize');
    const where = {};
    if (!all) where.isActive = true;
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (search) where.name = { [Op.like]: `%${search}%` };

    if (page !== undefined || limit !== undefined) {
      const p = Math.max(1, parseInt(page || 1, 10));
      const l = Math.max(1, parseInt(limit || 10, 10));

      const { count, rows } = await SubSubCategory.findAndCountAll({
        where,
        include: [{
          model: SubCategory,
          as: 'subcategory',
          attributes: ['id', 'name', 'categoryId']
        }],
        order: [['sortOrder', 'ASC']],
        limit: l,
        offset: (p - 1) * l
      });

      return res.json({
        success: true,
        subSubCategories: rows,
        total: count,
        page: p,
        limit: l,
        totalPages: Math.ceil(count / l)
      });
    }

    const subSubCategories = await SubSubCategory.findAll({
      where,
      include: [{
        model: SubCategory,
        as: 'subcategory',
        attributes: ['id', 'name', 'categoryId']
      }],
      order: [['sortOrder', 'ASC']]
    });
    res.json({ success: true, subSubCategories });
  } catch (err) {
    return handleDBError(err, res, 'sub-sub-category');
  }
};

const create = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      const normalizedPath = req.file.path.replace(/\\/g, '/');
      const uploadsIndex = normalizedPath.indexOf('uploads');
      data.image = '/' + normalizedPath.substring(uploadsIndex);
    }
    if (data.isActive !== undefined) {
      data.isActive = data.isActive === 'true' || data.isActive === true;
    }
    const subSubCategory = await SubSubCategory.create(data);
    const fresh = await SubSubCategory.findByPk(subSubCategory.id, {
      include: [{ model: SubCategory, as: 'subcategory', attributes: ['id', 'name', 'categoryId'] }]
    });
    res.status(201).json({ success: true, subSubCategory: fresh });
  } catch (err) {
    return handleDBError(err, res, 'sub-sub-category');
  }
};

const update = async (req, res) => {
  try {
    const subSubCategory = await SubSubCategory.findByPk(req.params.id);
    if (!subSubCategory) {
      return res.status(404).json({ success: false, message: 'Sub-sub-category not found' });
    }
    const data = { ...req.body };
    if (req.file) {
      deleteLocalFile(subSubCategory.image);
      const normalizedPath = req.file.path.replace(/\\/g, '/');
      const uploadsIndex = normalizedPath.indexOf('uploads');
      data.image = '/' + normalizedPath.substring(uploadsIndex);
    }
    if (data.isActive !== undefined) {
      data.isActive = data.isActive === 'true' || data.isActive === true;
    }
    await subSubCategory.update(data);
    const fresh = await SubSubCategory.findByPk(subSubCategory.id, {
      include: [{ model: SubCategory, as: 'subcategory', attributes: ['id', 'name', 'categoryId'] }]
    });
    res.json({ success: true, subSubCategory: fresh });
  } catch (err) {
    return handleDBError(err, res, 'sub-sub-category');
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const subSubCategory = await SubSubCategory.findByPk(id);
    if (!subSubCategory) {
      return res.status(404).json({ success: false, message: 'Sub-sub-category not found' });
    }

    deleteLocalFile(subSubCategory.image);
    await SubSubCategory.destroy({ where: { id } });
    res.json({ success: true, message: 'Sub-sub-category deleted successfully.' });
  } catch (err) {
    return handleDBError(err, res, 'sub-sub-category');
  }
};

const reorder = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array required' });
    }
    await Promise.all(
      items.map(({ id, sortOrder }) => SubSubCategory.update({ sortOrder }, { where: { id } }))
    );
    res.json({ success: true });
  } catch (err) {
    return handleDBError(err, res, 'sub-sub-category');
  }
};

module.exports = { getAll, create, update, remove, reorder };

