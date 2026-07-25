'use strict';
require('dotenv').config();
const sequelize = require('../config/db');

async function fixVendorTable() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const queryInterface = sequelize.getQueryInterface();
    const vendorDesc = await queryInterface.describeTable('Vendors').catch(() => null);

    if (vendorDesc) {
      if (!vendorDesc.contactPerson) {
        await sequelize.query("ALTER TABLE Vendors ADD COLUMN contactPerson VARCHAR(150) NULL AFTER name");
        console.log('✅ Added contactPerson column to Vendors table.');
      } else {
        console.log('ℹ️ contactPerson column already exists in Vendors table.');
      }
    } else {
      console.log('ℹ️ Vendors table does not exist yet. Will be created on server restart.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating Vendors table:', err.message);
    process.exit(1);
  }
}

fixVendorTable();
