'use strict';
const coupon = require('../../controllers/couponController');

exports.validate = (req, res, next) => coupon.validate(req, res, next);

const { Coupon } = require('../../models');
exports.getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.findAll({ where: { isActive: true }, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, coupons });
  } catch (err) { return next(err); }
};

