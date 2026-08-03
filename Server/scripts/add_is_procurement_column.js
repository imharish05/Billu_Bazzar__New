'use strict';
const { sequelize } = require('../models');

async function run() {
  try {
    console.log('Altering Warehouses table...');
    try {
      await sequelize.query("ALTER TABLE Warehouses ADD COLUMN isFulfillment BOOLEAN NOT NULL DEFAULT FALSE");
      console.log('✅ isFulfillment column added or verified');
    } catch (e) {
      console.log('isFulfillment note:', e.message);
    }

    try {
      await sequelize.query("ALTER TABLE Warehouses ADD COLUMN isProcurement BOOLEAN NOT NULL DEFAULT FALSE");
      console.log('✅ isProcurement column added or verified');
    } catch (e) {
      console.log('isProcurement note:', e.message);
    }

    console.log('Successfully completed Warehouses table column migration!');
    process.exit(0);
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
}

run();
