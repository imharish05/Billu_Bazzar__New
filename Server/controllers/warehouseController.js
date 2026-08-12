'use strict';
const { Op } = require('sequelize');
const { Warehouse, WarehouseStock, Product, ProductVariant, InventoryMovementLog, SiteSetting } = require('../models');

// Include product and variant information in stock lookups
const stockInclude = [
  { model: Product, as: 'product', attributes: ['id', 'name', 'slug', 'sku', 'stock', 'images'] },
  { model: ProductVariant, as: 'variant', attributes: ['id', 'sku', 'price', 'stock', 'attributes'] }
];

// Helper to sync main product/variant stock with warehouse stock across all active warehouses
const syncStorefrontStock = async (productId, variantId = null) => {
  try {
    const activeWhs = await Warehouse.findAll({ where: { isActive: true }, attributes: ['id'] });
    const activeWhIds = activeWhs.map(w => w.id);

    if (activeWhIds.length === 0) return;

    if (variantId) {
      const totalVarStock = await WarehouseStock.sum('quantity', {
        where: {
          productId,
          variantId,
          warehouseId: { [Op.in]: activeWhIds }
        }
      }) || 0;

      const variant = await ProductVariant.findByPk(variantId);
      if (variant) {
        await variant.update({ stock: totalVarStock });
      }

      const allVars = await ProductVariant.findAll({ where: { productId } });
      const totalStock = allVars.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
      const product = await Product.findByPk(productId);
      if (product) await product.update({ stock: totalStock });
    } else {
      const allVars = await ProductVariant.findAll({ where: { productId } });
      if (allVars.length > 0) {
        let totalProductStock = 0;
        for (const v of allVars) {
          const varQty = await WarehouseStock.sum('quantity', {
            where: {
              productId,
              variantId: v.id,
              warehouseId: { [Op.in]: activeWhIds }
            }
          }) || 0;
          await v.update({ stock: varQty });
          totalProductStock += varQty;
        }
        const product = await Product.findByPk(productId);
        if (product) await product.update({ stock: totalProductStock });
      } else {
        const totalProdStock = await WarehouseStock.sum('quantity', {
          where: {
            productId,
            variantId: null,
            warehouseId: { [Op.in]: activeWhIds }
          }
        }) || 0;

        const product = await Product.findByPk(productId);
        if (product) await product.update({ stock: totalProdStock });
      }
    }
  } catch (err) {
    console.error('[syncStorefrontStock] Error:', err.message);
  }
};

