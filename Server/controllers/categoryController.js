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

const { deleteLocalFile } = require('../utils/fileHelper');

const { toAbsoluteUrl } = require('../utils/imageUrl');

const formatCategoryNode = (cat, req) => {
  if (!cat) return cat;
  const json = typeof cat.toJSON === 'function' ? cat.toJSON() : { ...cat };
  if (json.image) json.image = toAbsoluteUrl(json.image, req);
  if (Array.isArray(json.subcategories)) {
    json.subcategories = json.subcategories.map(sc => formatCategoryNode(sc, req));
  }
  if (Array.isArray(json.subsubcategories)) {
    json.subsubcategories = json.subsubcategories.map(ssc => formatCategoryNode(ssc, req));
  }
  if (Array.isArray(json.children)) {
    json.children = json.children.map(ch => formatCategoryNode(ch, req));
  }
  return json;
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
      const cJson = formatCategoryNode(c, req);
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
      if (req.file.size > 5 * 1024 * 1024) {
        const normalizedPath = req.file.path.replace(/\\/g, '/');
        const uploadsIndex = normalizedPath.indexOf('uploads');
        deleteLocalFile('/' + normalizedPath.substring(uploadsIndex));
        return res.status(400).json({ success: false, message: 'Category image file size exceeds 5MB limit. Please upload an image under 5MB.' });
      }
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
      if (req.file.size > 5 * 1024 * 1024) {
        const normalizedPath = req.file.path.replace(/\\/g, '/');
        const uploadsIndex = normalizedPath.indexOf('uploads');
        deleteLocalFile('/' + normalizedPath.substring(uploadsIndex));
        return res.status(400).json({ success: false, message: 'Category image file size exceeds 5MB limit. Please upload an image under 5MB.' });
      }
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
      await OrderItem.update({ productId: null }, { where: { productId: productIds }, transaction });
      if (ProductVariant) await ProductVariant.destroy({ where: { productId: productIds }, transaction });
      await WarehouseStock.destroy({ where: { productId: productIds }, transaction });
      await CartItem.destroy({ where: { productId: productIds }, transaction });
      await Wishlist.destroy({ where: { productId: productIds }, transaction });
      await Review.destroy({ where: { productId: productIds }, transaction });
      await StockAlert.destroy({ where: { productId: productIds }, transaction });

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

const seed = async (req, res) => {
  try {
    const slugify = (text, prefix = '') => {
      let str = (prefix ? `${prefix}-` : '') + text;
      return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const getSmallPlaceholderImage = (title) => {
      const encodedTitle = encodeURIComponent(title);
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%23f4f4f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="600" fill="%23a1a1aa">${encodedTitle}</text></svg>`;
    };

    const data = [
      {
        root: "Electronics & Gadgets",
        parents: [
          { name: "Audio", children: ["Headphones", "Earbuds", "Bluetooth Speakers", "Soundbars"] },
          { name: "Computers & Laptops", children: ["Laptops", "Desktops", "Monitors", "Components (RAM, SSDs)"] },
          { name: "Smartphones & Tablets", children: ["Phones", "Tablets", "Cases", "Chargers", "Power Banks"] },
          { name: "Smart Home & IoT", children: ["Smart Speakers", "Security Cameras", "Smart Lighting"] },
          { name: "Wearable Tech", children: ["Smartwatches", "Fitness Trackers"] }
        ]
      },
      {
        root: "Apparel & Fashion",
        parents: [
          { name: "Men's Clothing", children: ["Shirts", "T-Shirts", "Pants", "Jackets", "Activewear"] },
          { name: "Women's Clothing", children: ["Dresses", "Tops", "Skirts", "Jeans", "Outerwear", "Activewear"] },
          { name: "Kids & Baby", children: ["Infant Rompers", "Toddler Clothes", "School Uniforms"] },
          { name: "Footwear", children: ["Sneakers", "Boots", "Sandals", "Formal Shoes"] },
          { name: "Accessories", children: ["Bags & Backpacks", "Wallets", "Belts", "Sunglasses", "Jewelry", "Watches"] }
        ]
      },
      {
        root: "Home & Living",
        parents: [
          { name: "Furniture", children: ["Living Room (Sofas, Tables)", "Bedroom (Beds, Wardrobes)", "Office Chairs"] },
          { name: "Kitchen & Dining", children: ["Cookware", "Dinnerware", "Small Appliances (Blenders, Coffee Makers)"] },
          { name: "Bedding & Bath", children: ["Sheets", "Pillows", "Towels", "Shower Curtains"] },
          { name: "Home Decor", children: ["Rugs", "Lighting", "Wall Art", "Candles", "Vases"] },
          { name: "Garden & Outdoor", children: ["Patio Furniture", "Grills", "Gardening Tools", "Outdoor Lighting"] }
        ]
      },
      {
        root: "Beauty & Personal Care",
        parents: [
          { name: "Skincare", children: ["Cleansers", "Moisturizers", "Serums", "Sunscreen"] },
          { name: "Makeup", children: ["Face", "Eyes", "Lips", "Brushes & Tools"] },
          { name: "Haircare", children: ["Shampoo", "Conditioner", "Styling Products", "Hair Dryers"] },
          { name: "Fragrances", children: ["Perfumes", "Colognes", "Body Sprays"] },
          { name: "Personal Care", children: ["Oral Care", "Deodorants", "Shaving & Grooming"] }
        ]
      },
      {
        root: "Sports & Outdoors",
        parents: [
          { name: "Fitness & Exercise", children: ["Dumbbells", "Yoga Mats", "Resistance Bands", "Treadmills"] },
          { name: "Camping & Hiking", children: ["Tents", "Sleeping Bags", "Backpacks", "Navigation"] },
          { name: "Cycling", children: ["Bicycles", "Helmets", "Bike Accessories"] },
          { name: "Water Sports", children: ["Kayaks", "Swim Gear", "Paddleboards"] }
        ]
      },
      {
        root: "Toys, Hobbies & Media",
        parents: [
          { name: "Toys & Games", children: ["Board Games", "Puzzles", "Action Figures", "Dolls", "Building Blocks"] },
          { name: "Video Games", children: ["Consoles", "Controller Accessories", "Game Discs/Codes"] },
          { name: "Books", children: ["Fiction", "Non-Fiction", "Children's Books", "E-books"] }
        ]
      }
    ];

    let rootCount = 0;
    let parentCount = 0;
    let childCount = 0;

    for (let rIdx = 0; rIdx < data.length; rIdx++) {
      const item = data[rIdx];
      const rootSlug = slugify(item.root);

      let [rootCat] = await Category.findOrCreate({
        where: { slug: rootSlug },
        defaults: {
          name: item.root,
          slug: rootSlug,
          description: `Curated collection of ${item.root}`,
          image: getSmallPlaceholderImage(item.root),
          sortOrder: rIdx + 1,
          isActive: true,
          showHeader: true
        }
      });
      rootCount++;

      for (let pIdx = 0; pIdx < item.parents.length; pIdx++) {
        const parent = item.parents[pIdx];
        const parentSlug = slugify(parent.name, rootSlug);

        let [parentCat] = await SubCategory.findOrCreate({
          where: { slug: parentSlug },
          defaults: {
            categoryId: rootCat.id,
            name: parent.name,
            slug: parentSlug,
            description: `${parent.name} under ${item.root}`,
            image: getSmallPlaceholderImage(parent.name),
            sortOrder: pIdx + 1,
            isActive: true
          }
        });
        parentCount++;

        for (let cIdx = 0; cIdx < parent.children.length; cIdx++) {
          const childName = parent.children[cIdx];
          const childSlug = slugify(childName, parentSlug);

          await SubSubCategory.findOrCreate({
            where: { slug: childSlug },
            defaults: {
              subCategoryId: parentCat.id,
              name: childName,
              slug: childSlug,
              description: `${childName} under ${parent.name}`,
              image: getSmallPlaceholderImage(childName),
              sortOrder: cIdx + 1,
              isActive: true
            }
          });
          childCount++;
        }
      }
    }

    return res.json({
      success: true,
      message: 'Categories auto-seeded successfully!',
      summary: {
        rootCategories: rootCount,
        subCategories: parentCount,
        subSubCategories: childCount
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getTree, getAll, create, update, remove, reorder, seed };

