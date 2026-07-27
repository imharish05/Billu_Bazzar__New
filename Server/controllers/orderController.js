'use strict';
const { sequelize, Order, OrderItem, Product, ProductVariant, Customer, Coupon, Affiliate, Cart, CartItem, InventoryMovementLog, Warehouse, WarehouseStock, SiteSetting, LoyaltyLedger, DeliveryZone } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sendOrderStatusNotification } = require('../services/emailService');

// Helper to push order details to Shiprocket shipping API
const pushToShiprocket = async (orderId) => {
  try {
    const order = await Order.findByPk(orderId, { include: [{ model: OrderItem, as: 'items' }] });
    if (!order) return;
    
    console.log(`[Shiprocket] Asynchronously sending Order #${order.orderNumber} to Shiprocket API...`);
    // Mock Shiprocket API call
    await order.update({ shiprocketOrderId: `SR-${Math.floor(Math.random() * 10000000)}` });
    console.log(`[Shiprocket] Order #${order.orderNumber} successfully pushed to Shiprocket.`);
  } catch (err) {
    console.error(`[Shiprocket] Error pushing order ${orderId} to Shiprocket:`, err.message);
  }
};

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customerId, search } = req.query;
    const { Op } = require('sequelize');
    const where = {};

    if (status) {
      where.status = status;
    } else {
      // Exclude payment-initiated-but-not-completed orders from default listing
      // PENDING_PAYMENT = Razorpay initiated but not paid/cancelled
      // EXPIRED = Razorpay session timed out
      where.status = { [Op.notIn]: ['PENDING_PAYMENT', 'EXPIRED'] };
    }

    if (customerId) where.customerId = customerId;
    if (search) {
      where[Op.or] = [
        { orderNumber: { [Op.like]: `%${search}%` } },
        { id: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Order.findAndCountAll({
      where, limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: OrderItem, as: 'items' },
      ],
    });
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.max(1, parseInt(limit, 10));
    res.json({ success: true, orders: rows, total: count, page: p, limit: l, totalPages: Math.ceil(count / l) });
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
        // Exclude incomplete/abandoned payment attempts
        status: { [Op.notIn]: ['PENDING_PAYMENT', 'EXPIRED'] },
      },
      order: [['createdAt', 'DESC']],
      include: [{ model: OrderItem, as: 'items' }],
    });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, customerId: req.customer.id },
      include: [
        { model: OrderItem, as: 'items' },
        { model: Coupon, as: 'coupon' },
      ],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const cancelMyOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, customerId: req.customer.id },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const cancellableStatuses = ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because its status is '${order.status}'. Please contact support.`,
      });
    }

    await order.update({ status: 'CANCELLED' });
    res.json({ success: true, message: 'Order cancelled successfully', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id },
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: OrderItem, as: 'items' },
        { model: Coupon, as: 'coupon' },
      ],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
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

    const { shippingAddress, billingAddress, paymentMethod, couponCode, referralCode, redeemPoints } = req.body;

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
      return res.status(400).json({ success: false, message: 'Billing and shipping addresses are required' });
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
      image: item.product?.images?.[0] || '',
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
        
        // Earn points based on net paid amount
        const amountForEarn = subtotal - discountAmount - loyaltyDiscount;
        if (amountForEarn > 0) {
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
    const taxableSubtotal = Math.max(0, subtotal - discountAmount - loyaltyDiscount);
    const taxAmount = Math.round((taxableSubtotal * 5) / 105);
    const totalAmount = taxableSubtotal + shippingAmount;

    // Guard: Enforce currency uniformity and resolve correct currency code
    let orderCurrency = 'INR';
    const shippingCountry = (shippingAddress?.country || '').trim().toLowerCase();
    const isUae = ['uae', 'united arab emirates', 'dubai', 'abu dhabi', 'sharjah'].includes(shippingCountry);

    if (isUae) {
      orderCurrency = 'AED';
    } else if (req.customer) {
      const user = await Customer.findByPk(req.customer.id, { transaction });
      if (user && user.preferredCurrency === 'AED') {
        orderCurrency = 'AED';
      }
    }

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

    // Cart items' currency takes final precedence to prevent mismatches
    if (cartCurrency) {
      orderCurrency = cartCurrency;
    }

    // 7. Create Order record
    const order = await Order.create({
      orderNumber: `BB${uuidv4().slice(0, 8).toUpperCase()}`,
      customerId: req.customer ? req.customer.id : null,
      sessionId: req.customer ? null : cart.sessionId,
      affiliateId,
      couponId,
      status: isCod ? 'CONFIRMED' : 'PENDING_PAYMENT',
      paymentStatus: 'UNPAID',
      paymentMethod,
      subtotal,
      discountAmount: discountAmount + loyaltyDiscount,
      shippingAmount,
      taxAmount,
      totalAmount,
      currency: orderCurrency,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      inventoryProcessed: isCod
    }, { transaction });

    // 8. Snap order items
    const orderItemsPayload = itemsToLock.map(item => ({
      orderId: order.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.name,
      productImage: item.image,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
      // Store clean variant attributes snapshot without double JSON stringification
      selectedVariant: (() => {
        let sv = item.selectedVariant;
        if (typeof sv === 'string') {
          try { sv = JSON.parse(sv); } catch (e) {}
        }
        return (sv && typeof sv === 'object' && Object.keys(sv).length > 0) ? JSON.stringify(sv) : null;
      })()
    }));

    for (const snapItem of orderItemsPayload) {
      await OrderItem.create(snapItem, { transaction });
    }

    // 9. Process stock deduction immediately if COD path
    if (isCod) {
      const fulfillmentWh = await Warehouse.findOne({ where: { isFulfillment: true, isActive: true }, transaction });
      const whId = fulfillmentWh ? fulfillmentWh.id : null;

      for (const item of itemsToLock) {
        if (item.variantId) {
          const varObj = lockedStock[`v_${item.variantId}`];
          await varObj.decrement('stock', { by: item.quantity, transaction });
        } else {
          const prodObj = lockedStock[`p_${item.productId}`];
          await prodObj.decrement('stock', { by: item.quantity, transaction });
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
          reason: `COD order placement: ${order.orderNumber}`
        }, { transaction });
      }
    }

    // 10. Process Loyalty Ledger and Points Balance
    if (req.customer && req.customer.id) {
      const user = await Customer.findByPk(req.customer.id, { transaction });
      if (user) {
        if (loyaltyDiscount > 0) {
          const pointsRedeemed = Math.ceil(loyaltyDiscount / Number(loyaltySettings.redeemRate));
          await LoyaltyLedger.create({
            customerId: user.id,
            orderId: order.id,
            type: 'REDEEM',
            points: -pointsRedeemed,
            balance: user.loyaltyPoints - pointsRedeemed,
            description: `Redeemed at checkout for Order ${order.orderNumber}`
          }, { transaction });
          await user.decrement('loyaltyPoints', { by: pointsRedeemed, transaction });
          user.loyaltyPoints -= pointsRedeemed; // update local instance for next calculation
        }
        
        if (earnedPoints > 0) {
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

    // 10. Clear server-side cartitems
    await CartItem.destroy({ where: { cartId: cart.id }, transaction });

    await transaction.commit();

    // 11. Post-commit operations (Asynchronous)
    if (isCod) {
      pushToShiprocket(order.id).catch(console.error);
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
      // Find fulfillment warehouse
      const fulfillmentWh = await Warehouse.findOne({ where: { isFulfillment: true, isActive: true }, transaction });
      const whId = fulfillmentWh ? fulfillmentWh.id : null;

      // Sort items to restock ascending to prevent deadlocks
      const sortedItems = [...order.items].sort((a, b) => {
        if (a.productId !== b.productId) return a.productId - b.productId;
        return (a.variantId || 0) - (b.variantId || 0);
      });

      for (const item of sortedItems) {
        if (item.variantId) {
          const variant = await ProductVariant.findOne({
            where: { id: item.variantId },
            lock: transaction.LOCK.UPDATE,
            transaction
          });
          if (variant) {
            await variant.increment('stock', { by: item.quantity, transaction });
          }
        } else {
          const product = await Product.findOne({
            where: { id: item.productId },
            lock: transaction.LOCK.UPDATE,
            transaction
          });
          if (product) {
            await product.increment('stock', { by: item.quantity, transaction });
          }
        }

        if (whId) {
          const [whStock] = await WarehouseStock.findOrCreate({
            where: { warehouseId: whId, productId: item.productId, variantId: item.variantId || null },
            defaults: { quantity: 0, reservedQty: 0 },
            transaction
          });
          await whStock.increment('quantity', { by: item.quantity, transaction });
        }

        // Log movement
        await InventoryMovementLog.create({
          productId: item.productId,
          variantId: item.variantId,
          warehouseId: whId,
          orderId: order.id,
          quantity: item.quantity,
          type: 'ORDER_CANCEL_RESTOCK',
          reason: `Order cancelled/refunded. Status: ${status}. Previous: ${previousStatus}`
        }, { transaction });
      }

      order.inventoryProcessed = false;
    }

    await order.update({
      status,
      paymentStatus: paymentStatus || order.paymentStatus,
      inventoryProcessed: order.inventoryProcessed
    }, { transaction });

    await transaction.commit();

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

    const [totalOrders, todayOrders, monthOrders, totalCustomers, pendingOrders, deliveredOrders] = await Promise.all([
      Order.count(),
      Order.count({ where: { createdAt: { [Op.gte]: today } } }),
      Order.count({ where: { createdAt: { [Op.gte]: thisMonth } } }),
      Customer.count(),
      Order.count({ where: { status: 'PENDING' } }),
      Order.count({ where: { status: 'DELIVERED' } }),
    ]);

    const revenueData = await Order.findAll({
      where: { paymentStatus: 'PAID' },
      attributes: ['totalAmount'],
    });
    const totalRevenue = revenueData.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);

    res.json({
      success: true,
      stats: { totalOrders, todayOrders, monthOrders, totalCustomers, pendingOrders, deliveredOrders, totalRevenue: Math.round(totalRevenue) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStatusCounts = async (req, res) => {
  try {
    const orderCounts = await Order.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    });

    const counts = {
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

    orderCounts.forEach(row => {
      if (Object.prototype.hasOwnProperty.call(counts, row.status)) {
        counts[row.status] = parseInt(row.count, 10);
      }
    });

    try {
      const abandonedCount = await Cart.count({
        include: [{ model: CartItem, as: 'items', required: true }]
      });
      counts.ABANDONED = abandonedCount;
    } catch {
      counts.ABANDONED = 0;
    }

    res.json({ success: true, counts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getOne, getMyOrders, getMyOrderById, cancelMyOrder, placeOrder, updateStatus, getDashboardStats, getStatusCounts };

