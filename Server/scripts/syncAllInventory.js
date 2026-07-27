'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Product, ProductVariant, Warehouse, WarehouseStock } = require('../models');
const sequelize = require('../config/db');

async function syncAllInventory() {
  console.log('--- STARTING INVENTORY & WAREHOUSE SYNC ---');
  await sequelize.authenticate();

  // 1. Resolve Primary Fulfillment Hub (India) and Procurement Source (Dubai)
  let primaryWh = await Warehouse.findOne({ where: { isFulfillment: true, isActive: true } });
  if (!primaryWh) {
    primaryWh = await Warehouse.findOne({ where: { isActive: true } });
    if (primaryWh) {
      await primaryWh.update({ isFulfillment: true });
      console.log(`[Sync] Designated Warehouse #${primaryWh.id} (${primaryWh.name}) as Primary Fulfillment Hub`);
    } else {
      primaryWh = await Warehouse.create({
        name: 'India Central Fulfillment Warehouse',
        code: 'WH-IND-01',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        isFulfillment: true,
        isActive: true,
      });
      console.log(`[Sync] Created Primary Fulfillment Warehouse #${primaryWh.id}`);
    }
  }

  // Ensure Dubai Procurement Source exists for completeness if not already created
  let dubaiWh = await Warehouse.findOne({ where: { code: 'WH-DXB-01' } });
  if (!dubaiWh) {
    dubaiWh = await Warehouse.create({
      name: 'Dubai Procurement Depot',
      code: 'WH-DXB-01',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      isFulfillment: false,
      isActive: true,
    });
    console.log(`[Sync] Created Dubai Procurement Warehouse #${dubaiWh.id}`);
  }

  // 2. Fetch all products with variants
  const products = await Product.findAll({
    include: [{ model: ProductVariant, as: 'variants' }]
  });

  console.log(`[Sync] Processing ${products.length} products...`);

  let syncedProducts = 0;
  let syncedVariants = 0;

  for (const prod of products) {
    const targetWhId = prod.warehouseId || primaryWh.id;
    if (!prod.warehouseId) {
      await prod.update({ warehouseId: targetWhId });
    }

    if (prod.variants && prod.variants.length > 0) {
      // Clean up duplicate parent stock (variantId: null) if product has variants
      await WarehouseStock.destroy({
        where: { productId: prod.id, variantId: null }
      });

      let totalVariantStock = 0;
      for (const varItem of prod.variants) {
        const vWhId = varItem.warehouseId || targetWhId;
        if (!varItem.warehouseId) {
          await varItem.update({ warehouseId: vWhId });
        }

        // Upsert WarehouseStock
        const [ws, created] = await WarehouseStock.findOrCreate({
          where: { warehouseId: vWhId, productId: prod.id, variantId: varItem.id },
          defaults: { quantity: varItem.stock || 0, reorderLevel: varItem.lowStockThreshold || 10 }
        });

        if (!created) {
          await ws.update({ quantity: varItem.stock || 0, reorderLevel: varItem.lowStockThreshold || 10 });
        }

        totalVariantStock += (parseInt(varItem.stock, 10) || 0);
        syncedVariants++;
      }

      // Update parent product stock and price
      const firstPrice = parseFloat(prod.variants[0].price) || prod.price;
      await prod.update({ stock: totalVariantStock, price: firstPrice });
    } else {
      // Product with no variants
      const [ws, created] = await WarehouseStock.findOrCreate({
        where: { warehouseId: targetWhId, productId: prod.id, variantId: null },
        defaults: { quantity: prod.stock || 0, reorderLevel: prod.lowStockThreshold || 10 }
      });

      if (!created) {
        await ws.update({ quantity: prod.stock || 0, reorderLevel: prod.lowStockThreshold || 10 });
      }
    }

    syncedProducts++;
  }

  console.log(`[Sync] Successfully synchronized ${syncedProducts} products and ${syncedVariants} variants across warehouses!`);
  console.log('--- INVENTORY SYNC COMPLETE ---');
  process.exit(0);
}

syncAllInventory().catch(err => {
  console.error('[Sync Error]:', err);
  process.exit(1);
});
