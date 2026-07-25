'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Coupon = sequelize.define('Coupon', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  type: { type: DataTypes.ENUM('PERCENT', 'FLAT', 'FREE_SHIPPING'), allowNull: false },
  value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  minOrderValue: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  maxDiscount: { type: DataTypes.DECIMAL(10, 2) },
  usageLimit: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
  usageCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  validFrom: { type: DataTypes.DATE, allowNull: false },
  validUntil: { type: DataTypes.DATE, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  description: { type: DataTypes.STRING(200) },
});

module.exports = Coupon;
