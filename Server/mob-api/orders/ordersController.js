'use strict';
const order = require('../../controllers/orderController');

exports.getMyOrders = (req, res, next) => order.getMyOrders(req, res, next);

exports.getMyOrderById = (req, res, next) => order.getMyOrderById(req, res, next);

exports.cancelMyOrder = (req, res, next) => order.cancelMyOrder(req, res, next);

exports.placeOrder = (req, res, next) => order.placeOrder(req, res, next);

const { Order } = require('../../models');
const { Op } = require('sequelize');
exports.trackOrder = async (req, res, next) => {
  try {
    const identifier = req.params.identifier;
    const options = [{ orderNumber: identifier }];
    if (/^[1-9]\d*$/.test(identifier)) options.push({ id: Number(identifier) });
    const owned = await Order.findOne({ where: { customerId: req.customer.id, [Op.or]: options }, attributes: ['id'] });
    if (!owned) return res.status(404).json({ success: false, message: 'Order not found' });
    req.params.id = owned.id;
    return order.getMyOrderById(req, res, next);
  } catch (err) { return next(err); }
};
