'use strict';
const { Op } = require('sequelize');
const { Product, ProductVariant, Warehouse, WarehouseStock, InventoryMovementLog } = require('../models');

// Helper to generate a unique SKU if not provided
const generateSku = (productId, attributes) => {
  const comboStr = attributes ? (typeof attributes === 'string' ? JSON.parse(attributes) : attributes) : {};
  const comboLabel = typeof comboStr === 'object' && comboStr ? Object.values(comboStr).filter(Boolean).join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') : '';
  const uniqueTag = Math.random().toString(36).substring(2, 6).toUpperCase();
  return comboLabel ? `SKU-PRD${productId}-${comboLabel}-${uniqueTag}` : `SKU-PRD${productId}-VAR-${uniqueTag}`;
};

// Helper to normalize file paths
const buildImagePath = (file) => {
  if (!file) return null;
  return '/' + file.path.replace(/\\/g, '/').replace(/^.*uploads\//, 'uploads/');
};

// Helper to sync variant stock into selected or default warehouse
const syncWarehouseStock = async (productId, variantId, stockQty, reorderLevel = 10, warehouseId = null) => {
  try {
    let targetWhId = warehouseId;
    if (!targetWhId) {
      const primaryWh = await Warehouse.findOne({ where: { isFulfillment: true, isActive: true } });
      if (!primaryWh) {
        console.warn('[SyncWarehouseStock] No primary fulfillment warehouse found');
        return;
      }
      targetWhId = primaryWh.id;
    }

    if (variantId) {
      const variant = await ProductVariant.findByPk(variantId);
      if (variant && (!variant.warehouseId || variant.warehouseId !== targetWhId)) {
        await variant.update({ warehouseId: targetWhId });
      }
    }

    // Destroy duplicate/outdated stock in other warehouses for this product variant
    await WarehouseStock.destroy({
      where: {
        productId,
        variantId: variantId || null,
        warehouseId: { [Op.ne]: targetWhId }
      }
    });

    const [ws, created] = await WarehouseStock.findOrCreate({
      where: { warehouseId: targetWhId, productId, variantId: variantId || null },
      defaults: { quantity: stockQty, reorderLevel },
    });

    if (!created) {
      await ws.update({ quantity: stockQty, reorderLevel });
    }

    // Log manual adjustment movement
    await InventoryMovementLog.create({
      productId,
      variantId: variantId || null,
      warehouseId: targetWhId,
      quantity: stockQty,
      type: 'MANUAL_ADJUSTMENT',
      reason: 'Sync from Variant CRUD',
    });
  } catch (err) {
    console.error('[SyncWarehouseStock] Error:', err.message);
  }
};

// Helper to sync variant details back to the main Product (price, stock, and attributes)
const syncProductVariants = async (productId) => {
  if (!productId) return;
  try {
    const product = await Product.findByPk(productId);
    if (!product) return;

    const variants = await ProductVariant.findAll({ where: { productId } });

    if (variants.length > 0) {
      // Clean up any orphan parent-level stock entries so they don't double count
      await WarehouseStock.destroy({ where: { productId, variantId: null } });

      // Find the lowest active variant price, or fallback to product price
      const validPrices = variants.map(v => parseFloat(v.price)).filter(p => !isNaN(p) && p > 0);
      const price = validPrices.length > 0 ? Math.min(...validPrices) : (parseFloat(product.price) || 0);

      const validAedPrices = variants.map(v => parseFloat(v.priceAED)).filter(p => !isNaN(p) && p > 0);
      const priceAED = validAedPrices.length > 0 ? Math.min(...validAedPrices) : (product.priceAED !== null && product.priceAED !== undefined ? parseFloat(product.priceAED) : null);

      const validMrps = variants.map(v => parseFloat(v.mrp)).filter(p => !isNaN(p) && p > 0);
      const comparePrice = validMrps.length > 0 ? Math.max(...validMrps) : (product.comparePrice ? parseFloat(product.comparePrice) : null);

      const validAedMrps = variants.map(v => parseFloat(v.mrpAED)).filter(p => !isNaN(p) && p > 0);
      const comparePriceAED = validAedMrps.length > 0 ? Math.max(...validAedMrps) : (product.comparePriceAED !== null && product.comparePriceAED !== undefined ? parseFloat(product.comparePriceAED) : null);

      const stock = variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
      const gstRate = variants[0].gstRate || product.gstRate || '0%';

      // Collect and aggregate attributes from all active variants
      const aggregatedAttrs = {};
      variants.forEach(v => {
        const vAttrs = typeof v.attributes === 'string' ? (JSON.parse(v.attributes) || {}) : (v.attributes || {});
        Object.entries(vAttrs).forEach(([k, val]) => {
          if (!k || val === undefined || val === null) return;
          const cleanK = k.trim();
          const cleanVal = String(val).trim();
          if (!cleanK || !cleanVal) return;

          if (!aggregatedAttrs[cleanK]) {
            aggregatedAttrs[cleanK] = [cleanVal];
          } else if (!aggregatedAttrs[cleanK].includes(cleanVal)) {
            aggregatedAttrs[cleanK].push(cleanVal);
          }
        });
      });

      const finalAttributes = {};
      Object.entries(aggregatedAttrs).forEach(([k, vals]) => {
        finalAttributes[k] = vals.join(', ');
      });

      await product.update({ price, priceAED, comparePrice, comparePriceAED, stock, gstRate, attributes: finalAttributes });
    }
  } catch (err) {
    console.error('[syncProductVariants] Error:', err.message);
  }
};

// GET /api/variants
const getAll = async (req, res) => {
  try {
    const variants = await ProductVariant.findAll({
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'slug'] },
        { model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'city'] },
        {
          model: WarehouseStock,
          as: 'stocks',
          include: [{ model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'city'] }]
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    const primaryWh = await Warehouse.findOne({ where: { isFulfillment: true, isActive: true } });

    const formattedVariants = variants.map(v => {
      const vJson = v.toJSON();
      if (!vJson.warehouse) {
        vJson.warehouse = vJson.stocks?.[0]?.warehouse || (primaryWh ? { id: primaryWh.id, name: primaryWh.name, city: primaryWh.city } : null);
      }
      return vJson;
    });

    res.json({ success: true, variants: formattedVariants });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/variants/product/:productId
const getByProduct = async (req, res) => {
  try {
    const variants = await ProductVariant.findAll({
      where: { productId: req.params.productId },
      order: [['createdAt', 'ASC']],
    });
    res.json({ success: true, variants });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/variants/add
const add = async (req, res) => {
  try {
    const { productId, sku, price, priceAED, mrp, mrpAED, stock, attributes, warehouseId } = req.body;

    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });
    if (price !== undefined && Number(price) < 0) return res.status(400).json({ success: false, message: 'Price cannot be negative' });
    if (stock !== undefined && Number(stock) < 0) return res.status(400).json({ success: false, message: 'Stock cannot be negative' });

    const finalSku = (sku && sku.trim() !== '') ? sku.trim() : generateSku(productId, attributes);

    // Check SKU conflicts
    const conflict = await ProductVariant.findOne({ where: { sku: finalSku } });
    if (conflict) {
      return res.status(400).json({ success: false, message: `SKU "${finalSku}" is already in use` });
    }

    // Process file uploads (up to 10 images per variant)
    let existingImagesParsed = [];
    if (req.body.existingImages) {
      try { existingImagesParsed = JSON.parse(req.body.existingImages); }
      catch (e) { existingImagesParsed = Array.isArray(req.body.existingImages) ? req.body.existingImages : []; }
    }

    let galleryPaths = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        const p = buildImagePath(file);
        if (p) galleryPaths.push(p);
      });
    } else if (req.file) {
      const p = buildImagePath(req.file);
      if (p) galleryPaths.push(p);
    }

    const allImages = [...existingImagesParsed, ...galleryPaths].slice(0, 10);
    const mainVarImg = allImages.length > 0 ? allImages[0] : null;

    let parsedAttributes = attributes || {};
    if (typeof attributes === 'string') {
      try { parsedAttributes = JSON.parse(attributes); } catch (e) { parsedAttributes = {}; }
    }

    // Check if variant with identical attributes already exists for this product
    const existingVariants = await ProductVariant.findAll({ where: { productId: parseInt(productId, 10) } });
    const isDuplicate = existingVariants.some(v => {
      const vAttrs = v.attributes || {};
      const keysA = Object.keys(vAttrs).sort();
      const keysB = Object.keys(parsedAttributes).sort();
      if (keysA.length !== keysB.length) return false;
      return keysA.every(k => String(vAttrs[k]).trim().toLowerCase() === String(parsedAttributes[k]).trim().toLowerCase());
    });

    if (isDuplicate) {
      return res.status(400).json({ success: false, message: 'A variant with this combination of option attributes already exists for this product.' });
    }

    const { lowStockThreshold } = req.body;

    // Auto-inherit GST from parent product — variant does not accept manual gstRate override
    const parentProduct = await Product.findByPk(parseInt(productId, 10));
    const inheritedGstRate = parentProduct?.gstRate || '0%';

    const variant = await ProductVariant.create({
      productId: parseInt(productId, 10),
      sku: finalSku,
      price: price === '' || price === undefined ? null : parseFloat(price),
      priceAED: priceAED === '' || priceAED === undefined || priceAED === null ? null : parseFloat(priceAED),
      mrp: mrp === '' || mrp === undefined ? null : parseFloat(mrp),
      mrpAED: mrpAED === '' || mrpAED === undefined || mrpAED === null ? null : parseFloat(mrpAED),
      stock: stock === '' || stock === undefined ? 0 : parseInt(stock, 10),
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold, 10) : 10,
      gstRate: inheritedGstRate,
      attributes: parsedAttributes,
      image: mainVarImg,
      images: allImages.slice(0, 5),
      warehouseId: warehouseId ? parseInt(warehouseId, 10) : null
    });

    // Sync warehouse stock
    await syncWarehouseStock(variant.productId, variant.id, variant.stock, variant.lowStockThreshold, variant.warehouseId);

    // Sync product price and stock
    await syncProductVariants(variant.productId);

    res.status(201).json({ success: true, variant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/variants/update/:id
const update = async (req, res) => {
  try {
    const variant = await ProductVariant.findByPk(req.params.id);
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });

    const { sku, price, priceAED, mrp, mrpAED, stock, attributes, warehouseId, lowStockThreshold } = req.body;

    // Always re-inherit GST from parent product on update
    const parentProduct = await Product.findByPk(variant.productId);
    const inheritedGstRate = parentProduct?.gstRate || variant.gstRate || '0%';

    if (price !== undefined && Number(price) < 0) return res.status(400).json({ success: false, message: 'Price cannot be negative' });
    if (stock !== undefined && Number(stock) < 0) return res.status(400).json({ success: false, message: 'Stock cannot be negative' });

    if (sku && sku.trim() !== variant.sku) {
      const conflict = await ProductVariant.findOne({ where: { sku: sku.trim(), id: { [Op.ne]: variant.id } } });
      if (conflict) {
        return res.status(400).json({ success: false, message: `SKU "${sku}" is already in use` });
      }
    }

    const updates = {
      ...(sku !== undefined && { sku: sku.trim() }),
      ...(price !== undefined && { price: price === '' ? null : parseFloat(price) }),
      ...(priceAED !== undefined && { priceAED: (priceAED === '' || priceAED === 'null' || priceAED === null) ? null : parseFloat(priceAED) }),
      ...(mrp !== undefined && { mrp: mrp === '' ? null : parseFloat(mrp) }),
      ...(mrpAED !== undefined && { mrpAED: (mrpAED === '' || mrpAED === 'null' || mrpAED === null) ? null : parseFloat(mrpAED) }),
      ...(stock !== undefined && { stock: stock === '' ? 0 : parseInt(stock, 10) }),
      ...(lowStockThreshold !== undefined && { lowStockThreshold: parseInt(lowStockThreshold, 10) }),
      gstRate: inheritedGstRate,
      ...(warehouseId !== undefined && { warehouseId: warehouseId === '' || warehouseId === 'null' ? null : parseInt(warehouseId, 10) }),
    };

    if (attributes !== undefined) {
      let parsedAttributes = attributes;
      if (typeof attributes === 'string') {
        try { parsedAttributes = JSON.parse(attributes); } catch (e) { parsedAttributes = {}; }
      }
      updates.attributes = parsedAttributes;
    }

    // Process file uploads (up to 10 images per variant)
    let existingImagesParsed = [];
    if (req.body.existingImages) {
      try { existingImagesParsed = JSON.parse(req.body.existingImages); }
      catch (e) { existingImagesParsed = Array.isArray(req.body.existingImages) ? req.body.existingImages : []; }
    } else if (variant.images) {
      existingImagesParsed = variant.images;
    }

    let galleryPaths = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        const p = buildImagePath(file);
        if (p) galleryPaths.push(p);
      });
    } else if (req.file) {
      const p = buildImagePath(req.file);
      if (p) galleryPaths.push(p);
    }

    if (req.body.existingImages || galleryPaths.length > 0) {
      const allImages = [...existingImagesParsed, ...galleryPaths].slice(0, 10);
      updates.images = allImages;
      updates.image = allImages.length > 0 ? allImages[0] : null;
    }

    await variant.update(updates);

    if (stock !== undefined || warehouseId !== undefined) {
      // Sync warehouse stock
      await syncWarehouseStock(variant.productId, variant.id, variant.stock, 10, variant.warehouseId);
    }

    // Sync product price and stock
    await syncProductVariants(variant.productId);

    const fresh = await ProductVariant.findByPk(variant.id);
    res.json({ success: true, variant: fresh });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/variants/:id
