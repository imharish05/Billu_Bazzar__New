'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: true },
  variantId: { type: DataTypes.INTEGER, allowNull: true }, // snapshot of ProductVariant id if applicable
  productName: { type: DataTypes.STRING(200), allowNull: false }, // snapshot at order time
  productImage: { type: DataTypes.STRING(500) },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  selectedVariant: { type: DataTypes.JSON, defaultValue: {} },
  gstRate: { type: DataTypes.STRING(20), defaultValue: '0%', allowNull: true },
  returnStatus: { type: DataTypes.ENUM('NONE', 'REQUESTED', 'APPROVED', 'COMPLETED'), defaultValue: 'NONE' },
}, {
  tableName: 'OrderItems',
  timestamps: true,
});

module.exports = OrderItem;
