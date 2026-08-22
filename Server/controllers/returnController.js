'use strict';
const { sequelize, ReturnRequest, Order, OrderItem, Product, ProductVariant, Customer, InventoryMovementLog, Warehouse, WarehouseStock } = require('../models');
const { Op } = require('sequelize');
const { toAbsoluteUrl } = require('../utils/imageUrl');

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

    // 3. Compute refund amount
    const unitPrice = Number(orderItem.unitPrice) || (Number(orderItem.totalPrice) / orderItem.quantity) || 0;
    const refundAmount = Math.round(unitPrice * returnQty * 100) / 100;

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

// Customer: Get single return request by ID
const getMyReturnById = async (req, res) => {
  try {
    const returnRequest = await ReturnRequest.findOne({
      where: { id: req.params.id, customerId: req.customer.id },
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
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['createdAt', 'DESC']],
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'], required: false },
        { model: Order, as: 'order', attributes: ['id', 'orderNumber', 'paymentMethod', 'currency', 'totalAmount'], required: false },
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
      include: [{ model: OrderItem, as: 'orderItem' }],
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
    }

    await transaction.commit();
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

module.exports = {
  requestReturn,
  getMyReturns,
  getMyReturnById,
  getAllAdmin,
  updateStatusAdmin,
};
