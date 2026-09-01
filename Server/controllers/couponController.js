'use strict';
const { Coupon, Order } = require('../models');
const { Op } = require('sequelize');

const normalizeCode = (code = '') => String(code).trim().toUpperCase();

const calculateDiscount = (coupon, subtotal) => {
  const value = Number(coupon.value || 0);
  if (coupon.type === 'PERCENT') return Math.min((subtotal * value) / 100, Number(coupon.maxDiscount || Infinity));
  if (coupon.type === 'FLAT') return Math.min(value, subtotal);
  return 0;
};

const isUsable = (coupon, subtotal) => {
  const now = new Date();
  if (!coupon || !coupon.isActive) return 'Coupon is inactive';
  if (new Date(coupon.validFrom) > now) return 'Coupon is not active yet';
  if (new Date(coupon.validUntil) < now) return 'Coupon has expired';
  if (subtotal < Number(coupon.minOrderValue || 0)) return `Minimum order value is ₹${coupon.minOrderValue}`;
  return null;
};

const getAll = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const { Op } = require('sequelize');
    const where = {};
    if (search) where.code = { [Op.like]: `%${search}%` };

    if (page !== undefined || limit !== undefined) {
      const p = Math.max(1, parseInt(page || 1, 10));
      const l = Math.max(1, parseInt(limit || 10, 10));

      const { count, rows } = await Coupon.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: l,
        offset: (p - 1) * l
      });

      return res.json({
        success: true,
        coupons: rows,
        total: count,
        page: p,
        limit: l,
        totalPages: Math.ceil(count / l)
      });
    }

    // For storefront requests without pagination, only return active coupons
    where.isActive = true;
    let coupons = await Coupon.findAll({ where, order: [['createdAt', 'DESC']] });

    // Seed defaults only if the table is completely empty (count is 0)
    const totalCouponCount = await Coupon.count();
    if (totalCouponCount === 0) {
      try {
        coupons = await Coupon.bulkCreate([
          { code: 'WELCOME10', type: 'PERCENT', value: 10, minOrderValue: 499, maxDiscount: 500, isActive: true, validFrom: new Date(), validUntil: new Date(Date.now() + 365 * 86400000) },
          { code: 'FESTIVE20', type: 'PERCENT', value: 20, minOrderValue: 999, maxDiscount: 1000, isActive: true, validFrom: new Date(), validUntil: new Date(Date.now() + 365 * 86400000) },
          { code: 'BILLU100', type: 'FLAT', value: 100, minOrderValue: 799, maxDiscount: 100, isActive: true, validFrom: new Date(), validUntil: new Date(Date.now() + 365 * 86400000) },
          { code: 'LUXURY500', type: 'FLAT', value: 500, minOrderValue: 2999, maxDiscount: 500, isActive: true, validFrom: new Date(), validUntil: new Date(Date.now() + 365 * 86400000) },
        ]);
      } catch (e) {
        console.warn('Coupon fallback creation skipped:', e.message);
      }
    }

    // If customer is authenticated or customerId is passed, filter out coupons where user has reached per-person usage limit
    const customerId = req.customer?.id || req.user?.id || req.query.customerId;
    if (customerId) {
      const userOrders = await Order.findAll({
        where: { customerId, status: { [Op.ne]: 'CANCELLED' } },
        attributes: ['couponId']
      });

      const usageMap = {};
      userOrders.forEach(o => {
        if (o.couponId) usageMap[o.couponId] = (usageMap[o.couponId] || 0) + 1;
      });

      coupons = coupons.filter(c => {
        if (c.usageLimit !== null && c.usageLimit !== undefined && Number(c.usageLimit) > 0) {
          const used = usageMap[c.id] || 0;
          return used < Number(c.usageLimit);
        }
        return true;
      });
    }

    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const body = { ...req.body, code: normalizeCode(req.body.code) };
    if (body.validTo && !body.validUntil) body.validUntil = body.validTo;
    if (!body.validFrom) body.validFrom = new Date();
    if (!body.validUntil) body.validUntil = new Date(Date.now() + 30 * 86400000);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (new Date(body.validUntil) < startOfToday) {
      return res.status(400).json({ success: false, message: 'Valid Until date cannot be in the past' });
    }
    if (new Date(body.validUntil) < new Date(body.validFrom)) {
      return res.status(400).json({ success: false, message: 'Valid Until date cannot be earlier than Valid From date' });
    }

    if (body.usageLimit === '' || body.usageLimit === null || body.usageLimit === undefined || body.usageLimit === '0' || body.usageLimit === 0) {
      body.usageLimit = null;
    } else {
      body.usageLimit = Number(body.usageLimit);
    }
    const coupon = await Coupon.create(body);
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    const body = { ...req.body };
    if (body.code) body.code = normalizeCode(body.code);
    if (body.validTo && !body.validUntil) body.validUntil = body.validTo;

    if (body.validUntil) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (new Date(body.validUntil) < startOfToday) {
        return res.status(400).json({ success: false, message: 'Valid Until date cannot be in the past' });
      }
      const validFromDate = body.validFrom ? new Date(body.validFrom) : new Date(coupon.validFrom);
      if (new Date(body.validUntil) < validFromDate) {
        return res.status(400).json({ success: false, message: 'Valid Until date cannot be earlier than Valid From date' });
      }
    }

    if ('usageLimit' in body) {
      if (body.usageLimit === '' || body.usageLimit === null || body.usageLimit === undefined || body.usageLimit === '0' || body.usageLimit === 0) {
        body.usageLimit = null;
      } else {
        body.usageLimit = Number(body.usageLimit);
      }
    }
    await coupon.update(body);
    res.json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    await coupon.destroy();
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const validate = async (req, res) => {
  try {
    const subtotal = Number(req.body.subtotal || req.body.cartSubtotal || 0);
    const code = normalizeCode(req.body.code);
    const coupon = await Coupon.findOne({ where: { code } });

    if (!coupon) {
      return res.status(404).json({ success: false, valid: false, message: 'Invalid coupon code' });
    }

    const reason = isUsable(coupon, subtotal);
    if (reason) return res.status(400).json({ success: false, valid: false, message: reason });

    // Per-person redemption check
    const customerId = req.customer?.id || req.user?.id || req.body.customerId;
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && Number(coupon.usageLimit) > 0) {
      if (customerId) {
        const existingUsage = await Order.count({
          where: { customerId, couponId: coupon.id, status: { [Op.ne]: 'CANCELLED' } }
        });
        if (existingUsage >= Number(coupon.usageLimit)) {
          const maxLimit = Number(coupon.usageLimit);
          const limitMsg = maxLimit === 1
            ? `Coupon '${coupon.code}' has already been redeemed on a previous order.`
            : `Coupon '${coupon.code}' has reached its limit of ${maxLimit} redemptions per customer.`;
          return res.status(400).json({
            success: false,
            valid: false,
            message: limitMsg
          });
        }
      }
    }

    const discountAmount = calculateDiscount(coupon, subtotal);
    res.json({ success: true, valid: true, coupon, discountAmount, freeShipping: coupon.type === 'FREE_SHIPPING' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, create, update, remove, validate };
