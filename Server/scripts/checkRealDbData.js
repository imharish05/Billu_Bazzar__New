'use strict';
const { Product, ProductVariant, Category, SubCategory, SubSubCategory, Vendor, Warehouse } = require('../models');
const sequelize = require('../config/db');

async function dumpFullData() {
  await sequelize.authenticate();
  const product = await Product.findByPk(33, {
    include: [
      { model: Category, as: 'category' },
      { model: SubCategory, as: 'subcategory' },
      { model: SubSubCategory, as: 'subsubcategory' },
      { model: Vendor, as: 'vendor' },
      { model: Warehouse, as: 'warehouse' },
      { model: ProductVariant, as: 'variants' }
    ]
  });

  console.log('--- REAL PRODUCT 33 FROM DB ---');
  console.log(JSON.stringify(product, null, 2));

  const variant = await ProductVariant.findByPk(9, {
    include: [
      { model: Product, as: 'product' },
      { model: Warehouse, as: 'warehouse' }
    ]
  });

  console.log('--- REAL VARIANT 9 FROM DB ---');
  console.log(JSON.stringify(variant, null, 2));

  process.exit(0);
}

dumpFullData().catch(err => {
  console.error(err);
  process.exit(1);
});
