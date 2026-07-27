'use strict';
const { StockAlert, Product, ProductVariant, Customer } = require('../models');
const { sendRestockAlertEmail } = require('../services/emailService');

/**
 * @desc Create a new Stock Alert (Restock Notification Request)
 * @route POST /api/stock-alerts
 * @access Public (Guest or Authenticated Customer)
 */
const createStockAlert = async (req, res) => {
  try {
    const { productId, variantId, variantAttributes, selectedVariant, email, phone } = req.body;
    const customerId = req.customer?.id || null;

    if (!productId || !email) {
      return res.status(400).json({ success: false, message: 'Product ID and email address are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const finalSelectedVariant = selectedVariant || variantAttributes || null;

    // Verify product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    let targetVariantId = variantId || null;

    // If variantId not sent directly, attempt matching by attributes
    if (!targetVariantId && finalSelectedVariant && Object.keys(finalSelectedVariant).length > 0) {
      const variants = await ProductVariant.findAll({ where: { productId } });
      const matched = variants.find(v => {
        let attrs = v.attributes;
        if (typeof attrs === 'string') {
          try { attrs = JSON.parse(attrs); } catch (e) { attrs = {}; }
        }
        if (!attrs) return false;
        return Object.keys(finalSelectedVariant).every(k =>
          String(attrs[k]).toLowerCase() === String(finalSelectedVariant[k]).toLowerCase()
        );
      });
      if (matched) {
        targetVariantId = matched.id;
      }
    }

    // Check if alert already exists for this email, product, and variant (not yet notified)
    const existingAlert = await StockAlert.findOne({
      where: {
        productId,
        ...(targetVariantId ? { variantId: targetVariantId } : {}),
        email: trimmedEmail,
        isNotified: false,
      }
    });

    if (existingAlert) {
      return res.status(200).json({
        success: true,
        message: `You are already subscribed to restock alerts for "${product.name}". We'll notify ${trimmedEmail} when it's available!`,
        alert: existingAlert
      });
    }

    const newAlert = await StockAlert.create({
      productId,
      variantId: targetVariantId,
      selectedVariant: finalSelectedVariant,
      customerId,
      email: trimmedEmail,
      phone: phone || null,
      isNotified: false
    });

    return res.status(201).json({
      success: true,
      message: `Restock alert set! We will email ${trimmedEmail} as soon as "${product.name}" is back in stock.`,
      alert: newAlert
    });
  } catch (error) {
    console.error('Error creating stock alert:', error);
    return res.status(500).json({ success: false, message: 'Failed to create restock alert.', error: error.message });
  }
};

/**
 * @desc Get all Stock Alerts (for Admin Dashboard)
 * @route GET /api/stock-alerts
 * @access Admin
 */
const getStockAlerts = async (req, res) => {
  try {
    const alerts = await StockAlert.findAll({
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'slug', 'stock', 'images', 'defaultProductImage', 'price'],
          include: [
            { model: ProductVariant, as: 'variants', attributes: ['id', 'sku', 'stock', 'price', 'mrp', 'attributes', 'image'] }
          ]
        },
        { model: ProductVariant, as: 'variant', attributes: ['id', 'sku', 'stock', 'price', 'mrp', 'attributes', 'image'] },
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const resolvedAlerts = alerts.map(alert => {
      const alertData = alert.toJSON();
      let alertVariant = alertData.variant;

      // If variant is null but product has variants:
      if (!alertVariant && alertData.product && alertData.product.variants && alertData.product.variants.length > 0) {
        const prodVariants = alertData.product.variants;
        let selAttrs = alertData.selectedVariant;

        if (selAttrs) {
          if (typeof selAttrs === 'string') {
            try { selAttrs = JSON.parse(selAttrs); } catch (e) { selAttrs = null; }
          }
        }

        if (selAttrs && typeof selAttrs === 'object' && Object.keys(selAttrs).length > 0) {
          // Attempt exact match with selectedVariant JSON attributes
          const match = prodVariants.find(v => {
            let attrs = v.attributes;
            if (typeof attrs === 'string') {
              try { attrs = JSON.parse(attrs); } catch (e) { attrs = {}; }
            }
            if (!attrs) return false;
            return Object.keys(selAttrs).every(k =>
              String(attrs[k] || '').toLowerCase() === String(selAttrs[k] || '').toLowerCase()
            );
          });
          if (match) alertVariant = match;
        }

        // If still no variant matched, pick the out-of-stock variant (stock <= 0) or fallback to first variant
        if (!alertVariant) {
          alertVariant = prodVariants.find(v => v.stock !== undefined && parseInt(v.stock, 10) <= 0) || prodVariants[0];
        }
      }

      return {
        ...alertData,
        variant: alertVariant
      };
    });

    return res.json({ success: true, alerts: resolvedAlerts });
  } catch (error) {
    console.error('Error fetching stock alerts:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stock alerts.', error: error.message });
  }
};

/**
 * @desc Trigger manual notification for a Stock Alert
 * @route PUT /api/stock-alerts/:id/notify
 * @access Admin
 */
const notifyStockAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await StockAlert.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['name', 'slug', 'defaultProductImage', 'images'] },
        { model: ProductVariant, as: 'variant', attributes: ['id', 'sku', 'stock', 'price', 'attributes', 'image'] }
      ]
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Stock alert not found.' });
    }

    const prodImg = alert.variant?.image || alert.product?.defaultProductImage || (alert.product?.images && alert.product?.images[0]) || '';
    
    let variantTitle = '';
    let attrs = alert.variant?.attributes || alert.selectedVariant;
    if (attrs) {
      if (typeof attrs === 'string') {
        try { attrs = JSON.parse(attrs); } catch (e) {}
      }
      if (typeof attrs === 'object') {
        variantTitle = Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(' | ');
      }
    }

    const fullProductName = alert.product?.name + (variantTitle ? ` (${variantTitle})` : '');

    // Attempt sending real restock alert email via nodemailer
    try {
      await sendRestockAlertEmail(
        alert.email,
        fullProductName,
        alert.product?.slug || '',
        prodImg
      );
    } catch (emailErr) {
      console.error(`⚠️ Email transport note for alert #${id}:`, emailErr.message);
    }

    alert.isNotified = true;
    alert.notifiedAt = new Date();
    await alert.save();

    return res.json({
      success: true,
      message: `Notification email dispatched to ${alert.email} for "${fullProductName}".`,
      alert
    });
  } catch (error) {
    console.error('Error notifying stock alert:', error);
    return res.status(500).json({ success: false, message: 'Failed to send notification.', error: error.message });
  }
};

module.exports = {
  createStockAlert,
  getStockAlerts,
  notifyStockAlert
};
