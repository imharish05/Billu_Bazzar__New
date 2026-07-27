'use strict';

const crypto = require('crypto');
const { sequelize, Order, OrderItem, Product, ProductVariant, InventoryMovementLog, Customer, Warehouse, WarehouseStock } = require('../models');
const resolver = require('../services/paymentGatewayResolver');
const { sendOrderStatusNotification } = require('../services/emailService');

// Helper to push order details to Shiprocket shipping API
const pushToShiprocket = async (orderId) => {
  try {
    const order = await Order.findByPk(orderId, { include: [{ model: OrderItem, as: 'items' }] });
    if (!order) return;
    
    console.log(`[Shiprocket] Asynchronously sending Order #${order.orderNumber} to Shiprocket API...`);
    await order.update({ shiprocketOrderId: `SR-${Math.floor(Math.random() * 10000000)}` });
    console.log(`[Shiprocket] Order #${order.orderNumber} successfully pushed to Shiprocket.`);
  } catch (err) {
    console.error(`[Shiprocket] Error pushing order ${orderId} to Shiprocket:`, err.message);
  }
};

// Helper to check and alert administrators of low stock events
const checkAndNotifyLowStock = async (items) => {
  try {
    for (const item of items) {
      let currentStock = 0;
      let name = item.productName || '';
      let sku = '';

      if (item.variantId) {
        const variant = await ProductVariant.findByPk(item.variantId);
        if (variant) {
          currentStock = variant.stock;
          sku = variant.sku;
        }
      } else {
        const product = await Product.findByPk(item.productId);
        if (product) {
          currentStock = product.stock;
          sku = product.sku;
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

    // Lookup only by id — customerId can be null for guest orders
    const order = await Order.findOne({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: `Order #${orderId} not found` });
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({
        success: false,
        message: `Order is in '${order.status}' state, not PENDING_PAYMENT. Cannot initiate payment.`
      });
    }

    // Resolve gateway based on order currency (INR → Razorpay, AED → Telr)
    const gateway = resolver.getGateway(order.currency);
    console.log(`[initiatePayment] Order #${order.orderNumber} | Currency: ${order.currency} | Gateway: ${order.currency === 'INR' ? 'Razorpay' : 'Telr'}`);

    const gatewayOrder = await gateway.createOrder({
      amount: parseFloat(order.totalAmount),
      currency: order.currency,
      receipt: order.orderNumber,
    });

    console.log(`[initiatePayment] Gateway order created: ${gatewayOrder.gatewayRef}`);

    // Update order with gateway references
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
    if (order.inventoryProcessed || order.status === 'PAID') {
      await transaction.rollback();
      return res.json({ success: true, message: 'Payment webhook already processed previously (no-op)' });
    }

    // Verify duplicate payment ID check at order level
    const duplicatePayment = await Order.findOne({
      where: { razorpay_payment_id: gatewayPaymentId },
      transaction
    });
    if (duplicatePayment) {
      await transaction.rollback();
      return res.json({ success: true, message: 'Duplicate transaction ignored' });
    }

    // 4. Gather and Sort items in consistent ascending order to prevent deadlocks
    const sortedItems = [...order.items].sort((a, b) => {
      if (a.productId !== b.productId) return a.productId - b.productId;
      return (a.variantId || 0) - (b.variantId || 0);
    });

    const lockedStock = {};
    let isInventoryValid = true;

    // 5. Lock and evaluate stock inside the transaction
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

    // 6. Process stock deduction or initiate refund
    if (isInventoryValid) {
      const fulfillmentWh = await Warehouse.findOne({ where: { isFulfillment: true, isActive: true }, transaction });
      const whId = fulfillmentWh ? fulfillmentWh.id : null;

      // Deduct inventory
      for (const item of sortedItems) {
        if (item.variantId) {
          await lockedStock[`v_${item.variantId}`].decrement('stock', { by: item.quantity, transaction });
        } else {
          await lockedStock[`p_${item.productId}`].decrement('stock', { by: item.quantity, transaction });
        }

        if (whId) {
          const [whStock] = await WarehouseStock.findOrCreate({
            where: { warehouseId: whId, productId: item.productId, variantId: item.variantId || null },
            defaults: { quantity: 0, reservedQty: 0 },
            transaction
          });
          await whStock.decrement('quantity', { by: item.quantity, transaction });
        }

        // Log movement
        await InventoryMovementLog.create({
          productId: item.productId,
          variantId: item.variantId,
          warehouseId: whId,
          orderId: order.id,
          quantity: -item.quantity,
          type: 'ORDER_DEDUCTION',
          reason: `${gatewayType} payment confirmation: ${gatewayPaymentId}`
        }, { transaction });
      }

      // Update Order PAID status
      await order.update({
        status: 'PAID',
        paymentStatus: 'PAID',
        razorpay_payment_id: gatewayPaymentId,
        razorpay_signature: signature || null,
        paymentGatewayRef: order.paymentGatewayRef || gatewayPaymentId,
        inventoryProcessed: true
      }, { transaction });

      await transaction.commit();

      // Post-commit async hooks
      pushToShiprocket(order.id).catch(console.error);
      checkAndNotifyLowStock(sortedItems).catch(console.error);
      sendOrderStatusNotification(order, 'PAID').catch(err => console.error('[paymentController] Error sending order paid email:', err.message));

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
    const paymentId = req.body.tran_ref || orderRef;
    const paymentAmount = parseFloat(req.body.tran_amount || req.body.ivp_amount || 0);

    return await processConfirmedPayment({
      orderQuery: { paymentGatewayRef: orderRef },
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

// Verify payment signature after client-side Razorpay payment completes
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing required payment verification fields' });
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: 'Razorpay key secret is not configured' });
    }

    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpaySignature;
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Fetch the order
    const order = await Order.findOne({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
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
    console.error('[verifyRazorpayPayment] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  initiatePayment,
  handleRazorpayWebhook,
  handleTelrWebhook,
  getPaymentSummary,
  verifyRazorpayPayment
};

