'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(20) },
  avatar: { type: DataTypes.STRING(500) },
  address: { type: DataTypes.JSON, defaultValue: {} },
  loyaltyPoints: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  referralCode: { type: DataTypes.STRING(20), unique: true },
  preferredCurrency: { type: DataTypes.STRING(5), defaultValue: 'INR' },
  whatsappOptIn: { type: DataTypes.BOOLEAN, defaultValue: false },
  passwordResetToken: { type: DataTypes.STRING(128), allowNull: true, defaultValue: null },
  passwordResetExpiry: { type: DataTypes.DATE, allowNull: true, defaultValue: null }
});

module.exports = Customer;
