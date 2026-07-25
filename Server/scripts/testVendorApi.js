'use strict';
require('dotenv').config();
const { Vendor, Product } = require('../models');

async function testVendors() {
  try {
    console.log('Testing Vendor.findAll query...');
    const vendors = await Vendor.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: Product, as: 'products', attributes: ['id', 'name', 'slug', 'stock'] }],
    });
    console.log(`✅ Query successful! Found ${vendors.length} vendors.`);
    if (vendors.length > 0) {
      console.log('Sample vendor:', JSON.stringify(vendors[0], null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Query Failed:', err);
    process.exit(1);
  }
}

testVendors();
