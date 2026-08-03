'use strict';
const { Category, SubCategory, SubSubCategory, Product, sequelize } = require('../models');
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

// Helper to delete local file
const deleteLocalFile = (imagePath) => {
  if (imagePath && imagePath.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '..', imagePath.substring(1)); // strip leading slash
    try {
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`[Upload] Deleted local category file: ${localPath}`);
      }
    } catch (err) {
      console.error(`[Upload] Error deleting local category file: ${err.message}`);
    }
  }
};

const getTree = async (req, res) => {
  try {
    const { all } = req.query;
    const where = {};
    if (!all) where.isActive = true;

    const categories = await Category.findAll({
      where,
      include: [
        {
          model: SubCategory,
          as: 'subcategories',
          required: false,
          where,
          include: [
            {
              model: SubSubCategory,
              as: 'subsubcategories',
              required: false,
              where
            }
          ]
        }
      ],
      order: [
        ['sortOrder', 'ASC'],
        [{ model: SubCategory, as: 'subcategories' }, 'sortOrder', 'ASC'],
        [{ model: SubCategory, as: 'subcategories' }, { model: SubSubCategory, as: 'subsubcategories' }, 'sortOrder', 'ASC'],
      ]
    });

    const tree = categories.map(c => {
      const cJson = c.toJSON();
      return {
        ...cJson,
        children: (cJson.subcategories || []).map(sub => ({
          ...sub,
          children: sub.subsubcategories || []
        }))
      };
    });

    res.json({ success: true, categories: tree });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAll = async (req, res) => {
  try {
    const { all, page, limit, search } = req.query;
    const { Op } = require('sequelize');
    const where = {};
    if (!all) where.isActive = true;
    if (search) where.name = { [Op.like]: `%${search}%` };

    if (page !== undefined || limit !== undefined) {
      where.parentId = null;
      const p = Math.max(1, parseInt(page || 1, 10));
      const l = Math.max(1, parseInt(limit || 10, 10));

      const { count, rows } = await Category.findAndCountAll({
        where,
        attributes: { exclude: ['attributes', 'description'] },
        order: [['sortOrder', 'ASC']],
        limit: l,
        offset: (p - 1) * l
      });

      return res.json({
        success: true,
        categories: rows,
        total: count,
        page: p,
        limit: l,
        totalPages: Math.ceil(count / l)
      });
    }

    const categories = await Category.findAll({
      where,
      attributes: { exclude: ['attributes', 'description'] },
      order: [['sortOrder', 'ASC']]
    });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    if (data.showHeader !== undefined) {
      data.showHeader = data.showHeader === 'true' || data.showHeader === true;
    }
    if (data.parentId === '' || data.parentId === 'null' || data.parentId === 'undefined') {
      data.parentId = null;
    }
    const category = await Category.create(data);
    res.status(201).json({ success: true, category });
  } catch (err) {
    return handleDBError(err, res, 'category');
  }
};

const update = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    
    const data = { ...req.body };
    if (data.parentId === '' || data.parentId === 'null' || data.parentId === 'undefined') {
      data.parentId = null;
    }
    if (req.file) {
      deleteLocalFile(category.image);
      const normalizedPath = req.file.path.replace(/\\/g, '/');
      const uploadsIndex = normalizedPath.indexOf('uploads');
      data.image = '/' + normalizedPath.substring(uploadsIndex);
    }
    if (data.isActive !== undefined) {
      data.isActive = data.isActive === 'true' || data.isActive === true;
    }
    if (data.showHeader !== undefined) {
      data.showHeader = data.showHeader === 'true' || data.showHeader === true;
    }
    
    await category.update(data);
    res.json({ success: true, category });
  } catch (err) {
    return handleDBError(err, res, 'category');
  }
};

const remove = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id, { transaction });
    if (!category) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // 1. Delete category image
    deleteLocalFile(category.image);

    // 2. Find subcategories and delete their images and records
    const subCategories = await SubCategory.findAll({
      where: { categoryId: category.id },
      transaction
    });
    const subIds = subCategories.map(sc => sc.id);

    if (subIds.length > 0) {
      // Find sub-subcategories
      const subSubCategories = await SubSubCategory.findAll({
        where: { subCategoryId: subIds },
        transaction
      });
      for (const ssc of subSubCategories) {
        deleteLocalFile(ssc.image);
      }
      await SubSubCategory.destroy({ where: { subCategoryId: subIds }, transaction });

      for (const sc of subCategories) {
        deleteLocalFile(sc.image);
      }
      await SubCategory.destroy({ where: { categoryId: category.id }, transaction });
    }

    // 3. Find and delete products linked to this category
    const products = await Product.findAll({
      where: { categoryId: category.id },
      attributes: ['id', 'name'],
      transaction
    });
    const productIds = products.map(p => p.id);

    if (productIds.length > 0) {
      const { WarehouseStock, CartItem, Wishlist, Review, StockAlert, OrderItem, InventoryMovementLog, ProductVariant } = require('../models');

      if (InventoryMovementLog) await InventoryMovementLog.destroy({ where: { productId: productIds }, transaction });
      if (ProductVariant) await ProductVariant.destroy({ where: { productId: productIds }, transaction });
      await WarehouseStock.destroy({ where: { productId: productIds }, transaction });
      await CartItem.destroy({ where: { productId: productIds }, transaction });
      await Wishlist.destroy({ where: { productId: productIds }, transaction });
      await Review.destroy({ where: { productId: productIds }, transaction });
      await StockAlert.destroy({ where: { productId: productIds }, transaction });
      await OrderItem.destroy({ where: { productId: productIds }, transaction });

      await Product.destroy({ where: { id: productIds }, transaction });
    }

    // Delete SearchKeyword entries referring to the category
    const { SearchKeyword } = require('../models');
    await SearchKeyword.destroy({ where: { category_id: category.id }, transaction });

    await Category.destroy({ where: { id: category.id }, transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: `Category and its associated sub-categories, sub-sub-categories, and products have been deleted successfully.`
    });

  } catch (err) {
    await transaction.rollback();
    return handleDBError(err, res, 'category');
  }
};

const reorder = async (req, res) => {
  try {
    const { items } = req.body; // [{ id, sortOrder }]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array required' });
    }
    await Promise.all(
      items.map(({ id, sortOrder }) => Category.update({ sortOrder }, { where: { id } }))
    );
    res.json({ success: true });
  } catch (err) {
    return handleDBError(err, res, 'category');
  }
};

module.exports = { getTree, getAll, create, update, remove, reorder };

