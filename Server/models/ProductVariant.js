'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductVariant = sequelize.define('ProductVariant', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Products', key: 'id' },
    onDelete: 'CASCADE'
  },
  sku: { type: DataTypes.STRING(80), unique: true, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: true }, // Sale price
  mrp: { type: DataTypes.DECIMAL(10, 2), allowNull: true }, // Maximum Retail Price (compare price)
  priceAED: { type: DataTypes.DECIMAL(10, 2), allowNull: true }, // AED Sale price override
  mrpAED: { type: DataTypes.DECIMAL(10, 2), allowNull: true }, // AED MRP override
  stock: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
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
  image: { type: DataTypes.STRING, allowNull: true },
  warehouseId: { type: DataTypes.INTEGER, allowNull: true },
  lowStockThreshold: { type: DataTypes.INTEGER, defaultValue: 10, allowNull: true },
  gstRate: { type: DataTypes.STRING(20), defaultValue: '0%', allowNull: true },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('images');
      if (typeof rawValue === 'string') {
        try { return JSON.parse(rawValue); } catch (e) { return []; }
      }
      return rawValue || [];
    }
  }
}, {
  tableName: 'ProductVariants',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['productId', 'sku'] }
  ]
});

ProductVariant.beforeValidate(async (variant) => {
  const { Op } = require('sequelize');

  if (!variant.sku || variant.sku.trim() === '') {
    const comboStr = variant.attributes ? (typeof variant.attributes === 'string' ? JSON.parse(variant.attributes) : variant.attributes) : {};
    const comboLabel = typeof comboStr === 'object' && comboStr ? Object.values(comboStr).filter(Boolean).join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') : '';
    const uniqueTag = Math.random().toString(36).substring(2, 6).toUpperCase();
    variant.sku = comboLabel ? `SKU-PRD${variant.productId || 'V'}-${comboLabel}-${uniqueTag}` : `SKU-PRD${variant.productId || 'V'}-VAR-${uniqueTag}`;
  }

  if (variant.sku) {
    let finalSku = variant.sku.trim().toUpperCase();
    let count = 1;
    const baseSku = finalSku;
    while (true) {
      const whereClause = { sku: finalSku };
      if (variant.id) {
        whereClause.id = { [Op.ne]: variant.id };
      }
      const existing = await ProductVariant.findOne({ where: whereClause });
      if (!existing) break;
      finalSku = `${baseSku}-${count}`;
      count++;
    }
    variant.sku = finalSku;
  }
});

module.exports = ProductVariant;

