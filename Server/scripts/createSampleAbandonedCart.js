'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Customer, Cart, CartItem, Product, Category } = require('../models');

async function createSampleCart() {
  try {
    console.log('🚀 Creating sample abandoned cart for harish05082004@gmail.com...');

    // 1. Find or Create Customer
    let [customer, createdCust] = await Customer.findOrCreate({
      where: { email: 'harish05082004@gmail.com' },
      defaults: {
        name: 'Harish',
        email: 'harish05082004@gmail.com',
        phone: '9876543210',
        password: 'dummy_hash_for_testing',
        isActive: true,
      }
    });

    if (createdCust) {
      console.log(`✅ Created customer: ${customer.name} (${customer.email})`);
    } else {
      console.log(`ℹ️ Found existing customer: ${customer.name} (${customer.email})`);
    }

    // 2. Fetch existing products or create sample products
    let products = await Product.findAll({ where: { isActive: true }, limit: 2 });

    if (products.length === 0) {
      // Find or create category
      let [cat] = await Category.findOrCreate({
        where: { name: 'Luxury Goods' },
        defaults: { name: 'Luxury Goods', slug: 'luxury-goods' }
      });

      const sampleP1 = await Product.create({
        name: 'Premium Silk Saree',
        slug: 'premium-silk-saree-' + Date.now(),
        price: 4999.00,
        comparePrice: 6999.00,
        stock: 50,
        sku: 'SILK-SAR-001',
        images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600'],
        categoryId: cat.id,
        isActive: true,
        currency: 'INR',
      });

      const sampleP2 = await Product.create({
        name: 'Handcrafted Brass Idol',
        slug: 'handcrafted-brass-idol-' + Date.now(),
        price: 2499.00,
        comparePrice: 3499.00,
        stock: 30,
        sku: 'BRASS-IDOL-002',
        images: ['https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600'],
        categoryId: cat.id,
        isActive: true,
        currency: 'INR',
      });

      products = [sampleP1, sampleP2];
      console.log('✅ Created 2 sample products for cart testing');
    }

    // 3. Find or Create Cart
    let [cart] = await Cart.findOrCreate({
      where: { customerId: customer.id },
      defaults: {
        customerId: customer.id,
        sessionId: null,
      }
    });

    // 4. Wipe existing items and insert fresh sample items
    await CartItem.destroy({ where: { cartId: cart.id } });

    const item1 = await CartItem.create({
      cartId: cart.id,
      productId: products[0].id,
      quantity: 2,
      priceAtAdd: products[0].price,
      selectedVariant: { Size: 'M', Color: 'Gold' }
    });

    let item2 = null;
    if (products.length > 1) {
      item2 = await CartItem.create({
        cartId: cart.id,
        productId: products[1].id,
        quantity: 1,
        priceAtAdd: products[1].price,
        selectedVariant: { Style: 'Classic' }
      });
    }

    // Update cart timestamp to simulate an abandoned cart from 2 days ago
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await cart.update({ updatedAt: twoDaysAgo, lastEmailSentAt: null });

    console.log(`\n🎉 SAMPLE ABANDONED CART CREATED SUCCESSFULLY!`);
    console.log(`--------------------------------------------------`);
    console.log(`Cart ID:        ${cart.id}`);
    console.log(`Customer Name:  ${customer.name}`);
    console.log(`Customer Email: ${customer.email}`);
    console.log(`Items Count:    ${1 + (item2 ? 1 : 0)} items`);
    console.log(`Item 1:         ${products[0].name} (Qty: 2, Price: ₹${products[0].price})`);
    if (item2) {
      console.log(`Item 2:         ${products[1].name} (Qty: 1, Price: ₹${products[1].price})`);
    }
    console.log(`Last Activity:  ${twoDaysAgo.toISOString()} (Abandoned 48h ago)`);
    console.log(`--------------------------------------------------\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating sample cart:', err);
    process.exit(1);
  }
}

createSampleCart();
