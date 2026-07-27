'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DeliveryZone = sequelize.define('DeliveryZone', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  pincode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
  },
  zoneName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Standard',
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deliveryCharge: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  minOrderAmountForFreeDelivery: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'DeliveryZones',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['pincode'] },
    { fields: ['isActive'] },
    { fields: ['zoneName'] }
  ]
});

module.exports = DeliveryZone;
