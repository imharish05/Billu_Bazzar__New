'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Product, ProductVariant, WarehouseStock } = require('../models');
const sequelize = require('../config/db');
const { Op } = require('sequelize');

async function cleanOrphans() {
  console.log('--- STARTING ORPHAN WAREHOUSE STOCK CLEANUP ---');
  await sequelize.authenticate();

  try {
    await sequelize.query("ALTER TABLE Warehouses ADD COLUMN isProcurement BOOLEAN NOT NULL DEFAULT FALSE");
    console.log('✅ Warehouses table isProcurement column added');
  } catch (e) {}

  // Get all valid product IDs
  const validProducts = await Product.findAll({ attributes: ['id'] });
  const validProdIds = new Set(validProducts.map(p => p.id));

  // Get all valid variant IDs
  const validVariants = await ProductVariant.findAll({ attributes: ['id'] });
  const validVarIds = new Set(validVariants.map(v => v.id));

  // Get all warehouse stocks
  const allStocks = await WarehouseStock.findAll();
  console.log(`Total WarehouseStock records before cleanup: ${allStocks.length}`);

  let deletedCount = 0;
  for (const stock of allStocks) {
    let isOrphan = false;

    // Check if productId is invalid
    if (!validProdIds.has(stock.productId)) {
      isOrphan = true;
    }

    // Check if variantId is set but invalid
    if (stock.variantId && !validVarIds.has(stock.variantId)) {
      isOrphan = true;
    }

    if (isOrphan) {
      console.log(`Deleting orphan WarehouseStock #${stock.id} (productId: ${stock.productId}, variantId: ${stock.variantId})`);
      await stock.destroy();
      deletedCount++;
    }
  }

  console.log(`[Cleanup] Deleted ${deletedCount} orphaned WarehouseStock records!`);

  // Run inventory sync to re-verify
  const { Product: ProdModel, ProductVariant: VarModel, Warehouse: WhModel } = require('../models');
  const primaryWh = await WhModel.findOne({ where: { isFulfillment: true, isActive: true } });
  
  if (primaryWh) {
    const activeProducts = await ProdModel.findAll({ include: [{ model: VarModel, as: 'variants' }] });
    for (const p of activeProducts) {
      if (p.variants && p.variants.length > 0) {
        // Remove parent stock if variants exist
        await WarehouseStock.destroy({ where: { productId: p.id, variantId: null } });
      }
    }
  }

  console.log('--- CLEANUP COMPLETE ---');
  process.exit(0);
}

cleanOrphans().catch(err => {
  console.error('[Cleanup Error]:', err);
  process.exit(1);
});