const getAll = async (req, res) => {
  try {
    const warehouses = await Warehouse.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: WarehouseStock, as: 'stocks', include: stockInclude }],
    });
    res.json({ success: true, warehouses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id, {
      include: [{ model: WarehouseStock, as: 'stocks', include: stockInclude }],
    });
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });
    res.json({ success: true, warehouse });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  const transaction = await Warehouse.sequelize.transaction();
  try {
    if (req.body.contactPhone && req.body.contactPhone.trim()) {
      const cleanPhone = req.body.contactPhone.trim().replace(/^\+/, '').replace(/[\s\-()]/g, '');
      if (!/^\d{7,15}$/.test(cleanPhone)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Invalid contact phone number format. Phone number must contain 7 to 15 digits.' });
      }
    }

    const existingCount = await Warehouse.count({ transaction });

    // Mandatory single fulfillment hub check:
    // If set to fulfillment OR if this is the very first warehouse, make it fulfillment
    let makeFulfillment = !!req.body.isFulfillment || existingCount === 0;

    if (makeFulfillment) {
      // Unset fulfillment on all other warehouses
      await Warehouse.update({ isFulfillment: false }, { where: {}, transaction });
    }

    const warehouseData = {
      ...req.body,
      isFulfillment: makeFulfillment,
    };

    const warehouse = await Warehouse.create(warehouseData, { transaction });
    await transaction.commit();
    res.status(201).json({ success: true, warehouse });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  const transaction = await Warehouse.sequelize.transaction();
  try {
    if (req.body.contactPhone && req.body.contactPhone.trim()) {
      const cleanPhone = req.body.contactPhone.trim().replace(/^\+/, '').replace(/[\s\-()]/g, '');
      if (!/^\d{7,15}$/.test(cleanPhone)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Invalid contact phone number format. Phone number must contain 7 to 15 digits.' });
      }
    }

    const warehouse = await Warehouse.findByPk(req.params.id, { transaction });
    if (!warehouse) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    const isFulfillmentRequested = req.body.isFulfillment;

    // Single Mandatory Fulfillment Hub Enforcement:
    if (isFulfillmentRequested === true) {
      // Unset fulfillment on all other warehouses
      await Warehouse.update(
        { isFulfillment: false },
        { where: { id: { [Op.ne]: warehouse.id } }, transaction }
      );
    } else if (isFulfillmentRequested === false && warehouse.isFulfillment === true) {
      // User is attempting to uncheck fulfillment on the current fulfillment hub.
      // Check if any other warehouse exists to serve as fulfillment hub
      const otherWh = await Warehouse.findOne({
        where: { id: { [Op.ne]: warehouse.id }, isActive: true },
        transaction
      });

      if (!otherWh) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'System requires at least one mandatory fulfillment hub. You cannot unmark this warehouse without setting another warehouse as fulfillment hub.'
        });
      }

      // Automatically promote the other active warehouse to be fulfillment hub
      await otherWh.update({ isFulfillment: true }, { transaction });
    }

    await warehouse.update(req.body, { transaction });
    await transaction.commit();
    res.json({ success: true, warehouse });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  const transaction = await Warehouse.sequelize.transaction();
  try {
    const warehouse = await Warehouse.findByPk(req.params.id, { transaction });
    if (!warehouse) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    // Check if this was the fulfillment warehouse
    if (warehouse.isFulfillment) {
      const nextWh = await Warehouse.findOne({
        where: { id: { [Op.ne]: warehouse.id }, isActive: true },
        transaction
      });
      if (nextWh) {
        await nextWh.update({ isFulfillment: true }, { transaction });
      }
    }

    // Hard delete related stock and logs to prevent FK constraint failures
    await WarehouseStock.destroy({ where: { warehouseId: warehouse.id }, transaction });
    await InventoryMovementLog.destroy({
      where: {
        [Op.or]: [
          { warehouseId: warehouse.id },
          { toWarehouseId: warehouse.id }
        ]
      },
      transaction
    });

    await warehouse.destroy({ transaction });
    await transaction.commit();
    res.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/warehouses/alerts/low-stock
const getLowStockAlerts = async (req, res) => {
  try {
    // 1. Fetch global threshold setting
    let globalThreshold = 10;
    const invSetting = await SiteSetting.findOne({ where: { key: 'inventory' } });
    if (invSetting && invSetting.value) {
      try {
        const parsed = JSON.parse(invSetting.value);
        if (parsed.globalLowStockThreshold !== undefined) {
          globalThreshold = parseInt(parsed.globalLowStockThreshold, 10) || 10;
        }
      } catch (e) {
        console.error('Error parsing inventory settings:', e);
      }
    }

    // 2. Fetch all warehouse stocks
    const stocks = await WarehouseStock.findAll({
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'code', 'isFulfillment'] },
        ...stockInclude
      ],
      order: [['quantity', 'ASC']]
    });

    // 3. Filter stocks where quantity <= custom reorderLevel OR quantity <= globalThreshold
    const lowStockItems = stocks.filter(item => {
      const limit = (item.reorderLevel !== undefined && item.reorderLevel !== null)
        ? Math.min(item.reorderLevel, globalThreshold)
        : globalThreshold;
      return item.quantity <= limit;
    });

    res.json({
      success: true,
      globalThreshold,
      alerts: lowStockItems.map(item => ({
        id: item.id,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse?.name || 'Warehouse',
        productId: item.productId,
        productName: item.product?.name || 'Product',
        variantId: item.variantId,
        sku: item.variant?.sku || item.product?.sku || 'N/A',
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        thresholdUsed: Math.min(item.reorderLevel || globalThreshold, globalThreshold),
        attributes: item.variant?.attributes || null,
        message: `Low stock alert: "${item.product?.name || 'Item'}" has dropped to ${item.quantity} units in ${item.warehouse?.name || 'Warehouse'}!`
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStock = async (req, res) => {
  try {
    const where = { warehouseId: req.params.id };
    if (req.query.lowStock === 'true') {
      where.quantity = { [Op.lte]: WarehouseStock.sequelize.col('reorderLevel') };
    }
    const stocks = await WarehouseStock.findAll({
      where,
      include: stockInclude,
      order: [['quantity', 'ASC']]
    });
    // Filter out orphaned stocks where product does not exist
    const validStocks = stocks.filter(s => s.product != null);
    res.json({ success: true, stocks: validStocks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const upsertStock = async (req, res) => {
  const transaction = await WarehouseStock.sequelize.transaction();
  try {
    const { productId, variantId, quantity = 0, reservedQty = 0, reorderLevel = 10 } = req.body;
    const warehouseId = req.params.id;

    if (!productId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'productId is required' });
    }

    const [stock, created] = await WarehouseStock.findOrCreate({
      where: { warehouseId, productId, variantId: variantId || null },
      defaults: { warehouseId, productId, variantId: variantId || null, quantity, reservedQty, reorderLevel },
      transaction
    });

    const oldQty = created ? 0 : stock.quantity;

    if (!created) {
      await stock.update({ quantity, reservedQty, reorderLevel }, { transaction });
    }

    // Log the movement
    await InventoryMovementLog.create({
      productId,
      variantId: variantId || null,
      warehouseId,
      quantity: quantity - oldQty,
      type: 'MANUAL_ADJUSTMENT',
      reason: 'Manual adjustment from warehouse stock admin panel',
    }, { transaction });

    await transaction.commit();

    // Sync storefront/catalog stock
    await syncStorefrontStock(productId, variantId);

    res.json({ success: true, stock });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/warehouses/transfer
const transferStock = async (req, res) => {
  const transaction = await WarehouseStock.sequelize.transaction();
  try {
    const { fromWarehouseId, toWarehouseId, productId, variantId, quantity, items } = req.body;

    if (!fromWarehouseId || !toWarehouseId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'fromWarehouseId and toWarehouseId are required' });
    }

    const transferItems = Array.isArray(items) && items.length > 0
      ? items
      : (productId && quantity ? [{ productId, variantId: variantId || null, quantity: parseInt(quantity, 10) }] : []);

    if (transferItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'No valid items specified for transfer' });
    }

    for (const item of transferItems) {
      const pId = item.productId;
      const vId = item.variantId || null;
      const qty = parseInt(item.quantity, 10);

      if (!pId || !qty || qty <= 0) continue;

      const sourceStock = await WarehouseStock.findOne({
        where: { warehouseId: fromWarehouseId, productId: pId, variantId: vId },
        transaction
      });

      if (!sourceStock || sourceStock.quantity < qty) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock in source warehouse for Product #${pId}. Available: ${sourceStock ? sourceStock.quantity : 0}`
        });
      }

      await sourceStock.decrement('quantity', { by: qty, transaction });

      const [targetStock] = await WarehouseStock.findOrCreate({
        where: { warehouseId: toWarehouseId, productId: pId, variantId: vId },
        defaults: { warehouseId: toWarehouseId, productId: pId, variantId: vId, quantity: 0 },
        transaction
      });

      await targetStock.increment('quantity', { by: qty, transaction });

      await InventoryMovementLog.create({
        productId: pId,
        variantId: vId,
        warehouseId: fromWarehouseId,
        toWarehouseId,
        quantity: qty,
        type: 'MANUAL_ADJUSTMENT',
        reason: `Stock transfer of ${qty} units from warehouse #${fromWarehouseId} to warehouse #${toWarehouseId}`,
      }, { transaction });
    }

    await transaction.commit();

    // Sync storefront stock for all transferred items
    for (const item of transferItems) {
      await syncStorefrontStock(item.productId, item.variantId || null);
    }

    res.json({ success: true, message: `Successfully transferred ${transferItems.length} item(s)` });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper to resolve the target warehouse ID for a product or variant item
const resolveWarehouseIdForItem = async (productId, variantId = null, transaction = null) => {
  try {
    // 1. Check variant's explicit warehouseId
    if (variantId) {
      const variant = await ProductVariant.findByPk(variantId, { transaction });
      if (variant && variant.warehouseId) return variant.warehouseId;
    }

    // 2. Check product's explicit warehouseId
    if (productId) {
      const product = await Product.findByPk(productId, { transaction });
      if (product && product.warehouseId) return product.warehouseId;
    }

    // 3. Check if there is an existing WarehouseStock record for this item in an active warehouse
    const activeWhs = await Warehouse.findAll({ where: { isActive: true }, attributes: ['id'], transaction });
    const activeWhIds = activeWhs.map(w => w.id);

    if (activeWhIds.length > 0) {
      const existingStock = await WarehouseStock.findOne({
        where: {
          productId,
          variantId: variantId || null,
          warehouseId: { [Op.in]: activeWhIds }
        },
        order: [['quantity', 'DESC']],
        transaction
      });
      if (existingStock) return existingStock.warehouseId;
    }

    // 4. Fallback to primary fulfillment warehouse
    const fulfillmentWh = await Warehouse.findOne({ where: { isFulfillment: true, isActive: true }, transaction });
    if (fulfillmentWh) return fulfillmentWh.id;

    // 5. Fallback to any active warehouse
    const anyActiveWh = await Warehouse.findOne({ where: { isActive: true }, transaction });
    if (anyActiveWh) return anyActiveWh.id;

    // 6. If no active warehouse exists at all, auto-create a default fulfillment warehouse
    const defaultWh = await Warehouse.create({
      name: 'Main Fulfillment Hub',
      code: 'WH-MAIN',
      address: 'Main Facility',
      city: 'Default City',
      state: 'Default State',
      pincode: '600001',
      isFulfillment: true,
      isActive: true
    }, { transaction });

    return defaultWh.id;
  } catch (err) {
    console.error('[resolveWarehouseIdForItem] Error resolving warehouse:', err.message);
    return null;
  }
};

module.exports = { getAll, getOne, create, update, remove, getStock, upsertStock, transferStock, getLowStockAlerts, syncStorefrontStock, resolveWarehouseIdForItem };

