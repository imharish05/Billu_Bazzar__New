'use strict';

const crypto = require('crypto');
const axios = require('axios');
const { sequelize, Order, OrderItem, Product, ProductVariant, InventoryMovementLog, Customer, Warehouse, WarehouseStock, Cart, CartItem } = require('../models');
const { Op } = require('sequelize');
const resolver = require('../services/paymentGatewayResolver');
const { sendOrderStatusNotification } = require('../services/emailService');

// Helper to check and alert administrators of low stock events
const checkAndNotifyLowStock = async (items) => {
  try {
    const variantIds = [...new Set(items.map(i => i.variantId).filter(Boolean))];
    const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))];

    const [variants, products] = await Promise.all([
      variantIds.length > 0 ? ProductVariant.findAll({ where: { id: variantIds }, attributes: ['id', 'stock', 'sku'] }) : [],
      productIds.length > 0 ? Product.findAll({ where: { id: productIds }, attributes: ['id', 'stock', 'sku', 'name'] }) : []
    ]);

    const variantMap = new Map(variants.map(v => [v.id, v]));
    const productMap = new Map(products.map(p => [p.id, p]));

    for (const item of items) {
      let currentStock = 0;
      let name = item.productName || '';
      let sku = '';

      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (variant) {
          currentStock = variant.stock;
          sku = variant.sku;
        }
      } else {
        const product = productMap.get(item.productId);
        if (product) {
          currentStock = product.stock;
          sku = product.sku;
          if (!name) name = product.name;
        }
      }

      if (currentStock <= 10) {
        console.warn(`[InventoryAlert] LOW STOCK WARNING: SKU "${sku}" for product "${name}" has dropped to ${currentStock} units!`);
      }
    }
  } catch (err) {
    console.error('[InventoryAlert] Error verifying stock reorder alerts:', err.message);
  }
};

// Idempotent Refund function using the resolved gateway service
const initiateIdempotentRefund = async (orderId, paymentId, amount) => {
  try {
    // 1. Double check if refund log already exists (idempotency check)
    const existingLog = await InventoryMovementLog.findOne({
      where: { orderId, type: 'REFUND_OOS' }
    });
    if (existingLog) {
      console.log(`[Refund] Refund already processed for Order ID ${orderId}`);
      return;
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      console.error(`[Refund] Order with ID ${orderId} not found for refund`);
      return;
    }

    console.log(`[Refund] Initiating automatic refund of ${order.currency} ${amount} for Payment ID: ${paymentId}...`);
    
    // Resolve gateway and process refund
    const gateway = resolver.getGateway(order.currency);
    const refundResult = await gateway.refund(paymentId, amount);

    if (!refundResult.success) {
      throw new Error(`Refund failed on gateway: ${refundResult.status}`);
    }

    // Update order status and payment status to REFUNDED
    let currentTimeline = order.statusTimeline || {};
    if (typeof currentTimeline === 'string') {
      try { currentTimeline = JSON.parse(currentTimeline); } catch (e) { currentTimeline = {}; }
    }
    await order.update({
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
      statusTimeline: {
        ...currentTimeline,
        REFUNDED: new Date().toISOString()
      }
    });

    // 2. Log refund to audit trail
    await InventoryMovementLog.create({
      productId: 0,
      orderId,
      quantity: 0,
      type: 'REFUND_OOS',
      reason: `Automated refund of ${order.currency} ${amount} completed successfully via gateway ref: ${refundResult.gatewayRef}.`
    });
    console.log(`[Refund] Idempotent refund logged for Order ID ${orderId}`);
  } catch (err) {
    console.error(`[Refund] Error during refund of payment ${paymentId}:`, err.message);
  }
};

