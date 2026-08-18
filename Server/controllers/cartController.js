'use strict';
const { Cart, CartItem, Product, ProductVariant, Customer } = require('../models');
const emailService = require('../services/emailService');

// Helper to determine selector for Cart search based on customer or guest session
const getCartSelector = (req) => {
  if (req.customer && req.customer.id) {
    return { customerId: req.customer.id };
  }
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  if (!sessionId) return null;
  return { sessionId };
};

// Helper to resolve or create a Cart for a user/guest
const getOrCreateCart = async (req) => {
  if (req.customer && req.customer.id) {
    let cart = await Cart.findOne({ where: { customerId: req.customer.id } });
    if (!cart) {
      cart = await Cart.create({ customerId: req.customer.id, sessionId: null });
    }
    return cart;
  }
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] || `sess_${Math.random().toString(36).substring(2, 15)}`;
  let cart = await Cart.findOne({ where: { sessionId } });
  if (!cart) {
    cart = await Cart.create({ sessionId, customerId: null });
  }
  return cart;
};



// GET Cart with automatic stock-reduction audit
const getCart = async (req, res) => {
  try {
    const selector = getCartSelector(req);
    if (!selector) {
      return res.json({ success: true, cart: { items: [], subtotal: 0 }, sessionId: null });
    }

    const cart = await Cart.findOne({
      where: selector,
      include: [{
        model: CartItem,
        as: 'items',
        include: [
          { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'images', 'stock', 'slug', 'gstRate'] },
          { model: ProductVariant, as: 'variant', attributes: ['id', 'sku', 'price', 'stock', 'attributes', 'gstRate'] }
        ]
      }],
    });

    if (!cart) {
      return res.json({ success: true, cart: { items: [], subtotal: 0 } });
    }

    const auditedItems = [];
    let cartAdjusted = false;
    const adjustments = [];

    const updatePromises = [];

    // Audit each item's stock level against database truth
    for (const item of cart.items) {
      let physicalStock = 0;
      if (item.variantId) {
        if (item.variant) physicalStock = item.variant.stock;
      } else {
        if (item.product) physicalStock = item.product.stock;
      }

      let currentQty = item.quantity;
      let status = 'VALID';

      if (physicalStock <= 0) {
        // Case A: Product/Variant is completely out of stock
        status = 'OUT_OF_STOCK';
        currentQty = 0;
        if (item.quantity !== 0) {
          updatePromises.push(item.update({ quantity: 0 }));
          cartAdjusted = true;
          adjustments.push({ itemId: item.id, message: `"${item.product?.name || 'Product'}" is now out of stock.` });
        }
      } else if (physicalStock < item.quantity) {
        // Case B: Stock is less than cart quantity. Auto-reduce quantity.
        status = 'QUANTITY_REDUCED';
        currentQty = physicalStock;
        updatePromises.push(item.update({ quantity: physicalStock }));
        cartAdjusted = true;
        adjustments.push({
          itemId: item.id,
          message: `Quantity of "${item.product?.name || 'Product'}" reduced from ${item.quantity} to ${physicalStock} due to limited stock.`
        });
      }

      const liveGstRate = item.variant?.gstRate ?? item.product?.gstRate ?? item.gstRate ?? '0%';

      auditedItems.push({
        ...item.toJSON(),
        quantity: currentQty,
        gstRate: liveGstRate,
        stockStatus: status,
        availableStock: physicalStock
      });
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    // Recalculate subtotal excluding out of stock items
    const subtotal = auditedItems.reduce((sum, item) => {
      const price = item.variantId && item.variant?.price ? parseFloat(item.variant.price) : parseFloat(item.priceAtAdd);
      return sum + (price * item.quantity);
    }, 0);

    // Return audited cart
    res.json({
      success: true,
      cart: {
        id: cart.id,
        customerId: cart.customerId,
        sessionId: cart.sessionId,
        items: auditedItems,
        subtotal
      },
      cartAdjusted,
      adjustments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add item to cart with strict stock validation
const addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    if (quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be positive' });
    }

    const product = await Product.findByPk(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found or inactive' });
    }

    // Resolve cart details
    const cart = await getOrCreateCart(req);

    // Guard: Prevent mixing different currencies in the same cart
    const existingItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [{ model: Product, as: 'product' }]
    });
    if (existingItems.length > 0) {
      const existingCurrency = existingItems[0].product?.currency || 'INR';
      const targetCurrency = product.currency || 'INR';
      if (existingCurrency !== targetCurrency) {
        return res.status(400).json({
          success: false,
          message: `Mixed currency carts are not allowed. Your cart already contains ${existingCurrency} priced items, but you are trying to add a product priced in ${targetCurrency}.`
        });
      }
    }

    let physicalStock = 0;
    let selectedVariantJson = {};
    let itemPrice = product.price;

    if (variantId) {
      const variant = await ProductVariant.findOne({ where: { id: variantId, productId } });
      if (!variant) return res.status(404).json({ success: false, message: 'Product variant not found' });
      physicalStock = variant.stock;
      selectedVariantJson = variant.attributes;
      if (variant.price) itemPrice = variant.price;
    } else {
      physicalStock = product.stock;
    }

    // Fetch existing cart quantity for this specific SKU
    const existingItem = await CartItem.findOne({
      where: {
        cartId: cart.id,
        productId,
        ...(variantId ? { variantId } : { variantId: null })
      }
    });

    const currentCartQty = existingItem ? existingItem.quantity : 0;
    const totalRequestedQty = currentCartQty + quantity;

    // Strict stock check (including user's existing cart quantity)
    if (totalRequestedQty > physicalStock) {
      return res.status(409).json({
        success: false,
        code: 'INSUFFICIENT_STOCK',
        availableStock: Math.max(0, physicalStock - currentCartQty),
        cartQty: currentCartQty,
        requestedQty: quantity,
        message: `Only ${Math.max(0, physicalStock - currentCartQty)} items are available.`
      });
    }

    if (existingItem) {
      await existingItem.update({ quantity: totalRequestedQty });
    } else {
      await CartItem.create({
        cartId: cart.id,
        productId,
        variantId: variantId || null,
        quantity,
        priceAtAdd: itemPrice,
        selectedVariant: selectedVariantJson
      });
    }

    // If guest checkout, attach cookie sessionId to response for persistence
    if (!req.customer) {
      res.cookie('sessionId', cart.sessionId, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days
    }

    res.json({ success: true, message: 'Added to cart', sessionId: cart.sessionId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update cart item quantity with strict stock bounds checking
const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const item = await CartItem.findByPk(req.params.itemId, {
      include: [
        { model: Product, as: 'product' },
        { model: ProductVariant, as: 'variant' }
      ]
    });

    if (!item) return res.status(404).json({ success: false, message: 'Cart item not found' });

    if (quantity <= 0) {
      await item.destroy();
      return res.json({ success: true, message: 'Item removed from cart' });
    }

    // Validate stock levels
    let physicalStock = 0;
    if (item.variantId) {
      if (item.variant) physicalStock = item.variant.stock;
    } else {
      if (item.product) physicalStock = item.product.stock;
    }

    if (quantity > physicalStock) {
      // Exceeded current stock, auto-adjust to available maximum
      await item.update({ quantity: physicalStock });
      return res.status(409).json({
        success: false,
        code: 'INSUFFICIENT_STOCK',
        availableStock: physicalStock,
        cartQty: item.quantity,
        requestedQty: quantity,
        message: `Only ${physicalStock} items are available. Your cart was updated to the maximum quantity.`
      });
    }

    await item.update({ quantity });
    res.json({ success: true, message: 'Cart updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Remove single item from cart
const removeFromCart = async (req, res) => {
  try {
    const deletedCount = await CartItem.destroy({ where: { id: req.params.itemId } });
    if (!deletedCount) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }
    res.json({ success: true, message: 'Removed from cart' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  try {
    const selector = getCartSelector(req);
    if (!selector) {
      return res.status(400).json({ success: false, message: 'No active cart session' });
    }
    const cart = await Cart.findOne({ where: selector });
    if (cart) {
      await CartItem.destroy({ where: { cartId: cart.id } });
    }
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const syncCart = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Items must be an array' });
    }
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot sync an empty cart' });
    }

    const productIds = [...new Set(items.map(i => parseInt(i.productId, 10)).filter(id => !isNaN(id)))];
    const variantIds = [...new Set(items.map(i => i.variantId ? parseInt(i.variantId, 10) : null).filter(Boolean))];

    const [products, variants] = await Promise.all([
      Product.findAll({ where: { id: productIds } }),
      variantIds.length > 0 ? ProductVariant.findAll({ where: { id: variantIds } }) : []
    ]);

    const productMap = new Map(products.map(p => [p.id, p]));
    const variantMap = new Map(variants.map(v => [v.id, v]));

    // Guard: Prevent mixed currency syncs
    let activeCurrency = null;
    for (const item of items) {
      const p = productMap.get(parseInt(item.productId, 10));
      if (p && p.isActive) {
        const itemCurrency = p.currency || 'INR';
        if (!activeCurrency) {
          activeCurrency = itemCurrency;
        } else if (activeCurrency !== itemCurrency) {
          return res.status(400).json({
            success: false,
            message: `Mixed currency carts are not allowed. You cannot sync a cart containing both INR and AED items.`
          });
        }
      }
    }

    const cart = await getOrCreateCart(req);

    // Delete existing cart items to replace them with the current client cart snapshot
    await CartItem.destroy({ where: { cartId: cart.id } });

    const itemsToCreate = [];
    const auditedItems = [];
    const adjustments = [];

    for (const item of items) {
      const productId = parseInt(item.productId, 10);
      const variantId = item.variantId ? parseInt(item.variantId, 10) : null;
      let quantity = parseInt(item.quantity, 10);

      if (isNaN(productId) || isNaN(quantity) || quantity <= 0) continue;

      const product = productMap.get(productId);
      if (!product || !product.isActive) {
        adjustments.push({ productId, message: `Product is unavailable.` });
        continue;
      }

      let physicalStock = 0;
      let selectedVariantJson = item.selectedVariant || {};
      let itemPrice = product.price;
      let variant = null;

      if (variantId) {
        variant = variantMap.get(variantId);
        if (variant && variant.productId === productId) {
          physicalStock = variant.stock;
          selectedVariantJson = variant.attributes;
          if (variant.price) itemPrice = variant.price;
        }
      } else {
        physicalStock = product.stock;
      }

      let status = 'VALID';
      if (physicalStock <= 0) {
        status = 'OUT_OF_STOCK';
        quantity = 0;
        adjustments.push({ productId, message: `"${product.name}" is now out of stock.` });
      } else if (physicalStock < quantity) {
        status = 'QUANTITY_REDUCED';
        adjustments.push({
          productId,
          message: `Quantity of "${product.name}" reduced from ${quantity} to ${physicalStock} due to limited stock.`
        });
        quantity = physicalStock;
      }

      if (quantity > 0) {
        itemsToCreate.push({
          cartId: cart.id,
          productId,
          variantId,
          quantity,
          priceAtAdd: itemPrice,
          selectedVariant: selectedVariantJson
        });

        const liveGstRate = (variantId && variant ? variant.gstRate : null) ?? product.gstRate ?? '0%';

        auditedItems.push({
          productId,
          variantId,
          quantity,
          priceAtAdd: itemPrice,
          selectedVariant: selectedVariantJson,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            images: product.images,
            stock: product.stock,
            slug: product.slug,
            gstRate: product.gstRate || '0%'
          },
          variant: variantId && variant ? {
            id: variant.id,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
            attributes: variant.attributes,
            gstRate: variant.gstRate || '0%'
          } : null,
          gstRate: liveGstRate,
          stockStatus: status,
          availableStock: physicalStock
        });
      }
    }

    if (itemsToCreate.length > 0) {
      const createdRecords = await CartItem.bulkCreate(itemsToCreate, { returning: true });
      createdRecords.forEach((rec, idx) => {
        if (auditedItems[idx]) {
          auditedItems[idx].id = rec.id;
        }
      });
    }

    const subtotal = auditedItems.reduce((sum, item) => sum + (parseFloat(item.priceAtAdd) * item.quantity), 0);

    res.json({
      success: true,
      cart: {
        id: cart.id,
        customerId: cart.customerId,
        sessionId: cart.sessionId,
        items: auditedItems,
        subtotal
      },
      adjustments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET All Abandoned Carts (with items) for Admin Dashboard
const getAbandonedCarts = async (req, res) => {
  try {
    const carts = await Cart.findAll({
      include: [
        {
          model: CartItem,
          as: 'items',
          required: true, // Only fetch carts that currently contain items
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'images', 'currency', 'stock', 'gstRate'] },
            { model: ProductVariant, as: 'variant', attributes: ['id', 'sku', 'price', 'stock', 'attributes', 'gstRate'] }
          ]
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 100
    });

    res.json({ success: true, carts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST Send Abandoned Cart Recovery / Marketing Automation Email
const sendAbandonedCartEmail = async (req, res) => {
  const { cartId, email, reportType, customNote, couponCode } = req.body || {};
  if (!cartId) {
    return res.status(400).json({ success: false, message: 'Cart ID is required' });
  }

  try {
    const cart = await Cart.findByPk(cartId, {
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'images', 'currency', 'stock', 'gstRate'] },
            { model: ProductVariant, as: 'variant', attributes: ['id', 'sku', 'price', 'stock', 'attributes', 'gstRate'] }
          ]
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    // Determine recipient email
    const recipientEmail = email || cart.customer?.email;
    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'No recipient email specified for this guest session' });
    }

    // Determine customer name
    const customerName = cart.customer?.name || 'Valued Customer';

    // Calculate cart total
    let cartTotal = 0;
    let currency = 'INR';
    cart.items?.forEach(item => {
      const price = parseFloat(item.variant?.price || item.priceAtAdd || 0);
      cartTotal += price * (item.quantity || 0);
      if (item.product?.currency) {
        currency = item.product.currency;
      }
    });

    // Send email using service
    const result = await emailService.sendMarketingAutomationReport({
      to: recipientEmail,
      customerName,
      items: cart.items || [],
      cartTotal,
      currency,
      reportType: reportType || 'all',
      customNote: customNote || '',
      couponCode: couponCode || 'RECOVER10'
    });

    // Update lastEmailSentAt in database
    const now = new Date();
    await cart.update({ lastEmailSentAt: now });

    res.json({
      success: true,
      message: `Marketing automation report email sent successfully to ${recipientEmail}`,
      lastEmailSentAt: now,
      result
    });

  } catch (err) {
    console.error('Error sending marketing report email:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart, syncCart, getAbandonedCarts, sendAbandonedCartEmail };