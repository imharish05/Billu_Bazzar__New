'use strict';
const { sequelize, ReturnRequest, Order, OrderItem, Product, ProductVariant, Customer, InventoryMovementLog, Warehouse, WarehouseStock, LoyaltyLedger } = require('../models');
const { Op } = require('sequelize');
const { toAbsoluteUrl } = require('../utils/imageUrl');
const RazorpayService = require('../services/RazorpayService');
const { sendReturnStatusNotification } = require('../services/emailService');

const processReturnLoyaltyAdjustment = async (returnRequest, transaction) => {
  try {
    if (!returnRequest || !returnRequest.customerId || !returnRequest.orderId) return;

    const cust = await Customer.findByPk(returnRequest.customerId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!cust) return;

    const order = returnRequest.order || await Order.findByPk(returnRequest.orderId, { transaction });
    if (!order) return;

    let currentBalance = Number(cust.loyaltyPoints) || 0;
    const orderSubtotal = Number(order.subtotal) || Number(order.totalAmount) || 1;
    const refundRatio = Math.min(1, Math.max(0, (Number(returnRequest.refundAmount) || 0) / orderSubtotal));

    // 1. Proportional Restoration of Redeemed Points
    if (order.redeemedPoints > 0) {
      const proportionalRedeemed = Math.round(Number(order.redeemedPoints) * refundRatio);
      if (proportionalRedeemed > 0) {
        currentBalance += proportionalRedeemed;
        await LoyaltyLedger.create({
          customerId: cust.id,
          orderId: order.id,
          type: 'BONUS',
          points: proportionalRedeemed,
          balance: currentBalance,
          description: `Restored ${proportionalRedeemed} redeemed points from returned item for Order ${order.orderNumber}`
        }, { transaction });
      }
    }

    // 2. Proportional Clawback of Earned Points (Negative Balance Approach - Approach A)
    const earnedLedgers = await LoyaltyLedger.findAll({
      where: { customerId: cust.id, orderId: order.id, type: 'EARN' },
      transaction,
    });
    const totalEarnedPoints = earnedLedgers.reduce((sum, l) => sum + Number(l.points || 0), 0);
    if (totalEarnedPoints > 0) {
      const proportionalEarned = Math.round(totalEarnedPoints * refundRatio);
      if (proportionalEarned > 0) {
        currentBalance = currentBalance - proportionalEarned;
        await LoyaltyLedger.create({
          customerId: cust.id,
          orderId: order.id,
          type: 'EXPIRE',
          points: -proportionalEarned,
          balance: currentBalance,
          description: `Reversed ${proportionalEarned} earned points from returned item for Order ${order.orderNumber}`
        }, { transaction });
      }
    }

    cust.loyaltyPoints = currentBalance;
    await cust.save({ transaction });
  } catch (err) {
    console.error('[processReturnLoyaltyAdjustment] Error adjusting loyalty points on return:', err.message);
  }
};

const formatReturn = (ret, req) => {
  if (!ret) return ret;
  const json = typeof ret.toJSON === 'function' ? ret.toJSON() : { ...ret };
  if (json.productImage) json.productImage = toAbsoluteUrl(json.productImage, req);
  if (json.unboxingVideoUrl && !json.unboxingVideoUrl.startsWith('http')) {
    json.unboxingVideoUrl = toAbsoluteUrl(json.unboxingVideoUrl, req);
  }
  if (Array.isArray(json.images)) {
    json.images = json.images.map(img => (img.startsWith('http') ? img : toAbsoluteUrl(img, req)));
  }
  if (json.orderItem?.productImage) {
    json.orderItem.productImage = toAbsoluteUrl(json.orderItem.productImage, req);
  }
  if (typeof json.statusTimeline === 'string') {
    try { json.statusTimeline = JSON.parse(json.statusTimeline); } catch (e) { json.statusTimeline = {}; }
  }

  // Ensure net product refund amount (excluding non-refundable shipping fee and minus proportional discounts)
  if (json.order && json.orderItem && json.status !== 'REFUNDED') {
    const itemGrossTotal = Number(json.orderItem.totalPrice) || (Number(json.orderItem.unitPrice || 0) * (json.orderItem.quantity || 1));
    const orderSubtotal = Number(json.order.subtotal) || itemGrossTotal || 1;
    const orderDiscount = Number(json.order.discountAmount) || 0;
    const itemDiscountRatio = orderSubtotal > 0 ? (itemGrossTotal / orderSubtotal) : 0;
    const itemDiscountShare = Math.min(itemGrossTotal, orderDiscount * itemDiscountRatio);
    const netItemTotal = Math.max(0, itemGrossTotal - itemDiscountShare);
    const netUnitPrice = (json.orderItem.quantity || 1) > 0 ? (netItemTotal / (json.orderItem.quantity || 1)) : netItemTotal;
    const netRefund = Math.round(netUnitPrice * (json.quantity || 1) * 100) / 100;
    if (netRefund > 0) {
      json.refundAmount = netRefund;
    }
  }

  return json;
};

