'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ReturnRequest = sequelize.define('ReturnRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  returnNumber: { type: DataTypes.STRING(30), unique: true, allowNull: false },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  orderItemId: { type: DataTypes.INTEGER, allowNull: false },
  customerId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: true },
  variantId: { type: DataTypes.INTEGER, allowNull: true },
  productName: { type: DataTypes.STRING(200), allowNull: false },
  productImage: { type: DataTypes.STRING(500), allowNull: true },
  selectedVariant: { type: DataTypes.JSON, defaultValue: {} },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  refundAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(5), defaultValue: 'INR' },
  reason: { type: DataTypes.STRING(100), allowNull: false },
  reasonDetails: { type: DataTypes.TEXT, allowNull: true },
  unboxingVideoUrl: { type: DataTypes.STRING(1000), allowNull: false },
  images: { type: DataTypes.JSON, defaultValue: [] },
  bankDetails: { type: DataTypes.JSON, allowNull: true },
  status: {
    type: DataTypes.ENUM(
      'REQUESTED',
      'APPROVED',
      'REJECTED',
      'PICKUP_SCHEDULED',
      'PICKED_UP',
      'RECEIVED_AT_WAREHOUSE',
      'REFUNDED'
    ),
    defaultValue: 'REQUESTED',
  },
  statusTimeline: { type: DataTypes.JSON, defaultValue: {} },
  adminNotes: { type: DataTypes.TEXT, allowNull: true },
  rejectedReason: { type: DataTypes.TEXT, allowNull: true },
  pickupDate: { type: DataTypes.DATE, allowNull: true },
  refundTransactionRef: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'ReturnRequests',
  timestamps: true,
});

module.exports = ReturnRequest;
