'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderNumber: { type: DataTypes.STRING(30), unique: true, allowNull: false },
  customerId: { type: DataTypes.INTEGER, allowNull: true }, // nullable for guest checkouts
  sessionId: { type: DataTypes.STRING(100), allowNull: true },  // guest session
  affiliateId: { type: DataTypes.INTEGER, allowNull: true },
  couponId: { type: DataTypes.INTEGER, allowNull: true },
  status: {
    type: DataTypes.ENUM(
      'PENDING_PAYMENT', 
      'PAID', 
      'PAYMENT_RECEIVED_STOCK_FAILED',
      'PENDING', 
      'CONFIRMED', 
      'PROCESSING', 
      'SHIPPED', 
      'OUT_FOR_DELIVERY', 
      'DELIVERED', 
      'CANCELLED', 
      'RETURNED', 
      'REFUNDED',
      'EXPIRED'
    ),
    defaultValue: 'PENDING_PAYMENT',
  },
  paymentStatus: { type: DataTypes.ENUM('UNPAID', 'PAID', 'PARTIAL', 'REFUNDED'), defaultValue: 'UNPAID' },
  paymentMethod: { type: DataTypes.STRING(50) },
  paymentGatewayRef: { type: DataTypes.STRING(100) },
  razorpay_payment_id: { type: DataTypes.STRING(100), unique: true, allowNull: true },
  razorpay_order_id: { type: DataTypes.STRING(100), unique: true, allowNull: true },
  razorpay_signature: { type: DataTypes.STRING(255), allowNull: true },
  inventoryProcessed: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  discountAmount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  shippingAmount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  taxAmount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(5), defaultValue: 'INR' },
  shippingAddress: { type: DataTypes.JSON, allowNull: false },
  billingAddress: { type: DataTypes.JSON },
  notes: { type: DataTypes.TEXT },
  trackingNumber: { type: DataTypes.STRING(80) },
  trackingUrl: { type: DataTypes.STRING(500) },
  shiprocketOrderId: { type: DataTypes.STRING(80) },
  estimatedDelivery: { type: DataTypes.DATE },
  deliveredAt: { type: DataTypes.DATE },
  isFraudFlagged: { type: DataTypes.BOOLEAN, defaultValue: false },
  invoicePath: { type: DataTypes.STRING(500) },
}, {
  tableName: 'Orders',
  timestamps: true,
});

module.exports = Order;