// Initiate payment details for a client using resolved currency gateway
const initiatePayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    // Lookup order with customer details if available
    const order = await Order.findOne({
      where: { id: orderId },
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'], required: false }
      ]
    });
    if (!order) {
      return res.status(404).json({ success: false, message: `Order ${orderId} not found` });
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({
        success: false,
        message: `Order is in '${order.status}' state, not PENDING_PAYMENT. Cannot initiate payment.`
      });
    }

    // Resolve gateway based on order currency (INR → Razorpay, AED → Telr)
    const gateway = resolver.getGateway(order.currency);
    console.log(`[initiatePayment] Order ${order.orderNumber} | Currency: ${order.currency} | Gateway: ${order.currency === 'INR' ? 'Razorpay' : 'Telr'}`);

    let billingAddr = order.billingAddress;
    if (typeof billingAddr === 'string') {
      try { billingAddr = JSON.parse(billingAddr); } catch (e) {}
    }
    let shippingAddr = order.shippingAddress;
    if (typeof shippingAddr === 'string') {
      try { shippingAddr = JSON.parse(shippingAddr); } catch (e) {}
    }

    const gatewayOrder = await gateway.createOrder({
      amount: parseFloat(order.totalAmount),
      currency: order.currency,
      receipt: order.orderNumber,
      orderId: order.id,
      customer: order.customer,
      billingAddress: billingAddr,
      shippingAddress: shippingAddr,
    });

    console.log(`[initiatePayment] Gateway order created: ${gatewayOrder.gatewayRef}`);

    // Update order with gateway references (keep status as PENDING_PAYMENT until verified)
    if (order.currency === 'INR') {
      await order.update({
        razorpay_order_id: gatewayOrder.gatewayRef,
        paymentGatewayRef: gatewayOrder.gatewayRef,
      });
    } else {
      await order.update({
        paymentGatewayRef: gatewayOrder.gatewayRef,
      });
    }

    res.json({
      success: true,
      gateway: order.currency === 'INR' ? 'razorpay' : 'telr',
      key: order.currency === 'INR' ? process.env.RAZORPAY_KEY_ID : undefined,
      amount: order.currency === 'INR' ? Math.round(parseFloat(order.totalAmount) * 100) : parseFloat(order.totalAmount),
      currency: order.currency,
      name: 'Billu Bazzar',
      description: `Payment for Order ${order.orderNumber}`,
      order_id: gatewayOrder.gatewayRef,
      redirectUrl: gatewayOrder.redirectUrl || undefined,
    });
  } catch (err) {
    console.error('[initiatePayment] Error:', err.message, err.stack);
    res.status(500).json({ success: false, message: err.message || 'Internal server error during payment initiation' });
  }
};