const remove = async (req, res) => {
  try {
    const variant = await ProductVariant.findByPk(req.params.id);
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });

    const productId = variant.productId;

    // Fetch all variants for this product ordered by id ASC (oldest = primary)
    const productVariants = await ProductVariant.findAll({
      where: { productId },
      order: [['id', 'ASC']]
    });

    // ── CASE 1: Last remaining variant ──────────────────────────────────────────
    // Delete variant + cascade delete the parent product entirely
    if (productVariants.length <= 1) {
      // Destroy variant stock records
      await WarehouseStock.destroy({ where: { variantId: variant.id } });
      await variant.destroy();

      // Cascade: remove orphan parent product and all its remaining stock
      const { Product } = require('../models');
      const product = await Product.findByPk(productId);
      if (product) {
        // Clean up any parent-level stock entries
        await WarehouseStock.destroy({ where: { productId, variantId: null } });
        await product.destroy();
      }

      return res.json({
        success: true,
        cascadeDeletedProduct: true,
        productId,
        message: 'Last variant removed — parent product has also been deleted from the catalog.'
      });
    }

    // ── CASE 2: Multiple variants exist ─────────────────────────────────────────
    // Allow deleting any variant (including the current first/default).
    // The next available variant will automatically become the new primary via syncProductVariants.

    // Destroy associated stock records first
    await WarehouseStock.destroy({ where: { variantId: variant.id } });

    await variant.destroy();

    // Re-sync parent product (price, stock, attributes) from remaining variants
    await syncProductVariants(productId);

    res.json({
      success: true,
      cascadeDeletedProduct: false,
      message: 'Variant deleted successfully. Product default has been updated to the next available variant.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getByProduct, add, update, remove, syncProductVariants, syncWarehouseStock };
