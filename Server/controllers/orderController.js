'use strict';
const { sequelize, Order, OrderItem, Product, ProductVariant, Customer, Coupon, Affiliate, Cart, CartItem, InventoryMovementLog, Warehouse, WarehouseStock, SiteSetting, LoyaltyLedger, DeliveryZone, Category, ReturnRequest } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sendOrderStatusNotification } = require('../services/emailService');
const currencyRateService = require('../services/currencyRateService');
const { toAbsoluteUrl } = require('../utils/imageUrl');

const orderItemInclude = {
  model: OrderItem,
  as: 'items',
  required: false,
  include: [
    {
      model: ProductVariant,
      as: 'variant',
      attributes: ['id', 'sku', 'image', 'attributes', 'gstRate'],
      required: false
    },
    {
      model: Product,
      as: 'product',
      attributes: ['id', 'name', 'sku', 'images', 'defaultProductImage', 'slug', 'categoryId', 'gstRate'],
      required: false,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'], required: false },
        { model: ProductVariant, as: 'variants', attributes: ['id', 'sku', 'image', 'attributes', 'gstRate'], required: false }
      ]
    },
    {
      model: ReturnRequest,
      as: 'returnRequests',
      required: false
    }
  ]
};

const formatOrder = (order, req) => {
  if (!order) return order;
  const json = typeof order.toJSON === 'function' ? order.toJSON() : { ...order };
  if (Array.isArray(json.items)) {
    json.items = json.items.map(item => {
      // Resolve proper GST rate for item
      item.gstRate = item.gstRate || item.variant?.gstRate || item.product?.gstRate || (json.taxRate !== undefined && json.taxRate !== null ? `${json.taxRate}%` : '0%');

      // Prioritize variant-specific image
      let variantImg = item.variant?.image || item.variantImage || null;

      // Fallback: If variant not directly attached but product has variants, match by variantId or selectedVariant
      if (!variantImg && item.product?.variants && Array.isArray(item.product.variants)) {
        const found = item.product.variants.find(v => {
          if (item.variantId && v.id === item.variantId) return true;
          if (v.image && item.selectedVariant && typeof item.selectedVariant === 'object') {
            try {
              const sv = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
              return JSON.stringify(sv) === JSON.stringify(item.selectedVariant);
            } catch (e) {
              return false;
            }
          }
          return false;
        });
        if (found?.image) variantImg = found.image;
        if (!item.gstRate && found?.gstRate) item.gstRate = found.gstRate;
      }

      // Default product fallback image
      const productImg = item.productImage || item.image || item.product?.defaultProductImage || (Array.isArray(item.product?.images) ? item.product.images[0] : null);

      const resolvedDisplayImg = variantImg || productImg || '';

      if (item.variant?.image) item.variant.image = toAbsoluteUrl(item.variant.image, req);
      if (item.variantImage) item.variantImage = toAbsoluteUrl(item.variantImage, req);
      if (item.productImage) item.productImage = toAbsoluteUrl(item.productImage, req);
      if (item.image) item.image = toAbsoluteUrl(item.image, req);

      item.displayImage = toAbsoluteUrl(resolvedDisplayImg, req);

      if (variantImg) {
        item.variantImage = toAbsoluteUrl(variantImg, req);
        item.image = toAbsoluteUrl(variantImg, req);
        item.productImage = toAbsoluteUrl(variantImg, req);
      }

      if (Array.isArray(item.returnRequests)) {
        item.returnRequests = item.returnRequests.map(ret => {
          const r = typeof ret.toJSON === 'function' ? ret.toJSON() : { ...ret };
          if (r.productImage) r.productImage = toAbsoluteUrl(r.productImage, req);
          if (r.unboxingVideoUrl && !r.unboxingVideoUrl.startsWith('http')) {
            r.unboxingVideoUrl = toAbsoluteUrl(r.unboxingVideoUrl, req);
          }
          if (Array.isArray(r.images)) {
            r.images = r.images.map(img => (img.startsWith('http') ? img : toAbsoluteUrl(img, req)));
          }
          return r;
        });
      }

      return item;
    });
  }

  if (Array.isArray(json.returnRequests)) {
    json.returnRequests = json.returnRequests.map(ret => {
      const r = typeof ret.toJSON === 'function' ? ret.toJSON() : { ...ret };
      if (r.productImage) r.productImage = toAbsoluteUrl(r.productImage, req);
      if (r.unboxingVideoUrl && !r.unboxingVideoUrl.startsWith('http')) {
        r.unboxingVideoUrl = toAbsoluteUrl(r.unboxingVideoUrl, req);
      }
      if (Array.isArray(r.images)) {
        r.images = r.images.map(img => (img.startsWith('http') ? img : toAbsoluteUrl(img, req)));
      }
      return r;
    });
  }

  return json;
};

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customerId, search } = req.query;
    const { Op } = require('sequelize');

    const where = {};

    const validOrderList = [
      { paymentStatus: 'PAID' },
      { paymentMethod: 'COD' },
      { status: { [Op.in]: ['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'OUT_FOR_DELIVERY', 'CANCELLED', 'RETURNED'] } }
    ];

    if (status) {
      if (status === 'PENDING' || status === 'New Orders') {
        where[Op.and] = [
          { [Op.or]: validOrderList },
          { status: { [Op.in]: ['PENDING', 'PENDING_PAYMENT', 'PAID', 'PAYMENT_RECEIVED_STOCK_FAILED'] } }
        ];
      } else {
        where.status = status;
      }
    } else {
      where[Op.or] = validOrderList;
    }

    if (customerId) where.customerId = customerId;
    if (search) {
      where[Op.or] = [
        { orderNumber: { [Op.like]: `%${search}%` } },
        { id: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      distinct: true,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'], required: false },
        orderItemInclude,
        { model: ReturnRequest, as: 'returnRequests', required: false },
      ],
    });
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.max(1, parseInt(limit, 10));
    const formattedOrders = rows.map(o => formatOrder(o, req));
    res.json({ success: true, orders: formattedOrders, total: count, page: p, limit: l, totalPages: Math.ceil(count / l) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const { Op } = require('sequelize');

    const orders = await Order.findAll({
      where: {
        customerId: req.customer.id,
        [Op.or]: [
          { paymentStatus: 'PAID' },
          { paymentMethod: 'Cash on Delivery (COD)' },
          { paymentMethod: 'COD' },
          { status: { [Op.in]: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'] } }
        ]
      },
      order: [['createdAt', 'DESC']],
      include: [
        orderItemInclude,
        { model: ReturnRequest, as: 'returnRequests', required: false },
      ],
    });
    const formattedOrders = orders.map(o => formatOrder(o, req));
    res.json({ success: true, orders: formattedOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, customerId: req.customer.id },
      include: [
        orderItemInclude,
        { model: ReturnRequest, as: 'returnRequests', required: false },
        { model: Coupon, as: 'coupon' },
      ],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order: formatOrder(order, req) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const cancelMyOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, customerId: req.customer.id },
      include: [{ model: OrderItem, as: 'items' }],
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const cancellableStatuses = ['PENDING', 'PENDING_PAYMENT', 'PAID', 'CONFIRMED'];
    if (!cancellableStatuses.includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because it is already ${order.status === 'PROCESSING' ? 'packed/processing' : order.status === 'SHIPPED' ? 'dispatched' : order.status}. Cancellation is strictly not permitted once packed or dispatched.`,
      });
    }

    // 24-hour / Same-day cancellation window check
    const orderCreatedAt = new Date(order.createdAt).getTime();
    const hoursSincePlaced = (Date.now() - orderCreatedAt) / (1000 * 60 * 60);
    if (hoursSincePlaced > 24) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Orders can only be cancelled within 24 hours of placement (same day). Please contact customer support.',
      });
    }

    const rawReason = req.body?.reason || req.body?.cancellationReason;
    const reason = typeof rawReason === 'string' ? rawReason.trim() : '';
    if (!reason || reason.length < 3) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'A valid cancellation reason is required to process order cancellation.',
      });
    }

    if (order.inventoryProcessed) {
      const { resolveWarehouseIdForItem } = require('./warehouseController');

      const sortedItems = [...order.items].sort((a, b) => {
        if (a.productId !== b.productId) return a.productId - b.productId;
        return (a.variantId || 0) - (b.variantId || 0);
      });

      for (const item of sortedItems) {
        const whId = await resolveWarehouseIdForItem(item.productId, item.variantId, transaction);
        let currentStock = 0;

        if (item.variantId) {
          const variant = await ProductVariant.findOne({
            where: { id: item.variantId },
            lock: transaction.LOCK.UPDATE,
            transaction
          });
          if (variant) {
            currentStock = parseInt(variant.stock, 10) || 0;
            await variant.increment('stock', { by: item.quantity, transaction });
          }
        }

        const product = await Product.findOne({
          where: { id: item.productId },
          lock: transaction.LOCK.UPDATE,
          transaction
        });
        if (product) {
          if (!item.variantId) currentStock = parseInt(product.stock, 10) || 0;
          await product.increment('stock', { by: item.quantity, transaction });
        }

        if (whId) {
          const [whStock] = await WarehouseStock.findOrCreate({
            where: { warehouseId: whId, productId: item.productId, variantId: item.variantId || null },
            defaults: { warehouseId: whId, productId: item.productId, variantId: item.variantId || null, quantity: currentStock, reservedQty: 0 },
            transaction
          });
          await whStock.increment('quantity', { by: item.quantity, transaction });
        }

        // Log movement
        await InventoryMovementLog.create({
          productId: item.productId,
          variantId: item.variantId || null,
          warehouseId: whId,
          orderId: order.id,
          quantity: item.quantity,
          type: 'ORDER_CANCEL_RESTOCK',
          reason: `Customer cancelled order: ${order.orderNumber}. Reason: ${reason}`
        }, { transaction });
      }

      order.inventoryProcessed = false;
    }

    let timeline = order.statusTimeline || {};
    if (typeof timeline === 'string') {
      try { timeline = JSON.parse(timeline); } catch (e) { timeline = {}; }
    }
    timeline.CANCELLED = new Date().toISOString();
    timeline.cancelReason = reason;
    timeline.cancelledBy = 'CUSTOMER';

    const isPaidOnline = order.paymentStatus === 'PAID';
    const paymentId = order.razorpay_payment_id || order.razorpay_order_id || order.paymentGatewayRef;
    const refundAmount = parseFloat(order.totalAmount || 0);

    if (isPaidOnline && paymentId && refundAmount > 0) {
      try {
        const gatewayResolver = require('../services/paymentGatewayResolver');
        const gateway = gatewayResolver.getGateway(order.currency || 'INR');
        const refundResult = await gateway.refund(paymentId, refundAmount);

        if (refundResult.success) {
          order.paymentStatus = 'REFUNDED';
          if (refundResult.gatewayPaymentId && !order.razorpay_payment_id) {
            order.razorpay_payment_id = refundResult.gatewayPaymentId;
          }
          timeline.refundStatus = 'COMPLETED';
          timeline.refundGatewayRef = refundResult.gatewayRef || paymentId;
          timeline.refundAmount = refundResult.amount || refundAmount;
          timeline.refundNote = `100% full refund of ${order.currency || 'INR'} ${refundAmount} processed successfully via ${order.currency === 'AED' ? 'Telr' : 'Razorpay'} (Ref: ${refundResult.gatewayRef || paymentId}).`;

          await InventoryMovementLog.create({
            productId: 0,
            orderId: order.id,
            quantity: 0,
            type: 'REFUND_OOS',
            reason: `Automated 100% full refund of ${order.currency || 'INR'} ${refundAmount} upon customer order cancellation (Gateway Ref: ${refundResult.gatewayRef || paymentId}).`
          }, { transaction });
        } else {
          console.warn(`[cancelMyOrder] Gateway refund: ${refundResult.status}`);
          timeline.refundStatus = 'PENDING_MANUAL';
          timeline.refundNote = `Automated gateway refund note: ${refundResult.status}. Full refund will be processed to the original payment method.`;
        }
      } catch (refundErr) {
        console.error('[cancelMyOrder] Error executing payment refund:', refundErr.message);
        timeline.refundStatus = 'PENDING_MANUAL';
        timeline.refundNote = `Full refund of ${order.currency || 'INR'} ${refundAmount} will be processed to the original payment method within 5-7 business days.`;
      }
    }

    // ── Loyalty Points Reversal & Restoration ──────────────────────────
    if (order.customerId) {
      const cust = await Customer.findByPk(order.customerId, { transaction, lock: transaction.LOCK.UPDATE });
      if (cust) {
        let currentBalance = Number(cust.loyaltyPoints) || 0;

        // 1. Restore points redeemed by the customer for this order
        if (order.redeemedPoints > 0) {
          const pointsToRestoreTotal = Number(order.redeemedPoints);
          const alreadyRestoredLedgers = await LoyaltyLedger.findAll({
            where: { customerId: cust.id, orderId: order.id, type: 'BONUS' },
            transaction
          });
          const totalAlreadyRestored = alreadyRestoredLedgers.reduce((sum, l) => sum + Number(l.points || 0), 0);
          const remainingToRestore = Math.max(0, pointsToRestoreTotal - totalAlreadyRestored);

          if (remainingToRestore > 0) {
            currentBalance += remainingToRestore;
            await LoyaltyLedger.create({
              customerId: cust.id,
              orderId: order.id,
              type: 'BONUS',
              points: remainingToRestore,
              balance: currentBalance,
              description: `Restored ${remainingToRestore} loyalty points from cancelled Order ${order.orderNumber}`
            }, { transaction });
          }
        }

        // 2. Clawback / Reverse points earned from this order
        const earnedLedgers = await LoyaltyLedger.findAll({
          where: { customerId: cust.id, orderId: order.id, type: 'EARN' },
          transaction
        });
        const totalEarnedPoints = earnedLedgers.reduce((sum, l) => sum + Number(l.points || 0), 0);

        const alreadyReversedLedgers = await LoyaltyLedger.findAll({
          where: { customerId: cust.id, orderId: order.id, type: 'EXPIRE' },
          transaction
        });
        const totalAlreadyReversed = alreadyReversedLedgers.reduce((sum, l) => sum + Math.abs(Number(l.points || 0)), 0);
        const remainingToClawback = Math.max(0, totalEarnedPoints - totalAlreadyReversed);

        if (remainingToClawback > 0) {
          currentBalance = Math.max(0, currentBalance - remainingToClawback);
          await LoyaltyLedger.create({
            customerId: cust.id,
            orderId: order.id,
            type: 'EXPIRE',
            points: -remainingToClawback,
            balance: currentBalance,
            description: `Reversed ${remainingToClawback} earned loyalty points from cancelled Order ${order.orderNumber}`
          }, { transaction });
        }

        // Save final exact points balance to customer record
        cust.loyaltyPoints = currentBalance;
        await cust.save({ transaction });
      }
    }

    order.status = 'CANCELLED';
    order.statusTimeline = timeline;
    await order.save({ transaction });

    await transaction.commit();

    const { syncStorefrontStock } = require('./warehouseController');
    if (order.items && typeof syncStorefrontStock === 'function') {
      for (const item of order.items) {
        syncStorefrontStock(item.productId, item.variantId || null).catch(console.error);
      }
    }

    sendOrderStatusNotification(order, 'CANCELLED').catch(err => console.error('[orderController] Error sending cancel email:', err.message));

    res.json({ success: true, message: 'Order cancelled successfully', order: formatOrder(order, req) });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id },
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
        orderItemInclude,
        { model: ReturnRequest, as: 'returnRequests', required: false },
        { model: Coupon, as: 'coupon' },
      ],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order: formatOrder(order, req) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const trackOrder = async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNum = !isNaN(identifier) && !isNaN(parseInt(identifier, 10)) && String(parseInt(identifier, 10)) === String(identifier).trim();

    const whereClause = isNum
      ? { [Op.or]: [{ id: parseInt(identifier, 10) }, { orderNumber: identifier }] }
      : { orderNumber: identifier };

    const order = await Order.findOne({
      where: whereClause,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
        orderItemInclude,
        { model: ReturnRequest, as: 'returnRequests', required: false },
        { model: Coupon, as: 'coupon' },
      ],
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order: formatOrder(order, req) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const placeOrder = async (req, res) => {
  console.log('[placeOrder] --- Place Order Triggered ---');
  console.log('[placeOrder] Customer authenticated:', req.customer ? `Yes (ID: ${req.customer.id})` : 'No (Guest)');
  console.log('[placeOrder] Header x-session-id:', req.headers['x-session-id']);
  const transaction = await sequelize.transaction();
  try {
    // 1. Force session lock wait timeout to protect against locking bottlenecks
    await sequelize.query('SET SESSION innodb_lock_wait_timeout = 5', { transaction });

    const { shippingAddress, billingAddress, paymentMethod, couponCode, referralCode, redeemPoints, isGiftWrap, giftWrapPrice: reqGiftWrapPrice, requestedCurrency: reqCurrency, currencyRate: reqRate } = req.body;

    // 2. Fetch server-side cart based on customer or guest sessionId (NEVER trust req.body.items)
    let cartWhere = {};
    if (req.customer && req.customer.id) {
      cartWhere = { customerId: req.customer.id };
    } else {
      const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
      if (!sessionId) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Cart session is missing' });
      }
      cartWhere = { sessionId };
    }

    const cart = await Cart.findOne({
      where: cartWhere,
      include: [{
        model: CartItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }]
      }],
      transaction
    });

    console.log('[placeOrder] Cart search criteria:', JSON.stringify(cartWhere));
    console.log('[placeOrder] Resolved Cart:', cart ? `ID ${cart.id}` : 'None');
    if (cart) {
      console.log('[placeOrder] Cart items length:', cart.items ? cart.items.length : 0);
      if (cart.items) {
        cart.items.forEach(item => {
          console.log(`  - CartItem ID: ${item.id}, Product ID: ${item.productId}, Qty: ${item.quantity}`);
        });
      }
    }

    // 2. Validate Order Basics
    const isCod = paymentMethod === 'COD' || paymentMethod === 'Cash on Delivery (COD)' || paymentMethod?.includes('Cash on Delivery');
    if (!billingAddress || !shippingAddress) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Billing and shipping addresses are required' });
    }

    const reqPincode = (shippingAddress?.pincode || shippingAddress?.zipCode || '').trim();
    if (reqPincode) {
      const activeZone = await DeliveryZone.findOne({ where: { pincode: reqPincode, isActive: true }, transaction });
      if (!activeZone) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Delivery is not available for pincode ${reqPincode}. Please enter a pincode listed in our delivery zones.`
        });
      }
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // 3. Consolidate and Sort Items by productId then variantId ascending to prevent deadlocks
    const itemsToLock = cart.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: item.quantity,
      price: parseFloat(item.priceAtAdd),
      name: item.product?.name || 'Product',
      image: item.variant?.image || item.variantImage || item.image || item.product?.defaultProductImage || item.product?.images?.[0] || '',
      selectedVariant: item.selectedVariant || {} // carry full variant attribute snapshot from cart
    }));

    itemsToLock.sort((a, b) => {
      if (a.productId !== b.productId) return a.productId - b.productId;
      return (a.variantId || 0) - (b.variantId || 0);
    });

    // 4. Lock products/variants inside transaction
    const outOfStockItems = [];
    const lockedStock = {};

    for (const item of itemsToLock) {
      let currentStock = 0;
      if (item.variantId) {
        const variant = await ProductVariant.findOne({
          where: { id: item.variantId },
          lock: transaction.LOCK.UPDATE,
          transaction
        });
        if (!variant) {
          await transaction.rollback();
          return res.status(404).json({ success: false, message: `Product variant ${item.variantId} not found` });
        }
        currentStock = variant.stock;
        lockedStock[`v_${item.variantId}`] = variant;
        if (variant.image) {
          item.image = variant.image;
        }
        // If cart item didn't carry variant attributes, fill from the locked variant record
        if (!item.selectedVariant || Object.keys(item.selectedVariant).length === 0) {
          item.selectedVariant = variant.attributes || {};
        }
      } else {
        const product = await Product.findOne({
          where: { id: item.productId },
          lock: transaction.LOCK.UPDATE,
          transaction
        });
        if (!product) {
          await transaction.rollback();
          return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
        }
        currentStock = product.stock;
        lockedStock[`p_${item.productId}`] = product;
      }

      if (currentStock < item.quantity) {
        outOfStockItems.push({
          productId: item.productId,
          productName: item.name,
          availableStock: currentStock,
          requestedQty: item.quantity
        });
      }
    }

    // 5. If stock validation fails, rollback and return CHECKOUT_STOCK_CHANGED
    if (outOfStockItems.length > 0) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        code: 'CHECKOUT_STOCK_CHANGED',
        items: outOfStockItems
      });
    }

    // 6. Calculate amounts
    let subtotal = itemsToLock.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountAmount = 0;
    let couponId = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ where: { code: String(couponCode).trim().toUpperCase(), isActive: true }, transaction });
      if (coupon && Number(subtotal) >= Number(coupon.minOrderValue || 0)) {
        // Check per-person redemption limit
        const customerId = req.customer?.id || req.user?.id || req.user?.customerId || null;
        let limitExceeded = false;
        if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && Number(coupon.usageLimit) > 0 && customerId) {
          const priorUsageCount = await Order.count({
            where: { customerId, couponId: coupon.id, status: { [Op.ne]: 'CANCELLED' } },
            transaction
          });
          if (priorUsageCount >= Number(coupon.usageLimit)) limitExceeded = true;
        }

        if (!limitExceeded) {
          couponId = coupon.id;
          if (coupon.type === 'PERCENT') {
            discountAmount = Math.min((subtotal * Number(coupon.value)) / 100, Number(coupon.maxDiscount || Infinity));
          } else if (coupon.type === 'FLAT') {
            discountAmount = Math.min(Number(coupon.value), subtotal);
          }
          await coupon.increment('usageCount', { transaction });
        }
      }
    }

    // Affiliate referral lookup
    let affiliateId = null;
    let resolvedAffiliate = null;
    if (referralCode) {
      resolvedAffiliate = await Affiliate.findOne({
        where: { referralCode: referralCode.toUpperCase(), isActive: true },
        transaction
      });
      if (resolvedAffiliate) affiliateId = resolvedAffiliate.id;
    }

    // --- Loyalty Points & Mutual Exclusivity (Best Single Discount) ---
    let loyaltyDiscount = 0;
    let earnedPoints = 0;
    let pointsToRedeem = 0;
    let loyaltySettings = { earnRate: 20, redeemRate: 0.2, maxRedeemAmount: 500 };
    
    const settingsRec = await SiteSetting.findOne({ where: { key: 'loyalty' }, transaction });
    if (settingsRec) {
      loyaltySettings = { ...loyaltySettings, ...JSON.parse(settingsRec.value) };
    }

    if (req.customer && req.customer.id) {
      const user = await Customer.findByPk(req.customer.id, { transaction });
      if (user) {
        let potentialLoyalty = 0;
        if (redeemPoints && user.loyaltyPoints > 0) {
          potentialLoyalty = Math.min(
            user.loyaltyPoints * Number(loyaltySettings.redeemRate),
            Number(loyaltySettings.maxRedeemAmount),
            subtotal
          );
        }

        // ── Mutual Exclusivity: Compare Coupon vs Loyalty Points ──
        if (discountAmount > 0 && discountAmount >= potentialLoyalty) {
          // Coupon discount is better or equal -> Keep coupon, set loyalty discount to 0
          loyaltyDiscount = 0;
        } else if (potentialLoyalty > 0) {
          // Loyalty discount is strictly better -> Use loyalty points, unapply coupon
          loyaltyDiscount = potentialLoyalty;
          pointsToRedeem = Math.ceil(loyaltyDiscount / Number(loyaltySettings.redeemRate));
          if (discountAmount > 0) {
            discountAmount = 0;
            if (couponId) {
              const cp = await Coupon.findByPk(couponId, { transaction });
              if (cp && cp.usageCount > 0) {
                await cp.decrement('usageCount', { transaction });
              }
              couponId = null;
            }
          }
        }
        
        // Earn points based on net paid amount (in base INR)
        const amountForEarn = subtotal - discountAmount - loyaltyDiscount;
        if (amountForEarn > 0 && Number(loyaltySettings.earnRate) > 0) {
           earnedPoints = Math.floor(amountForEarn / Number(loyaltySettings.earnRate));
        }
      }
    }

    // Dynamic Delivery Charge based on Shipping Pincode
    let shippingAmount = subtotal >= 1499 ? 0 : 99; // Default fallback
    const rawPincode = (shippingAddress?.pincode || shippingAddress?.zipCode || shippingAddress?.zip_code || shippingAddress?.zip || '').toString().trim();
    if (rawPincode) {
      const zone = await DeliveryZone.findOne({ where: { pincode: rawPincode, isActive: true }, transaction });
      if (zone) {
        if (zone.minOrderAmountForFreeDelivery !== null && subtotal >= parseFloat(zone.minOrderAmountForFreeDelivery)) {
          shippingAmount = 0;
        } else {
          shippingAmount = parseFloat(zone.deliveryCharge || 0);
        }
      }
    }
    let totalDiscount = discountAmount + loyaltyDiscount;
    let taxableSubtotal = Math.max(0, subtotal - totalDiscount);

    // Calculate tax per item using configured product / variant gstRate
    let taxAmount = 0;
    let weightedTaxSum = 0;
    for (const item of itemsToLock) {
      const itemLineTotal = item.price * item.quantity;
      const itemDiscount = subtotal > 0 ? (totalDiscount * itemLineTotal) / subtotal : 0;
      const itemTaxable = Math.max(0, itemLineTotal - itemDiscount);

      const variantRec = item.variantId ? lockedStock[`v_${item.variantId}`] : null;
      const productRec = lockedStock[`p_${item.productId}`];
      const rawGst = variantRec?.gstRate ?? productRec?.gstRate ?? '0%';
      const parsedRate = parseFloat(String(rawGst).replace(/[^0-9.]/g, ''));
      const itemGstRate = !isNaN(parsedRate) ? parsedRate : 0;

      const itemTax = Math.round((itemTaxable * itemGstRate) / (100 + itemGstRate));
      taxAmount += itemTax;
      weightedTaxSum += itemGstRate * itemLineTotal;
    }

    const giftWrapCharge = isGiftWrap ? Math.round(Number(reqGiftWrapPrice || 99)) : 0;
    let taxRate = subtotal > 0 ? Math.round((weightedTaxSum / subtotal) * 10) / 10 : 0;
    let totalAmount = taxableSubtotal + shippingAmount + giftWrapCharge;
    if (!reqCurrency || reqCurrency.toUpperCase() === 'INR') {
      totalAmount = Math.round(totalAmount);
    }

    // Guard: Enforce strict country-based currency and payment gateway resolution
    // India (IN) -> Strictly INR & Razorpay
    // UAE / Dubai (AE) -> Strictly AED & Telr
    const shippingCountry = (shippingAddress?.country || '').trim().toLowerCase();
    const billingCountry = (billingAddress?.country || '').trim().toLowerCase();
    const reqGeoCountry = (req.body.geoCountry || '').trim().toUpperCase();

    const isUae = reqGeoCountry === 'AE' ||
                  ['uae', 'united arab emirates', 'dubai', 'abu dhabi', 'sharjah', 'ae'].includes(shippingCountry) ||
                  ['uae', 'united arab emirates', 'dubai', 'abu dhabi', 'sharjah', 'ae'].includes(billingCountry);

    let orderCurrency = isUae ? 'AED' : 'INR';

    // Validate for mixed-currency carts (products priced in different currencies)
    let cartCurrency = null;
    for (const item of cart.items) {
      const itemCurrency = item.product?.currency || 'INR';
      if (!cartCurrency) {
        cartCurrency = itemCurrency;
      } else if (cartCurrency !== itemCurrency) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Mixed currency items are not allowed in the same cart/order.' });
      }
    }
    // NOTE: Products are stored with INR base price but charged in AED for UAE users via live exchange rate.

    // If order is AED, convert all amounts from INR to AED using exchange rate
    let toAed = (inr) => inr;
    if (orderCurrency === 'AED') {
      const liveRate = currencyRateService.getRate(); // cached, zero network overhead
      const rate = liveRate > 0 ? liveRate : ((Number(reqRate) > 0) ? Number(reqRate) : currencyRateService.FALLBACK_RATE);
      toAed = (inr) => Math.round((inr / rate) * 100) / 100; // 2 decimal places
      subtotal          = toAed(subtotal);
      discountAmount    = toAed(discountAmount);
      loyaltyDiscount   = toAed(loyaltyDiscount);
      shippingAmount    = toAed(shippingAmount);
      taxableSubtotal   = toAed(taxableSubtotal);
      taxAmount         = toAed(taxAmount);
      totalAmount       = taxableSubtotal + shippingAmount; // recalculate from converted values
      console.log(`[placeOrder] Converted amounts to AED (rate: ${rate} INR/AED): totalAmount=${totalAmount} AED`);
    }

    const resolvedPaymentMethod = isCod
      ? 'Cash on Delivery (COD)'
      : (orderCurrency === 'AED' ? 'Telr Secure Online' : 'Razorpay Secure Online');

    // 7. Create Order record
    const order = await Order.create({
      orderNumber: `BB${uuidv4().slice(0, 8).toUpperCase()}`,
      customerId: req.customer ? req.customer.id : null,
      sessionId: req.customer ? null : cart.sessionId,
      affiliateId,
      couponId,
      status: isCod ? 'CONFIRMED' : 'PENDING_PAYMENT',
      paymentStatus: 'UNPAID',
      paymentMethod: resolvedPaymentMethod,
      subtotal,
      discountAmount: discountAmount + loyaltyDiscount,
      couponDiscount: discountAmount,
      loyaltyDiscount: loyaltyDiscount,
      redeemedPoints: pointsToRedeem,
      shippingAmount,
      taxAmount,
      taxRate,
      totalAmount,
      currency: orderCurrency,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      notes: req.body.giftMessage || req.body.notes || null,
      isGiftWrap: Boolean(isGiftWrap),
      giftWrapFee: isGiftWrap ? giftWrapCharge : 0,
      inventoryProcessed: isCod,
      statusTimeline: isCod
        ? { PENDING: new Date().toISOString(), CONFIRMED: new Date().toISOString() }
        : { PENDING_PAYMENT: new Date().toISOString(), PENDING: new Date().toISOString() }
    }, { transaction });

    // 8. Snap order items
    const orderItemsPayload = itemsToLock.map(item => {
      const unitPrice = (orderCurrency === 'AED') ? toAed(item.price) : item.price;
      const totalPrice = Math.round((unitPrice * item.quantity) * 100) / 100;
      const variantRec = item.variantId ? lockedStock[`v_${item.variantId}`] : null;
      const productRec = lockedStock[`p_${item.productId}`];
      const itemGst = item.gstRate || variantRec?.gstRate || productRec?.gstRate || '0%';
      return {
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.name,
        productImage: item.image,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        gstRate: itemGst,
        // Store clean variant attributes snapshot — DataTypes.JSON column, pass plain object directly
        selectedVariant: (() => {
          let sv = item.selectedVariant;
          if (typeof sv === 'string') {
            try { sv = JSON.parse(sv); } catch (e) { sv = null; }
          }
          return (sv && typeof sv === 'object' && Object.keys(sv).length > 0) ? sv : null;
        })()
      };
    });

    for (const snapItem of orderItemsPayload) {
      await OrderItem.create(snapItem, { transaction });
    }