// Normalized order update logic called after verified signature check
const processConfirmedPayment = async ({ orderQuery, gatewayPaymentId, signature, paymentAmount, gatewayType, res }) => {
  const transaction = await sequelize.transaction();
  try {
    // 1. Configure InnoDB lock wait timeout for this transaction
    await sequelize.query('SET SESSION innodb_lock_wait_timeout = 5', { transaction });

    // 2. Find and lock the order row
    const order = await Order.findOne({
      where: orderQuery,
      include: [{ model: OrderItem, as: 'items' }],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Order associated with payment not found' });
    }

    // 3. Webhook Idempotency Check
    if (order.status === 'PAID' && order.paymentStatus === 'PAID') {
      await transaction.rollback();
      return res.json({ success: true, message: 'Payment webhook already processed previously (no-op)' });
    }

    // Verify duplicate payment ID check at order level (excluding current order)
    if (gatewayType === 'razorpay' && gatewayPaymentId) {
      const duplicatePayment = await Order.findOne({
        where: {
          razorpay_payment_id: gatewayPaymentId,
          id: { [Op.ne]: order.id }
        },
        transaction
      });
      if (duplicatePayment) {
        await transaction.rollback();
        return res.json({ success: true, message: 'Duplicate transaction ignored' });
      }
    } else if (gatewayPaymentId && !String(gatewayPaymentId).startsWith('telr_sim_')) {
      const duplicatePayment = await Order.findOne({
        where: {
          paymentGatewayRef: gatewayPaymentId,
          id: { [Op.ne]: order.id }
        },
        transaction
      });
      if (duplicatePayment) {
        await transaction.rollback();
        return res.json({ success: true, message: 'Duplicate transaction ignored' });
      }
    }

    // 4. Gather and Sort items in consistent ascending order to prevent deadlocks
    const sortedItems = [...order.items].sort((a, b) => {
      if (a.productId !== b.productId) return a.productId - b.productId;
      return (a.variantId || 0) - (b.variantId || 0);
    });

    const lockedStock = {};
    let isInventoryValid = true;

    // 5. Lock and evaluate stock inside transaction (skip check if inventory was already deducted during order placement)
    if (!order.inventoryProcessed) {
      for (const item of sortedItems) {
        if (item.variantId) {
          const variant = await ProductVariant.findOne({
            where: { id: item.variantId },
            lock: transaction.LOCK.UPDATE,
            transaction
          });
          if (!variant || variant.stock < item.quantity) {
            isInventoryValid = false;
          }
          lockedStock[`v_${item.variantId}`] = variant;
        } else {
          const product = await Product.findOne({
            where: { id: item.productId },
            lock: transaction.LOCK.UPDATE,
            transaction
          });
          if (!product || product.stock < item.quantity) {
            isInventoryValid = false;
          }
          lockedStock[`p_${item.productId}`] = product;
        }
      }
    }

    // 6. Process stock deduction or initiate refund
    if (isInventoryValid) {
      const { syncStorefrontStock, resolveWarehouseIdForItem } = require('./warehouseController');

      // Deduct inventory if not already processed
      if (!order.inventoryProcessed) {
        for (const item of sortedItems) {
          const whId = await resolveWarehouseIdForItem(item.productId, item.variantId, transaction);
          let preDeductionStock = 0;

          if (item.variantId && lockedStock[`v_${item.variantId}`]) {
            preDeductionStock = parseInt(lockedStock[`v_${item.variantId}`].stock, 10) || 0;
            await lockedStock[`v_${item.variantId}`].decrement('stock', { by: item.quantity, transaction });
            const parentProduct = await Product.findOne({
              where: { id: item.productId },
              lock: transaction.LOCK.UPDATE,
              transaction
            });
            if (parentProduct) {
              await parentProduct.decrement('stock', { by: item.quantity, transaction });
            }
          } else if (lockedStock[`p_${item.productId}`]) {
            preDeductionStock = parseInt(lockedStock[`p_${item.productId}`].stock, 10) || 0;
            await lockedStock[`p_${item.productId}`].decrement('stock', { by: item.quantity, transaction });
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
            reason: `${gatewayType} payment confirmation: ${gatewayPaymentId}`
          }, { transaction });
        }
      }

      let currentTimeline = order.statusTimeline || {};
      if (typeof currentTimeline === 'string') {
        try { currentTimeline = JSON.parse(currentTimeline); } catch (e) { currentTimeline = {}; }
      }
      const nowIso = new Date().toISOString();
      const updatedTimeline = {
        ...currentTimeline,
        PAID: nowIso,
        CONFIRMED: currentTimeline.CONFIRMED || nowIso,
        PENDING: currentTimeline.PENDING || (order.createdAt ? new Date(order.createdAt).toISOString() : nowIso)
      };

      // Update Order PAID status
      await order.update({
        status: 'PAID',
        paymentStatus: 'PAID',
        razorpay_payment_id: gatewayType === 'razorpay' ? gatewayPaymentId : null,
        razorpay_signature: signature || null,
        paymentGatewayRef: order.paymentGatewayRef || gatewayPaymentId,
        inventoryProcessed: true,
        statusTimeline: updatedTimeline
      }, { transaction });

      // Clear server-side cart items upon online payment confirmation (unless Buy Now order)
      const isBuyNowOrder = Boolean(order.notes && order.notes.includes('[BUY_NOW]'));
      const cartWhere = (!isBuyNowOrder && order.customerId) ? { customerId: order.customerId } : ((!isBuyNowOrder && order.sessionId) ? { sessionId: order.sessionId } : null);
      if (cartWhere) {
        const userCart = await Cart.findOne({ where: cartWhere, transaction });
        if (userCart) {
          await CartItem.destroy({ where: { cartId: userCart.id }, transaction });
        }
      }

      // Credit earned loyalty points to customer account ONLY after payment confirmation
      if (order.customerId) {
        const { LoyaltyLedger, SiteSetting } = require('../models');
        const currencyRateService = require('../services/currencyRateService');
        const customer = await Customer.findByPk(order.customerId, { transaction });
        if (customer) {
          const existingEarn = await LoyaltyLedger.findOne({
            where: { customerId: customer.id, orderId: order.id, type: 'EARN' },
            transaction
          });
          if (!existingEarn) {
            let loyaltySettings = { earnRate: 20 };
            const settingsRec = await SiteSetting.findOne({ where: { key: 'loyalty' }, transaction });
            if (settingsRec) {
              try { loyaltySettings = { ...loyaltySettings, ...JSON.parse(settingsRec.value) }; } catch (e) {}
            }
            const netAmount = Number(order.totalAmount || 0);
            let baseAmountInr = netAmount;
            if (String(order.currency).toUpperCase() === 'AED') {
              const liveRate = currencyRateService.getRate();
              const rate = (liveRate > 0) ? liveRate : currencyRateService.FALLBACK_RATE;
              baseAmountInr = netAmount * rate;
            }
            const earnRate = Number(loyaltySettings.earnRate) || 20;
            const earnedPts = earnRate > 0 ? Math.floor(baseAmountInr / earnRate) : 0;
            if (earnedPts > 0) {
              await LoyaltyLedger.create({
                customerId: customer.id,
                orderId: order.id,
                type: 'EARN',
                points: earnedPts,
                balance: customer.loyaltyPoints + earnedPts,
                description: `Earned from Order ${order.orderNumber}`
              }, { transaction });
              await customer.increment('loyaltyPoints', { by: earnedPts, transaction });
            }
          }
        }
      }

      await transaction.commit();

      // Post-commit async hooks
      for (const item of sortedItems) {
        syncStorefrontStock(item.productId, item.variantId || null).catch(console.error);
      }

      checkAndNotifyLowStock(sortedItems).catch(console.error);

      // Send confirmed order & payment receipt notification email to customer
      Order.findByPk(order.id, {
        include: [
          { model: OrderItem, as: 'items' },
          { model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] }
        ]
      }).then(fullOrder => {
        if (fullOrder) {
          sendOrderStatusNotification(fullOrder, 'PAID').catch(err => console.error('[paymentController] Error sending order paid email:', err.message));
        }
      }).catch(err => console.error('[paymentController] Error fetching full order for email notification:', err.message));

      return res.json({ success: true, status: 'PAID' });
    } else {
      // Inventory sold out before confirmation! Rollback & Refund
      await order.update({
        status: 'PAYMENT_RECEIVED_STOCK_FAILED',
        paymentStatus: 'PAID',
        razorpay_payment_id: gatewayPaymentId,
        paymentGatewayRef: order.paymentGatewayRef || gatewayPaymentId,
        inventoryProcessed: false
      }, { transaction });

      await transaction.commit();

      // Trigger automatic, idempotent refund asynchronously
      initiateIdempotentRefund(order.id, gatewayPaymentId, paymentAmount).catch(console.error);

      return res.json({
        success: false,
        status: 'PAYMENT_RECEIVED_STOCK_FAILED',
        message: 'One or more items sold out. Refund initiated.'
      });
    }
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

// Webhook for Razorpay
const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] || '';
    const gateway = resolver.getGateway('INR');

    // 1. Signature Verification
    const isValid = await gateway.verifySignature(req.body, signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Razorpay webhook signature verification failed' });
    }

    const { payload } = req.body;
    if (!payload || !payload.payment) {
      return res.json({ success: true, message: 'Non-payment webhook ignored' });
    }

    const paymentEntity = payload.payment.entity;
    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = paymentEntity.order_id;
    const paymentAmount = paymentEntity.amount / 100;

    return await processConfirmedPayment({
      orderQuery: { razorpay_order_id: razorpayOrderId },
      gatewayPaymentId: razorpayPaymentId,
      signature: signature,
      paymentAmount: paymentAmount,
      gatewayType: 'razorpay',
      res
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Webhook/IPN for Telr
const handleTelrWebhook = async (req, res) => {
  try {
    const gateway = resolver.getGateway('AED');

    // 1. Webhook authenticity check (performs backchannel check API call to Telr)
    const isValid = await gateway.verifySignature(req.body);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Telr IPN signature/authenticity verification failed' });
    }

    const orderRef = req.body.tran_order_ref || req.body.order_ref || req.body.ivp_order;
    const cartId = req.body.tran_cartid || req.body.cart_id || req.body.ivp_cart;
    const paymentId = req.body.tran_ref || orderRef;
    const paymentAmount = parseFloat(req.body.tran_amount || req.body.ivp_amount || 0);

    const orConditions = [];
    if (orderRef) orConditions.push({ paymentGatewayRef: orderRef });
    if (cartId) orConditions.push({ orderNumber: cartId });

    if (orConditions.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing order reference or cart ID in Telr IPN payload' });
    }

    return await processConfirmedPayment({
      orderQuery: orConditions.length === 1 ? orConditions[0] : { [Op.or]: orConditions },
      gatewayPaymentId: paymentId,
      signature: req.body.tran_ref || '',
      paymentAmount: paymentAmount,
      gatewayType: 'telr',
      res
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET Admin revenue grouped by currency and gateway
const getPaymentSummary = async (req, res) => {
  try {
    const summary = await Order.findAll({
      where: { paymentStatus: 'PAID' },
      attributes: [
        'currency',
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount']
      ],
      group: ['currency'],
      raw: true
    });

    const refundedSummary = await Order.findAll({
      where: { status: 'REFUNDED' },
      attributes: [
        'currency',
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRefunded']
      ],
      group: ['currency'],
      raw: true
    });

    // Fetch details of recent transactions
    const recentPayments = await Order.findAll({
      where: { paymentStatus: 'PAID' },
      order: [['createdAt', 'DESC']],
      limit: 100,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({
      success: true,
      summary: summary.map(item => ({
        currency: item.currency,
        totalRevenue: parseFloat(item.totalRevenue || 0),
        transactionCount: parseInt(item.transactionCount || 0),
        gateway: item.currency === 'INR' ? 'Razorpay' : 'Telr'
      })),
      refundedSummary: refundedSummary.map(item => ({
        currency: item.currency,
        totalRefunded: parseFloat(item.totalRefunded || 0)
      })),
      payments: recentPayments.map(p => ({
        id: p.id,
        orderNo: p.orderNumber,
        amount: parseFloat(p.totalAmount),
        currency: p.currency,
        method: p.paymentMethod,
        ref: p.razorpay_payment_id || p.paymentGatewayRef || 'N/A',
        status: p.status,
        date: p.createdAt
      }))
    });
  } catch (err) {
    console.error('[getPaymentSummary] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Unified payment verification endpoint for both Razorpay (INR) and Telr (AED)
const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, orderRef } = req.body;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'orderId is required for payment verification' 
      });
    }

    // Fetch the order
    const order = await Order.findOne({ where: { id: orderId }, include: [{ model: OrderItem, as: 'items' }] });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // If order is already paid, return success immediately
    if (order.status === 'PAID' && order.paymentStatus === 'PAID') {
      return res.json({ success: true, status: 'PAID', message: 'Order is already marked as PAID' });
    }

    // ── 1. TELR / AED ORDER VERIFICATION ─────────────────────────────────
    if (String(order.currency).toUpperCase() === 'AED') {
      const gateway = resolver.getGateway('AED');
      const targetRef = orderRef || order.paymentGatewayRef || `telr_sim_${order.id}`;
      console.log(`[verifyPayment] Verifying Telr order ${order.orderNumber} with ref: ${targetRef}`);
      const checkResult = await gateway.fetchPayment(targetRef);

      if (checkResult.success) {
        return await processConfirmedPayment({
          orderQuery: { id: order.id },
          gatewayPaymentId: checkResult.gatewayRef || targetRef,
          signature: 'telr_verified',
          paymentAmount: parseFloat(order.totalAmount),
          gatewayType: 'telr',
          res
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Telr payment verification failed. Status: ' + (checkResult.status || 'FAILED') 
        });
      }
    }

    // ── 2. RAZORPAY / INR ORDER VERIFICATION ─────────────────────────────
    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ 
        success: false, 
        message: 'razorpayPaymentId, razorpayOrderId, and razorpaySignature are all required for INR payment verification' 
      });
    }

    // Verify order ID matches razorpay_order_id if recorded
    if (order.razorpay_order_id && order.razorpay_order_id !== razorpayOrderId) {
      return res.status(400).json({ success: false, message: 'Razorpay order mismatch for this order record' });
    }

    // Strictly verify signature using HMAC-SHA256 and constant-time comparison
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: 'Payment gateway secret not configured' });
    }

    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const providedBuf = Buffer.from(String(razorpaySignature).trim(), 'utf8');

    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    return await processConfirmedPayment({
      orderQuery: { id: orderId },
      gatewayPaymentId: razorpayPaymentId,
      signature: razorpaySignature,
      paymentAmount: parseFloat(order.totalAmount),
      gatewayType: 'razorpay',
      res
    });
  } catch (err) {
    console.error('[verifyPayment] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// In-memory cache for IP country lookups
const ipCountryCache = new Map();

// Geolocation auto-detection & country restriction handler
const detectGeoLocation = async (req, res) => {
  try {
    const overrideGeo = req.query.geo ? String(req.query.geo).toUpperCase() : null;
    const cfCountry = req.headers['cf-ipcountry'] ? String(req.headers['cf-ipcountry']).toUpperCase() : null;
    const xCountry = req.headers['x-appengine-country'] || req.headers['x-country-code'] || req.headers['cloudfront-viewer-country'];

    let countryCode = overrideGeo || cfCountry || (xCountry ? String(xCountry).toUpperCase() : null);

    // Extract client IP (handle comma-separated proxies)
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const clientIp = rawIp.split(',')[0].trim().replace(/^::ffff:/, '');

    if (!countryCode) {
      const isLocalOrPrivate = !clientIp ||
        clientIp === '127.0.0.1' ||
        clientIp === '::1' ||
        clientIp === 'localhost' ||
        clientIp.startsWith('10.') ||
        clientIp.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(clientIp);

      if (isLocalOrPrivate) {
        countryCode = 'IN'; // Local development default
      } else if (ipCountryCache.has(clientIp)) {
        countryCode = ipCountryCache.get(clientIp);
      } else {
        try {
          const geoRes = await axios.get(`http://ip-api.com/json/${clientIp}?fields=countryCode`, { timeout: 1500 });
          if (geoRes.data?.countryCode) {
            countryCode = String(geoRes.data.countryCode).toUpperCase();
            ipCountryCache.set(clientIp, countryCode);
          }
        } catch {
          countryCode = 'IN';
        }
      }
    }

    if (!countryCode) {
      countryCode = 'IN';
    }

    if (countryCode === 'AE') {
      return res.json({
        success: true,
        countryCode: 'AE',
        countryName: 'United Arab Emirates',
        currency: 'AED',
        gateway: 'telr',
        isAllowed: true
      });
    } else if (countryCode === 'IN') {
      return res.json({
        success: true,
        countryCode: 'IN',
        countryName: 'India',
        currency: 'INR',
        gateway: 'razorpay',
        isAllowed: true
      });
    } else {
      return res.json({
        success: true,
        countryCode,
        currency: 'INR',
        gateway: 'razorpay',
        isAllowed: false,
        message: 'Payments and order placement are accepted strictly from UAE and India only.'
      });
    }
  } catch (err) {
    console.error('[detectGeoLocation] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  detectGeoLocation,
  initiatePayment,
  handleRazorpayWebhook,
  handleTelrWebhook,
  getPaymentSummary,
  verifyPayment,
  verifyRazorpayPayment: verifyPayment, // Backward compatibility alias
};


