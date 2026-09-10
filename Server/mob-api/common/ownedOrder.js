'use strict';
const { Order } = require('../../models');
module.exports = (handler, optional = false) => async (req, res, next) => {
  const orderId = req.body?.orderId;
  if (optional && (orderId === undefined || orderId === null || orderId === '')) return handler(req, res, next);
  if (!/^[1-9]\d*$/.test(String(orderId || ''))) {
    return res.status(400).json({ success: false, message: 'A valid orderId is required' });
  }
  try {
    const order = await Order.findOne({ where: { id: orderId, customerId: req.customer.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Bind gateway references to this customer's order as well as checking ownership.
    if (req.body.orderRef && req.body.orderRef !== order.paymentGatewayRef) {
      return res.status(400).json({ success: false, message: 'Payment reference does not match order' });
    }
    return handler(req, res, next);
  } catch (err) { return next(err); }
};
