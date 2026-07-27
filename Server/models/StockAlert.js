'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockAlert = sequelize.define('StockAlert', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  variantId: { type: DataTypes.INTEGER, allowNull: true },
  selectedVariant: { type: DataTypes.JSON, allowNull: true },
  customerId: { type: DataTypes.INTEGER, allowNull: true },
  email: { type: DataTypes.STRING(180), allowNull: false },
  phone: { type: DataTypes.STRING(20) },
  isNotified: { type: DataTypes.BOOLEAN, defaultValue: false },
  notifiedAt: { type: DataTypes.DATE },
});

module.exports = StockAlert;
