'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Warehouse = sequelize.define('Warehouse', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  code: { type: DataTypes.STRING(20), unique: true },
  address: { type: DataTypes.JSON, defaultValue: {} },
  city: { type: DataTypes.STRING(80) },
  state: { type: DataTypes.STRING(80) },
  pincode: { type: DataTypes.STRING(10) },
  contactName: { type: DataTypes.STRING(100) },
  contactPhone: { type: DataTypes.STRING(20) },
  isFulfillment: { type: DataTypes.BOOLEAN, defaultValue: false },
  isProcurement: { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
});

module.exports = Warehouse;
