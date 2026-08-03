'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Review = sequelize.define('Review', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  customerId: { type: DataTypes.INTEGER, allowNull: false },
  orderId: { type: DataTypes.INTEGER, allowNull: true },
  rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  title: { type: DataTypes.STRING(140) },
  body: { type: DataTypes.TEXT, allowNull: false },
  isVerifiedPurchase: { type: DataTypes.BOOLEAN, defaultValue: true },
  isApproved: { type: DataTypes.BOOLEAN, defaultValue: false },
});

module.exports = Review;