// Customer: Submit an individual item return request with compulsory unboxing video
const requestReturn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      orderId,
      orderItemId,
      quantity = 1,
      reason,
      reasonDetails,
      bankDetails,
    } = req.body;

    let unboxingVideoUrl = req.body.unboxingVideoUrl ? req.body.unboxingVideoUrl.trim() : '';
    let images = [];

    // Parse images if stringified JSON
    if (typeof req.body.images === 'string') {
      try { images = JSON.parse(req.body.images); } catch (e) { images = []; }
    } else if (Array.isArray(req.body.images)) {
      images = req.body.images;
    }

    // Handle multer files if uploaded
    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        unboxingVideoUrl = `/uploads/returns/${req.files.video[0].filename}`;
      } else if (req.files.unboxingVideo && req.files.unboxingVideo[0]) {
        unboxingVideoUrl = `/uploads/returns/${req.files.unboxingVideo[0].filename}`;
      }
      if (req.files.images && Array.isArray(req.files.images)) {
        const uploadedImages = req.files.images.map(f => `/uploads/returns/${f.filename}`);
        images = [...images, ...uploadedImages];
      }
    } else if (req.file) {
      if (req.file.mimetype.includes('video')) {
        unboxingVideoUrl = `/uploads/returns/${req.file.filename}`;
      } else {
        images.push(`/uploads/returns/${req.file.filename}`);
      }
    }

    // 1. COMPULSORY VIDEO VERIFICATION GUARD
    if (!unboxingVideoUrl) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'A compulsory parcel unboxing video is required for return verification. Please upload an uncut unboxing video or provide a valid video link.',
      });
    }

    if (!reason || !reason.trim()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid reason for returning this item.',
      });
    }

    // 2. Validate Order & OrderItem ownership
    const order = await Order.findOne({
      where: { id: orderId, customerId: req.customer.id },
      include: [{ model: OrderItem, as: 'items' }],
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Delivered order not found or does not belong to your account.' });
    }

    if (order.status !== 'DELIVERED') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Returns can only be requested for orders that have been successfully delivered.',
      });
    }

    const orderItem = (order.items || []).find(i => String(i.id) === String(orderItemId));
    if (!orderItem) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Selected item was not found in this order.' });
    }

    const returnQty = Math.max(1, parseInt(quantity, 10) || 1);
    if (returnQty > orderItem.quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Return quantity (${returnQty}) cannot exceed ordered quantity (${orderItem.quantity}).`,
      });
    }

    // Check for existing active return requests for this item
    const existingReturn = await ReturnRequest.findOne({
      where: {
        orderItemId: orderItem.id,
        status: { [Op.notIn]: ['REJECTED'] },
      },
      transaction,
    });

    if (existingReturn) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `A return request (${existingReturn.returnNumber}) is already in progress for this item.`,
      });
    }

    // 3. Compute net product refund amount (excluding non-refundable shipping fee and minus proportional discounts)
    const itemGrossTotal = Number(orderItem.totalPrice) || (Number(orderItem.unitPrice || 0) * (orderItem.quantity || 1));
    const orderSubtotal = Number(order.subtotal) || itemGrossTotal || 1;
    const orderDiscount = Number(order.discountAmount) || 0;

    // Calculate proportional discount for this item
    const itemDiscountRatio = orderSubtotal > 0 ? (itemGrossTotal / orderSubtotal) : 0;
    const itemDiscountShare = Math.min(itemGrossTotal, orderDiscount * itemDiscountRatio);

    // Net product value paid for this item
    const netItemTotal = Math.max(0, itemGrossTotal - itemDiscountShare);
    const netUnitPrice = (orderItem.quantity || 1) > 0 ? (netItemTotal / (orderItem.quantity || 1)) : netItemTotal;
    const refundAmount = Math.round(netUnitPrice * returnQty * 100) / 100;

    // 4. Generate unique return number
    const timestampSuffix = Date.now().toString().slice(-4);
    const returnNumber = `RET-${order.orderNumber || order.id}-${orderItem.id}-${timestampSuffix}`;

    // Parse bank details if string
    let parsedBankDetails = null;
    if (typeof bankDetails === 'string') {
      try { parsedBankDetails = JSON.parse(bankDetails); } catch (e) { parsedBankDetails = null; }
    } else if (typeof bankDetails === 'object') {
      parsedBankDetails = bankDetails;
    }

    // 5. Create Return Request
    const returnRequest = await ReturnRequest.create({
      returnNumber,
      orderId: order.id,
      orderItemId: orderItem.id,
      customerId: req.customer.id,
      productId: orderItem.productId,
      variantId: orderItem.variantId,
      productName: orderItem.productName,
      productImage: orderItem.productImage || orderItem.image || null,
      selectedVariant: orderItem.selectedVariant || {},
      quantity: returnQty,
      refundAmount,
      currency: order.currency || 'INR',
      reason: reason.trim(),
      reasonDetails: reasonDetails ? reasonDetails.trim() : null,
      unboxingVideoUrl,
      images,
      bankDetails: parsedBankDetails,
      status: 'REQUESTED',
      statusTimeline: {
        REQUESTED: new Date().toISOString(),
      },
    }, { transaction });

    // 6. Update order item return status
    orderItem.returnStatus = 'REQUESTED';
    await orderItem.save({ transaction });

    await transaction.commit();

    // Send initial return submission email notification
    sendReturnStatusNotification(returnRequest, req.customer, order).catch((e) =>
      console.error('[requestReturn] Error sending initial return notification email:', e.message)
    );

    res.status(201).json({
      success: true,
      message: 'Return request submitted successfully with unboxing video proof.',
      returnRequest: formatReturn(returnRequest, req),
    });
  } catch (err) {
    await transaction.rollback();
    console.error('[requestReturn error]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to submit return request.' });
  }
};

// Customer: Get all return requests for logged in customer
const getMyReturns = async (req, res) => {
  try {
    const returns = await ReturnRequest.findAll({
      where: { customerId: req.customer.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'status', 'deliveredAt', 'currency', 'totalAmount', 'createdAt'],
        },
        {
          model: OrderItem,
          as: 'orderItem',
          attributes: ['id', 'productName', 'quantity', 'unitPrice', 'totalPrice', 'selectedVariant', 'returnStatus'],
        },
      ],
    });

    const formattedReturns = returns.map(r => formatReturn(r, req));
    res.json({ success: true, returns: formattedReturns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Customer: Get single return request by ID or returnNumber
const getMyReturnById = async (req, res) => {
  try {
    const isNum = !isNaN(req.params.id) && !isNaN(parseInt(req.params.id, 10));
    const whereClause = isNum
      ? {
          customerId: req.customer.id,
          [Op.or]: [{ id: parseInt(req.params.id, 10) }, { returnNumber: req.params.id }],
        }
      : { customerId: req.customer.id, returnNumber: req.params.id };

    const returnRequest = await ReturnRequest.findOne({
      where: whereClause,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'status', 'deliveredAt', 'currency', 'totalAmount', 'createdAt'],
        },
        {
          model: OrderItem,
          as: 'orderItem',
        },
      ],
    });

    if (!returnRequest) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    res.json({ success: true, returnRequest: formatReturn(returnRequest, req) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin: Get all returns with filters
const getAllAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const where = {};

    if (status && status !== 'All') {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { returnNumber: { [Op.like]: `%${search}%` } },
        { productName: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await ReturnRequest.findAndCountAll({
      where,
      distinct: true,
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['createdAt', 'DESC']],
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'], required: false },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'paymentMethod', 'paymentStatus', 'razorpay_payment_id', 'razorpay_order_id', 'paymentGatewayRef', 'currency', 'subtotal', 'discountAmount', 'shippingAmount', 'taxAmount', 'totalAmount'],
          required: false,
        },
        { model: OrderItem, as: 'orderItem', required: false },
      ],
    });

    // Compute status counts for admin badges
    const statusCountsRaw = await ReturnRequest.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });
    const statusCounts = { All: 0, REQUESTED: 0, APPROVED: 0, PICKUP_SCHEDULED: 0, PICKED_UP: 0, RECEIVED_AT_WAREHOUSE: 0, REFUNDED: 0, REJECTED: 0 };
    let totalAll = 0;
    (statusCountsRaw || []).forEach(row => {
      const c = parseInt(row.count, 10) || 0;
      statusCounts[row.status] = c;
      totalAll += c;
    });
    statusCounts.All = totalAll;

    const p = Math.max(1, parseInt(page, 10));
    const l = Math.max(1, parseInt(limit, 10));
    const formatted = rows.map(r => formatReturn(r, req));

    res.json({
      success: true,
      returns: formatted,
      statusCounts,
      total: count,
      page: p,
      limit: l,
      totalPages: Math.ceil(count / l),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin: Update status of a return request
const updateStatusAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { status, adminNotes, rejectedReason, pickupDate, refundTransactionRef } = req.body;
    const returnRequest = await ReturnRequest.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'paymentMethod', 'paymentStatus', 'razorpay_payment_id', 'razorpay_order_id', 'paymentGatewayRef', 'currency', 'subtotal', 'discountAmount', 'shippingAmount', 'taxAmount', 'totalAmount', 'shippingAddress', 'billingAddress'],
        },
        { model: OrderItem, as: 'orderItem' },
      ],
      transaction,
    });

    if (!returnRequest) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    const prevStatus = returnRequest.status;
    returnRequest.status = status || returnRequest.status;
    if (adminNotes !== undefined) returnRequest.adminNotes = adminNotes;
    if (rejectedReason !== undefined) returnRequest.rejectedReason = rejectedReason;
    if (pickupDate !== undefined) returnRequest.pickupDate = pickupDate;
    if (refundTransactionRef !== undefined) returnRequest.refundTransactionRef = refundTransactionRef;

    let currentTimeline = returnRequest.statusTimeline || {};
    if (typeof currentTimeline === 'string') {
      try { currentTimeline = JSON.parse(currentTimeline); } catch (e) { currentTimeline = {}; }
    }
    returnRequest.statusTimeline = {
      ...currentTimeline,
      [status]: new Date().toISOString(),
    };

    await returnRequest.save({ transaction });

    // Update associated order item return status
    if (returnRequest.orderItem) {
      if (status === 'REFUNDED') {
        returnRequest.orderItem.returnStatus = 'REFUNDED';
      } else if (status === 'REJECTED') {
        returnRequest.orderItem.returnStatus = 'REJECTED';
      } else if (['APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED_AT_WAREHOUSE'].includes(status)) {
        returnRequest.orderItem.returnStatus = 'APPROVED';
      }
      await returnRequest.orderItem.save({ transaction });
    }

    // If transitioned to REFUNDED, optionally restock item
    if (status === 'REFUNDED' && prevStatus !== 'REFUNDED') {
      if (returnRequest.variantId) {
        const variant = await ProductVariant.findByPk(returnRequest.variantId, { transaction });
        if (variant) await variant.increment('stock', { by: returnRequest.quantity, transaction });
      } else if (returnRequest.productId) {
        const product = await Product.findByPk(returnRequest.productId, { transaction });
        if (product) await product.increment('stock', { by: returnRequest.quantity, transaction });
      }

      await InventoryMovementLog.create({
        productId: returnRequest.productId || 0,
        variantId: returnRequest.variantId || null,
        orderId: returnRequest.orderId,
        quantity: returnRequest.quantity,
        type: 'RETURN_RESTOCK',
        reason: `Return Restock for return ${returnRequest.returnNumber}`,
      }, { transaction });

      // Loyalty points adjustment on return refund (Negative balance approach)
      await processReturnLoyaltyAdjustment(returnRequest, transaction);

      // Sync Order payment status & refund timeline
      if (returnRequest.orderId) {
        const orderInstance = await Order.findByPk(returnRequest.orderId, {
          include: [{ model: OrderItem, as: 'items' }],
          transaction
        });
        if (orderInstance) {
          let orderTimeline = orderInstance.statusTimeline || {};
          if (typeof orderTimeline === 'string') {
            try { orderTimeline = JSON.parse(orderTimeline); } catch (e) { orderTimeline = {}; }
          }
          const allItemsRefunded = (orderInstance.items || []).every(item => item.returnStatus === 'REFUNDED' || item.id === returnRequest.orderItemId);
          orderInstance.paymentStatus = allItemsRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
          orderTimeline.refundStatus = 'COMPLETED';
          orderTimeline.refundGatewayRef = returnRequest.refundTransactionRef || orderInstance.razorpay_payment_id;
          orderTimeline.refundAmount = parseFloat(returnRequest.refundAmount) || 0;
          orderTimeline.refundNote = `Return refund of ${returnRequest.currency || 'INR'} ${orderTimeline.refundAmount} processed successfully (Ref: ${orderTimeline.refundGatewayRef}).`;
          orderTimeline.returnRefundDate = new Date().toISOString();
          orderInstance.statusTimeline = orderTimeline;
          await orderInstance.save({ transaction });
        }
      }
    }

    await transaction.commit();

    // Trigger email notification for status change
    sendReturnStatusNotification(returnRequest, returnRequest.customer, returnRequest.order).catch((e) =>
      console.error('[updateStatusAdmin] Error sending return status email:', e.message)
    );

    res.json({
      success: true,
      message: `Return request marked as ${status}`,
      returnRequest: formatReturn(returnRequest, req),
    });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin: Initiate automated online refund via Razorpay for a return request
const initiateRefundAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const returnRequest = await ReturnRequest.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'paymentMethod', 'paymentStatus', 'razorpay_payment_id', 'razorpay_order_id', 'paymentGatewayRef', 'currency', 'subtotal', 'discountAmount', 'shippingAmount', 'taxAmount', 'totalAmount', 'shippingAddress', 'billingAddress'],
        },
        { model: OrderItem, as: 'orderItem' },
      ],
      transaction,
    });

    if (!returnRequest) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Return request not found.' });
    }

    if (returnRequest.status === 'REFUNDED') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'This return request has already been refunded.',
      });
    }

    if (returnRequest.status !== 'RECEIVED_AT_WAREHOUSE') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Refund can only be initiated after the returned item has been received and inspected at the warehouse (Current status: ${returnRequest.status}). Please update status to RECEIVED AT WAREHOUSE first.`,
      });
    }

    const order = returnRequest.order;
    if (!order) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Associated order could not be found.' });
    }

    const paymentId = order.razorpay_payment_id || order.paymentGatewayRef;
    if (!paymentId || paymentId.startsWith('COD')) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'No online Razorpay payment ID found for this order. For Cash on Delivery (COD) orders, please send funds via manual Bank/UPI transfer and enter the UTR reference.',
      });
    }

    // Accurately compute/verify product refund amount (subtracting proportional discounts, excluding shipping)
    let productRefundAmount = parseFloat(returnRequest.refundAmount) || 0;
    if (order && returnRequest.orderItem) {
      const itemGrossTotal = Number(returnRequest.orderItem.totalPrice) || (Number(returnRequest.orderItem.unitPrice || 0) * (returnRequest.orderItem.quantity || 1));
      const orderSubtotal = Number(order.subtotal) || itemGrossTotal || 1;
      const orderDiscount = Number(order.discountAmount) || 0;
      const itemDiscountRatio = orderSubtotal > 0 ? (itemGrossTotal / orderSubtotal) : 0;
      const itemDiscountShare = Math.min(itemGrossTotal, orderDiscount * itemDiscountRatio);
      const netItemTotal = Math.max(0, itemGrossTotal - itemDiscountShare);
      const netUnitPrice = (returnRequest.orderItem.quantity || 1) > 0 ? (netItemTotal / (returnRequest.orderItem.quantity || 1)) : netItemTotal;
      const calculatedNetRefund = Math.round(netUnitPrice * (returnRequest.quantity || 1) * 100) / 100;
      if (calculatedNetRefund > 0) {
        productRefundAmount = calculatedNetRefund;
      }
    }

    if (productRefundAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid product refund amount.',
      });
    }

    // Call Razorpay Refund API
    const refundResult = await RazorpayService.refund(paymentId, productRefundAmount);
    if (!refundResult || !refundResult.success) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: `Razorpay refund failed: ${refundResult?.status || 'Payment gateway rejected refund request'}`,
      });
    }

    const prevStatus = returnRequest.status;
    const actualRefundedAmount = refundResult.amount !== undefined ? refundResult.amount : productRefundAmount;
    returnRequest.status = 'REFUNDED';
    returnRequest.refundAmount = actualRefundedAmount;
    returnRequest.refundTransactionRef = refundResult.gatewayRef || `rfnd_${Date.now()}`;

    const existingNotes = returnRequest.adminNotes ? `${returnRequest.adminNotes}\n` : '';
    returnRequest.adminNotes = `${existingNotes}[Razorpay Refund] Product amount ${returnRequest.currency || 'INR'} ${actualRefundedAmount} refunded via Payment ID: ${paymentId}. Gateway Ref: ${returnRequest.refundTransactionRef}`.trim();

    let currentTimeline = returnRequest.statusTimeline || {};
    if (typeof currentTimeline === 'string') {
      try { currentTimeline = JSON.parse(currentTimeline); } catch (e) { currentTimeline = {}; }
    }
    const nowIso = new Date().toISOString();
    if (!currentTimeline.RECEIVED_AT_WAREHOUSE) {
      currentTimeline.RECEIVED_AT_WAREHOUSE = nowIso;
    }
    currentTimeline.REFUNDED = nowIso;
    returnRequest.statusTimeline = currentTimeline;

    await returnRequest.save({ transaction });

    // Update associated order item
    if (returnRequest.orderItem) {
      returnRequest.orderItem.returnStatus = 'REFUNDED';
      await returnRequest.orderItem.save({ transaction });
    }

    // Restock product/variant
    if (prevStatus !== 'REFUNDED') {
      if (returnRequest.variantId) {
        const variant = await ProductVariant.findByPk(returnRequest.variantId, { transaction });
        if (variant) await variant.increment('stock', { by: returnRequest.quantity, transaction });
      } else if (returnRequest.productId) {
        const product = await Product.findByPk(returnRequest.productId, { transaction });
        if (product) await product.increment('stock', { by: returnRequest.quantity, transaction });
      }

      await InventoryMovementLog.create({
        productId: returnRequest.productId || 0,
        variantId: returnRequest.variantId || null,
        orderId: returnRequest.orderId,
        quantity: returnRequest.quantity,
        type: 'RETURN_RESTOCK',
        reason: `Automated Razorpay product refund for return ${returnRequest.returnNumber} (Ref: ${returnRequest.refundTransactionRef})`,
      }, { transaction });

      // Loyalty points adjustment on return refund (Negative balance approach)
      await processReturnLoyaltyAdjustment(returnRequest, transaction);

      // Sync Order payment status & refund timeline
      if (returnRequest.orderId) {
        const orderInstance = await Order.findByPk(returnRequest.orderId, {
          include: [{ model: OrderItem, as: 'items' }],
          transaction
        });
        if (orderInstance) {
          let orderTimeline = orderInstance.statusTimeline || {};
          if (typeof orderTimeline === 'string') {
            try { orderTimeline = JSON.parse(orderTimeline); } catch (e) { orderTimeline = {}; }
          }
          const allItemsRefunded = (orderInstance.items || []).every(item => item.returnStatus === 'REFUNDED' || item.id === returnRequest.orderItemId);
          orderInstance.paymentStatus = allItemsRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
          orderTimeline.refundStatus = 'COMPLETED';
          orderTimeline.refundGatewayRef = returnRequest.refundTransactionRef || refundResult.gatewayRef || paymentId;
          orderTimeline.refundAmount = actualRefundedAmount;
          orderTimeline.refundNote = `Return refund of ${returnRequest.currency || 'INR'} ${actualRefundedAmount} processed successfully via Razorpay (Ref: ${orderTimeline.refundGatewayRef}).`;
          orderTimeline.returnRefundDate = new Date().toISOString();
          orderInstance.statusTimeline = orderTimeline;
          await orderInstance.save({ transaction });
        }
      }
    }

    await transaction.commit();

    // Trigger email notification for refund completion
    sendReturnStatusNotification(returnRequest, returnRequest.customer, returnRequest.order).catch((e) =>
      console.error('[initiateRefundAdmin] Error sending refund completion email:', e.message)
    );

    return res.json({
      success: true,
      message: `Successfully processed Razorpay refund of ${returnRequest.currency || 'INR'} ${actualRefundedAmount}.`,
      refundId: returnRequest.refundTransactionRef,
      returnRequest: formatReturn(returnRequest, req),
    });
  } catch (err) {
    await transaction.rollback();
    console.error('[initiateRefundAdmin Error]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to initiate Razorpay refund.',
    });
  }
};

module.exports = {
  requestReturn,
  getMyReturns,
  getMyReturnById,
  getAllAdmin,
  updateStatusAdmin,
  initiateRefundAdmin,
};
