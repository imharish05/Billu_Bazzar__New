'use strict';
const cron = require('node-cron');
const { Op } = require('sequelize');
const { Cart, CartItem, Product, ProductVariant, Customer } = require('../models');
const emailService = require('../services/emailService');

/**
 * Reminder Jobs — scheduled tasks for Billu Bazaar
 */

// ── Daily (09:00 AM): Automatic Abandoned Cart Recovery Emails ─────────────────
cron.schedule('0 9 * * *', async () => {
  console.log('[Cron] Running abandoned cart recovery check...');
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const abandonedCarts = await Cart.findAll({
      where: {
        updatedAt: { [Op.between]: [sevenDaysAgo, twentyFourHoursAgo] },
        [Op.or]: [
          { lastEmailSentAt: null },
          { lastEmailSentAt: { [Op.lt]: twentyFourHoursAgo } }
        ]
      },
      include: [
        {
          model: CartItem,
          as: 'items',
          required: true,
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'images', 'currency'] },
            { model: ProductVariant, as: 'variant', attributes: ['id', 'sku', 'price'] }
          ]
        },
        {
          model: Customer,
          as: 'customer',
          required: true,
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    console.log(`[Cron] Found ${abandonedCarts.length} eligible abandoned carts for auto recovery.`);

    for (const cart of abandonedCarts) {
      if (!cart.customer?.email || !cart.items?.length) continue;

      let cartTotal = 0;
      let currency = 'INR';
      cart.items.forEach(item => {
        const price = parseFloat(item.variant?.price || item.priceAtAdd || 0);
        cartTotal += price * (item.quantity || 0);
        if (item.product?.currency) currency = item.product.currency;
      });

      try {
        await emailService.sendMarketingAutomationReport({
          to: cart.customer.email,
          customerName: cart.customer.name || 'Valued Customer',
          items: cart.items,
          cartTotal,
          currency,
          couponCode: 'RECOVER10',
          customNote: 'We noticed you left some items in your cart. Enjoy an exclusive 10% discount on your purchase!'
        });

        await cart.update({ lastEmailSentAt: new Date() });
        console.log(`[Cron] Auto recovery email sent to ${cart.customer.email} (Cart ID: ${cart.id})`);
      } catch (err) {
        console.error(`[Cron] Failed sending recovery email to cart ${cart.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Cron] Error running abandoned cart check:', err.message);
  }
});

// ── Weekly: loyalty points expiry check ───────────────────────────────────────
cron.schedule('0 10 * * 1', async () => {
  console.log('[Cron] Running loyalty expiry check...');
});

// ── Daily: low stock alert to admin ──────────────────────────────────────────
cron.schedule('0 8 * * *', async () => {
  console.log('[Cron] Running low stock check...');
});

console.log('[Cron] Scheduled jobs registered');

