'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  slug: { type: DataTypes.STRING(220), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  shortDescription: { type: DataTypes.STRING(300) },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  comparePrice: { type: DataTypes.DECIMAL(10, 2) },
  currency: { type: DataTypes.STRING(5), defaultValue: 'INR' },
  sku: { type: DataTypes.STRING(80), unique: true },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  categoryId: { type: DataTypes.INTEGER, allowNull: false },
  subCategoryId: { type: DataTypes.INTEGER, allowNull: true },
  subSubCategoryId: { type: DataTypes.INTEGER, allowNull: true },
  vendorId: { type: DataTypes.INTEGER },
  showAuthenticity: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
  warehouseId: { type: DataTypes.INTEGER, allowNull: true },
  lowStockThreshold: { type: DataTypes.INTEGER, defaultValue: 10, allowNull: true },
  gstRate: { type: DataTypes.STRING(20), defaultValue: '18%', allowNull: true },
  defaultProductImage: {
    type: DataTypes.STRING(500),
    allowNull: true,
    get() {
      const val = this.getDataValue('defaultProductImage');
      if (val) return val;
      const rawImgs = this.getDataValue('images');
      let imgs = [];
      if (typeof rawImgs === 'string') {
        try { imgs = JSON.parse(rawImgs); } catch (e) { imgs = []; }
      } else if (Array.isArray(rawImgs)) {
        imgs = rawImgs;
      }
      return (imgs && imgs.length > 0) ? imgs[0] : null;
    }
  },
  has360View: { type: DataTypes.BOOLEAN, defaultValue: false },
  hasVideo: { type: DataTypes.BOOLEAN, defaultValue: false },
  videoUrl: { type: DataTypes.STRING(500), allowNull: true },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('images');
      let imgs = [];
      if (typeof rawValue === 'string') {
        try { imgs = JSON.parse(rawValue); } catch (e) { imgs = []; }
      } else if (Array.isArray(rawValue)) {
        imgs = rawValue;
      }
      const defaultImg = this.getDataValue('defaultProductImage');
      if (defaultImg && (!imgs || imgs.length === 0)) {
        return [defaultImg];
      }
      if (defaultImg && imgs.length > 0 && !imgs.includes(defaultImg)) {
        return [defaultImg, ...imgs];
      }
      return imgs || [];
    }
  },
  // 360-degree spin image frames (array of ordered URLs)
  spin_images: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('spin_images');
      if (typeof rawValue === 'string') {
        try { return JSON.parse(rawValue); } catch (e) { return []; }
      }
      return rawValue || [];
    }
  },
  // 3D model URL for AR/model-viewer (nullable — not all products have 3D models)
  model_3d_url: { type: DataTypes.STRING(500), allowNull: true },
  // Derived from spin_images by spinSequenceService: a folder of sequentially
  // named, uniformly-formatted frames that react-360-view's <ThreeSixty>
  // component can address via imagePath + fileName="frame_{index}.jpg".
  spinImagePath: { type: DataTypes.STRING(300), allowNull: true },
  spinImageCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  spinImageExt: { type: DataTypes.STRING(10), defaultValue: 'jpg' },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('tags');
      if (typeof rawValue === 'string') {
        try { return JSON.parse(rawValue); } catch (e) { return []; }
      }
      return rawValue || [];
    }
  },
  attributes: {
    type: DataTypes.JSON,
    defaultValue: {},
    get() {
      const rawValue = this.getDataValue('attributes');
      if (typeof rawValue === 'string') {
        try { return JSON.parse(rawValue); } catch (e) { return {}; }
      }
      return rawValue || {};
    }
  },
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
  isNewArrival: { type: DataTypes.BOOLEAN, defaultValue: false },
  isBestSeller: { type: DataTypes.BOOLEAN, defaultValue: false },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0.00 },
  reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  seoDescription: { type: DataTypes.STRING(300) },
  discountPercent: {
    type: DataTypes.VIRTUAL,
    get() {
      const price = parseFloat(this.getDataValue('price'));
      const comparePrice = parseFloat(this.getDataValue('comparePrice'));
      if (comparePrice && comparePrice > price) {
        return Math.round(((comparePrice - price) / comparePrice) * 100);
      }
      return 0;
    }
  },
});

Product.beforeValidate(async (product) => {
  if (product.name && (!product.slug || product.slug.trim() === '')) {
    product.slug = product.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  if (product.slug) {
    let finalSlug = product.slug;
    let count = 1;
    const { Op } = require('sequelize');
    while (true) {
      const whereClause = { slug: finalSlug };
      if (product.id) {
        whereClause.id = { [Op.ne]: product.id };
      }
      const existing = await Product.findOne({ where: whereClause });
      if (!existing) break;
      finalSlug = `${product.slug}-${count}`;
      count++;
    }
    product.slug = finalSlug;
  }
});

Product.afterCreate(async (product, options) => {
  try {
    const { syncProductKeywords } = require('../services/searchSyncService');
    await syncProductKeywords(product);
  } catch (err) {
    console.error('[ProductHook] Error in afterCreate hook:', err.message);
  }
});

Product.afterUpdate(async (product, options) => {
  try {
    const { syncProductKeywords } = require('../services/searchSyncService');
    await syncProductKeywords(product);
  } catch (err) {
    console.error('[ProductHook] Error in afterUpdate hook:', err.message);
  }
});

module.exports = Product;