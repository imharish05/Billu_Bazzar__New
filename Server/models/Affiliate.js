'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Affiliate = sequelize.define('Affiliate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  referralCode: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  commissionRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 5.0 },
  totalEarnings: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalClicks: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalOrders: { type: DataTypes.INTEGER, defaultValue: 0 },
  payoutMethod: { type: DataTypes.STRING(50) },
  bankDetails: { type: DataTypes.JSON, defaultValue: {} },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  avatar: { type: DataTypes.STRING(500), allowNull: true },
  followers: { type: DataTypes.STRING(50), allowNull: true, defaultValue: '0' },
  handle: { type: DataTypes.STRING(100), allowNull: true },
  productsCurated: { type: DataTypes.INTEGER, defaultValue: 0 },
  socialMedia: { type: DataTypes.JSON, defaultValue: [] },
  documentProof: { type: DataTypes.STRING(500), allowNull: true },
});

module.exports = Affiliate;
