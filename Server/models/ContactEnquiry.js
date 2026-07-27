'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContactEnquiry = sequelize.define('ContactEnquiry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'General Inquiry',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'ContactEnquiries',
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['status'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = ContactEnquiry;
