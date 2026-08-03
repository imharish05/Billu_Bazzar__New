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

module.exports = ProductVariant;
