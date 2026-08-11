'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const emailService = require('../services/emailService');
const { Cart, CartItem, Product, ProductVariant, Customer } = require('../models');

async function testSend() {
  try {
    const cart = await Cart.findOne({
      where: { id: 5 },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        },
        { model: Customer, as: 'customer' }
      ]
    });

    if (!cart) {
      console.error('Cart 5 not found');
      process.exit(1);
    }

    console.log(`Sending marketing report email to ${cart.customer.email}...`);

    let cartTotal = 0;
    cart.items.forEach(i => {
      cartTotal += parseFloat(i.priceAtAdd) * i.quantity;
    });

    const res = await emailService.sendMarketingAutomationReport({
      to: cart.customer.email,
      customerName: cart.customer.name,
      items: cart.items,
      cartTotal,
      currency: 'INR',
      couponCode: 'RECOVER10',
      customNote: 'Hi Harish! Here is your requested sample abandoned cart recovery email from Billu Bazaar!'
    });

    console.log('✅ Email dispatched successfully! Message ID:', res.messageId);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error sending test email:', err);
    process.exit(1);
  }
}

testSend();