const { syncStorefrontStock, resolveWarehouseIdForItem } = require('./warehouseController');

    // 9. Process stock deduction immediately upon order placement ONLY for COD orders.
    // Online orders (Razorpay/Telr) process stock deduction upon payment confirmation in paymentController.
    if (isCod) {
      for (const item of itemsToLock) {
        const whId = await resolveWarehouseIdForItem(item.productId, item.variantId, transaction);
        let preDeductionStock = 0;

        if (item.variantId) {
          // Decrement variant stock
          const varObj = lockedStock[`v_${item.variantId}`];
          if (varObj) {
            preDeductionStock = parseInt(varObj.stock, 10) || 0;
            await varObj.decrement('stock', { by: item.quantity, transaction });
          }
          // Also decrement parent product aggregate stock (locked separately since
          // lockedStock only has p_ entries for non-variant items)
          const parentProduct = await Product.findOne({
            where: { id: item.productId },
            lock: transaction.LOCK.UPDATE,
            transaction
          });
          if (parentProduct) {
            await parentProduct.decrement('stock', { by: item.quantity, transaction });
          }
        } else {
          const prodObj = lockedStock[`p_${item.productId}`];
          if (prodObj) {
            preDeductionStock = parseInt(prodObj.stock, 10) || 0;
            await prodObj.decrement('stock', { by: item.quantity, transaction });
          }
        }

        if (whId) {
          const [whStock] = await WarehouseStock.findOrCreate({
            where: { warehouseId: whId, productId: item.productId, variantId: item.variantId || null },
            defaults: { warehouseId: whId, productId: item.productId, variantId: item.variantId || null, quantity: preDeductionStock, reservedQty: 0 },
            transaction
          });
          await whStock.decrement('quantity', { by: item.quantity, transaction });
        }

        // Log movement
        await InventoryMovementLog.create({
          productId: item.productId,
          variantId: item.variantId || null,
          warehouseId: whId,
          orderId: order.id,
          quantity: -item.quantity,
          type: 'ORDER_DEDUCTION',
          reason: `COD Order placement: ${order.orderNumber}`
        }, { transaction });
      }

      await order.update({ inventoryProcessed: true }, { transaction });

      // Clear server-side cartitems for COD orders
      await CartItem.destroy({ where: { cartId: cart.id }, transaction });
    }

    // 10. Process Loyalty Ledger and Points Balance
    if (req.customer && req.customer.id) {
      const user = await Customer.findByPk(req.customer.id, { transaction });
      if (user) {
        if (pointsToRedeem > 0) {
          await LoyaltyLedger.create({
            customerId: user.id,
            orderId: order.id,
            type: 'REDEEM',
            points: -pointsToRedeem,
            balance: user.loyaltyPoints - pointsToRedeem,
            description: `Redeemed at checkout for Order ${order.orderNumber}`
          }, { transaction });
          await user.decrement('loyaltyPoints', { by: pointsToRedeem, transaction });
          user.loyaltyPoints -= pointsToRedeem; // update local instance for next calculation
        }
        
        // Earn points immediately ONLY for COD orders. Online orders earn points upon payment confirmation.
        if (earnedPoints > 0 && isCod) {
          await LoyaltyLedger.create({
            customerId: user.id,
            orderId: order.id,
            type: 'EARN',
            points: earnedPoints,
            balance: user.loyaltyPoints + earnedPoints,
            description: `Earned from Order ${order.orderNumber}`
          }, { transaction });
          await user.increment('loyaltyPoints', { by: earnedPoints, transaction });
        }
      }
    }

    // Update affiliate stats after order is saved
    if (resolvedAffiliate) {
      const commission = parseFloat(resolvedAffiliate.commissionRate) || 0;
      const earned = parseFloat((totalAmount * commission / 100).toFixed(2));
      await resolvedAffiliate.increment({
        totalOrders: 1,
        totalEarnings: earned,
      }, { transaction });
    }

    await transaction.commit();

    // 11. Post-commit operations (Asynchronous)
    if (isCod) {
      for (const item of itemsToLock) {
        syncStorefrontStock(item.productId, item.variantId || null).catch(console.error);
      }
    }

    // Send email notification for new order (only for COD orders; online payment orders receive confirmation email after payment completes)
    if (isCod) {
      Order.findByPk(order.id, {
        include: [
          { model: OrderItem, as: 'items' },
          { model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] }
        ]
      }).then(fullOrder => {
        if (fullOrder) {
          sendOrderStatusNotification(fullOrder, 'CONFIRMED').catch(err => console.error('[orderController] Error sending placeOrder notification email:', err.message));
        }
      }).catch(err => console.error('[orderController] Error fetching full order for email notification:', err.message));
    }

    res.status(201).json({
      success: true,
      order: {
        ...order.toJSON(),
        items: orderItemsPayload
      }
    });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin status update: handles restocking when order is cancelled or refunded
const updateStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query('SET SESSION innodb_lock_wait_timeout = 5', { transaction });
    const { status, paymentStatus } = req.body;

    const order = await Order.findOne({
      where: { id: req.params.id },
      include: [{ model: OrderItem, as: 'items' }],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const previousStatus = order.status;
    const previousProcessed = order.inventoryProcessed;

    // Handle restocking if transition goes to CANCELLED or REFUNDED and stock was previously deducted
    const isRestockRequired = (status === 'CANCELLED' || status === 'REFUNDED') &&
      previousStatus !== 'CANCELLED' &&
      previousStatus !== 'REFUNDED' &&
      previousProcessed === true;

    if (isRestockRequired) {
      const { resolveWarehouseIdForItem, syncStorefrontStock } = require('./warehouseController');
      // Sort items to restock ascending to prevent deadlocks
      const sortedItems = [...order.items].sort((a, b) => {
        if (a.productId !== b.productId) return a.productId - b.productId;
        return (a.variantId || 0) - (b.variantId || 0);
      });

      for (const item of sortedItems) {
        const whId = await resolveWarehouseIdForItem(item.productId, item.variantId, transaction);
        let currentStock = 0;

        if (item.variantId) {
          const variant = await ProductVariant.findOne({
            where: { id: item.variantId },
            lock: transaction.LOCK.UPDATE,
            transaction
          });
          if (variant) {
            currentStock = parseInt(variant.stock, 10) || 0;
            await variant.increment('stock', { by: item.quantity, transaction });
          }
        }
        
        const product = await Product.findOne({
          where: { id: item.productId },
          lock: transaction.LOCK.UPDATE,
          transaction
        });
        if (product) {
          if (!item.variantId) currentStock = parseInt(product.stock, 10) || 0;
          await product.increment('stock', { by: item.quantity, transaction });
        }

        if (whId) {
          const [whStock] = await WarehouseStock.findOrCreate({
            where: { warehouseId: whId, productId: item.productId, variantId: item.variantId || null },
            defaults: { warehouseId: whId, productId: item.productId, variantId: item.variantId || null, quantity: currentStock, reservedQty: 0 },
            transaction
          });
          await whStock.increment('quantity', { by: item.quantity, transaction });
        }

        // Log movement
        await InventoryMovementLog.create({
          productId: item.productId,
          variantId: item.variantId || null,
          warehouseId: whId,
          orderId: order.id,
          quantity: item.quantity,
          type: 'ORDER_CANCEL_RESTOCK',
          reason: `Order cancelled/refunded. Status: ${status}. Previous: ${previousStatus}`
        }, { transaction });
      }

      order.inventoryProcessed = false;
    }

    let currentTimeline = order.statusTimeline || {};
    if (typeof currentTimeline === 'string') {
      try { currentTimeline = JSON.parse(currentTimeline); } catch (e) { currentTimeline = {}; }
    }
    const updatedTimeline = {
      ...currentTimeline,
      [status]: new Date().toISOString()
    };
    if (!updatedTimeline.PENDING) {
      updatedTimeline.PENDING = order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString();
    }

    const isCancelOrRefund = status === 'CANCELLED' || status === 'REFUNDED';
    const isPaidOnline = order.paymentStatus === 'PAID';
    const paymentId = order.razorpay_payment_id || order.razorpay_order_id || order.paymentGatewayRef;
    const refundAmount = parseFloat(order.totalAmount || 0);

    let resolvedPaymentStatus = paymentStatus || order.paymentStatus;

    if (isCancelOrRefund && isPaidOnline && paymentId && refundAmount > 0 && order.paymentStatus !== 'REFUNDED') {
      try {
        const gatewayResolver = require('../services/paymentGatewayResolver');
        const gateway = gatewayResolver.getGateway(order.currency || 'INR');
        const refundResult = await gateway.refund(paymentId, refundAmount);

        if (refundResult.success) {
          resolvedPaymentStatus = 'REFUNDED';
          if (refundResult.gatewayPaymentId && !order.razorpay_payment_id) {
            order.razorpay_payment_id = refundResult.gatewayPaymentId;
          }
          updatedTimeline.refundStatus = 'COMPLETED';
          updatedTimeline.refundGatewayRef = refundResult.gatewayRef || paymentId;
          updatedTimeline.refundAmount = refundResult.amount || refundAmount;
          updatedTimeline.refundNote = `100% full refund of ${order.currency || 'INR'} ${refundAmount} processed successfully via ${order.currency === 'AED' ? 'Telr' : 'Razorpay'} (Ref: ${refundResult.gatewayRef || paymentId}).`;

          await InventoryMovementLog.create({
            productId: 0,
            orderId: order.id,
            quantity: 0,
            type: 'REFUND_OOS',
            reason: `Automated 100% full refund of ${order.currency || 'INR'} ${refundAmount} on status transition to ${status} (Gateway Ref: ${refundResult.gatewayRef || paymentId}).`
          }, { transaction });
        } else {
          console.warn(`[updateStatus] Gateway refund note: ${refundResult.status}`);
          updatedTimeline.refundStatus = 'PENDING_MANUAL';
          updatedTimeline.refundNote = `Automated gateway refund note: ${refundResult.status}. Full refund will be processed manually.`;
        }
      } catch (refundErr) {
        console.error('[updateStatus] Error executing payment refund:', refundErr.message);
        updatedTimeline.refundStatus = 'PENDING_MANUAL';
        updatedTimeline.refundNote = `Full refund of ${order.currency || 'INR'} ${refundAmount} will be processed manually.`;
      }
    }

    // ── Loyalty Points Reversal & Restoration (Only once upon cancellation/refund) ──
    if (isCancelOrRefund && previousStatus !== 'CANCELLED' && previousStatus !== 'REFUNDED' && order.customerId) {
      const cust = await Customer.findByPk(order.customerId, { transaction, lock: transaction.LOCK.UPDATE });
      if (cust) {
        let currentBalance = Number(cust.loyaltyPoints) || 0;

        // 1. Restore redeemed points
        if (order.redeemedPoints > 0) {
          const pointsToRestoreTotal = Number(order.redeemedPoints);
          const alreadyRestoredLedgers = await LoyaltyLedger.findAll({
            where: { customerId: cust.id, orderId: order.id, type: 'BONUS' },
            transaction
          });
          const totalAlreadyRestored = alreadyRestoredLedgers.reduce((sum, l) => sum + Number(l.points || 0), 0);
          const remainingToRestore = Math.max(0, pointsToRestoreTotal - totalAlreadyRestored);

          if (remainingToRestore > 0) {
            currentBalance += remainingToRestore;
            await LoyaltyLedger.create({
              customerId: cust.id,
              orderId: order.id,
              type: 'BONUS',
              points: remainingToRestore,
              balance: currentBalance,
              description: `Restored ${remainingToRestore} loyalty points from ${status.toLowerCase()} Order ${order.orderNumber}`
            }, { transaction });
          }
        }

        // 2. Reverse earned points
        const earnedLedgers = await LoyaltyLedger.findAll({
          where: { customerId: cust.id, orderId: order.id, type: 'EARN' },
          transaction
        });
        const totalEarnedPoints = earnedLedgers.reduce((sum, l) => sum + Number(l.points || 0), 0);

        const alreadyReversedLedgers = await LoyaltyLedger.findAll({
          where: { customerId: cust.id, orderId: order.id, type: 'EXPIRE' },
          transaction
        });
        const totalAlreadyReversed = alreadyReversedLedgers.reduce((sum, l) => sum + Math.abs(Number(l.points || 0)), 0);
        const remainingToClawback = Math.max(0, totalEarnedPoints - totalAlreadyReversed);

        if (remainingToClawback > 0) {
          currentBalance = Math.max(0, currentBalance - remainingToClawback);
          await LoyaltyLedger.create({
            customerId: cust.id,
            orderId: order.id,
            type: 'EXPIRE',
            points: -remainingToClawback,
            balance: currentBalance,
            description: `Reversed ${remainingToClawback} earned loyalty points from ${status.toLowerCase()} Order ${order.orderNumber}`
          }, { transaction });
        }

        // Save final exact points balance to customer record
        cust.loyaltyPoints = currentBalance;
        await cust.save({ transaction });
      }
    }

    const orderUpdatePayload = {
      status,
      paymentStatus: resolvedPaymentStatus,
      inventoryProcessed: order.inventoryProcessed,
      statusTimeline: updatedTimeline
    };
    if (status === 'DELIVERED' && !order.deliveredAt) {
      orderUpdatePayload.deliveredAt = new Date();
    }

    await order.update(orderUpdatePayload, { transaction });

    await transaction.commit();

    // Post-commit storefront stock sync
    if (isRestockRequired) {
      const { syncStorefrontStock } = require('./warehouseController');
      for (const item of order.items) {
        syncStorefrontStock(item.productId, item.variantId || null).catch(console.error);
      }
    }

    // Fetch full order with items and customer details for email notification
    Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] }
      ]
    }).then(fullOrder => {
      if (fullOrder) {
        sendOrderStatusNotification(fullOrder, status).catch(err => console.error('[orderController] Error sending status email:', err.message));
      }
    }).catch(console.error);

    res.json({ success: true, order });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const validOrderWhere = {
      [Op.or]: [
        { paymentStatus: 'PAID' },
        { paymentMethod: 'COD' }
      ]
    };

    const [totalOrders, todayOrders, monthOrders, totalCustomers, pendingOrders, deliveredOrders] = await Promise.all([
      Order.count({ where: validOrderWhere }),
      Order.count({ where: { ...validOrderWhere, createdAt: { [Op.gte]: today } } }),
      Order.count({ where: { ...validOrderWhere, createdAt: { [Op.gte]: thisMonth } } }),
      Customer.count(),
      Order.count({ where: { status: 'PENDING' } }),
      Order.count({ where: { status: 'DELIVERED' } }),
    ]);

    const revenueData = await Order.findAll({
      where: { paymentStatus: 'PAID' },
      attributes: ['totalAmount', 'currency'],
    });
    
    let totalRevenueINR = 0;
    let totalRevenueAED = 0;

    revenueData.forEach(o => {
      const amt = parseFloat(o.totalAmount) || 0;
      if (o.currency === 'AED') {
        totalRevenueAED += amt;
      } else {
        totalRevenueINR += amt;
      }
    });

    res.json({
      success: true,
      stats: { 
        totalOrders, 
        todayOrders, 
        monthOrders, 
        totalCustomers, 
        pendingOrders, 
        deliveredOrders, 
        totalRevenue: Math.round(totalRevenueINR),
        totalRevenueAED: Math.round(totalRevenueAED)
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStatusCounts = async (req, res) => {
  try {
    const validOrderCondition = {
      [Op.or]: [
        { paymentStatus: 'PAID' },
        { paymentMethod: 'COD' },
        { status: { [Op.in]: ['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'OUT_FOR_DELIVERY', 'CANCELLED', 'RETURNED'] } }
      ]
    };

    const orderCounts = await Order.findAll({
      where: validOrderCondition,
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    });

    const counts = {
      ALL: 0,
      ABANDONED: 0,
      PENDING: 0,
      CONFIRMED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      RETURNED: 0
    };

    let totalValidOrders = 0;

    orderCounts.forEach(row => {
      const c = parseInt(row.count, 10) || 0;
      totalValidOrders += c;
      const st = row.status;
      if (st === 'PENDING' || st === 'PENDING_PAYMENT' || st === 'PAID' || st === 'PAYMENT_RECEIVED_STOCK_FAILED') {
        counts.PENDING += c;
      } else if (Object.prototype.hasOwnProperty.call(counts, st)) {
        counts[st] += c;
      }
    });

    counts.ALL = totalValidOrders;

    try {
      const abandonedCount = await Cart.count({
        include: [{ model: CartItem, as: 'items', required: true }]
      });
      counts.ABANDONED = abandonedCount;
    } catch {
      counts.ABANDONED = 0;
    }

    try {
      const activeReturnsCount = await ReturnRequest.count({
        where: { status: { [Op.notIn]: ['REFUNDED', 'REJECTED'] } }
      });
      counts.RETURNED = Math.max(counts.RETURNED, activeReturnsCount);
    } catch {
      // Keep order counts RETURNED
    }

    res.json({ success: true, counts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getOne, getMyOrders, getMyOrderById, trackOrder, cancelMyOrder, placeOrder, updateStatus, getDashboardStats, getStatusCounts };

