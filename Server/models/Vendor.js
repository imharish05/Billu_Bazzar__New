'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Vendor = sequelize.define('Vendor', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  contactPerson: { type: DataTypes.STRING(150) },
  email: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  phone: { type: DataTypes.STRING(20) },
  address: { type: DataTypes.JSON, defaultValue: {} },
  gstin: { type: DataTypes.STRING(20) },
  commissionRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 10.0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  logo: { type: DataTypes.STRING(500) },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 4.0 },
});

module.exports = Vendor;
