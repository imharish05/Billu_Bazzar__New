'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Vendor, Product, ProductVariant, Order, OrderItem, Customer, Category } = require('../models');

async function testVendorDeletionWithOrderItems() {
  try {
    console.log('🧪 Testing vendor deletion with associated OrderItems...');

    // 1. Create a dummy test vendor
    const vendor = await Vendor.create({
      name: 'Test Deletion Vendor ' + Date.now(),
      email: `test_vendor_${Date.now()}@example.com`,
      phone: '9998887770',
      contactPerson: 'Test Person'
    });

    // 2. Create category & product linked to this vendor
    const [cat] = await Category.findOrCreate({ where: { name: 'Test Category' }, defaults: { slug: 'test-cat' } });

    const product = await Product.create({
      name: 'Test Vendor Product ' + Date.now(),
      slug: 'test-vendor-prod-' + Date.now(),
      price: 1999.00,
      stock: 10,
      categoryId: cat.id,
      vendorId: vendor.id,
      isActive: true
    });

    // 3. Create dummy customer & order with order item referencing this product
    const [cust] = await Customer.findOrCreate({ where: { email: 'dummy_order_test@example.com' }, defaults: { name: 'Dummy', password: 'hash' } });
    const order = await Order.create({
      orderNumber: 'TEST-ORD-' + Date.now(),
      customerId: cust.id,
      status: 'CONFIRMED',
      totalAmount: 1999.00,
      subtotal: 1999.00,
      shippingAddress: { fullName: 'Test User', streetAddress: '123 Main St', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', country: 'India' }
    });

    const orderItem = await OrderItem.create({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: 1999.00,
      totalPrice: 1999.00
    });

    console.log(`✅ Setup complete: Vendor ID ${vendor.id}, Product ID ${product.id}, OrderItem ID ${orderItem.id}`);

    // Now test deleting the vendor using the updated remove controller logic
    console.log(`🗑️ Attempting vendor removal...`);
    const removeTransaction = await Vendor.sequelize.transaction();

    const products = await Product.findAll({ where: { vendorId: vendor.id }, transaction: removeTransaction });
    const productIds = products.map(p => p.id);

    if (productIds.length > 0) {
      const { ProductVariant, WarehouseStock, CartItem, Wishlist, Review, StockAlert, OrderItem, InventoryMovementLog } = require('../models');

      const variants = await ProductVariant.findAll({ where: { productId: productIds }, transaction: removeTransaction });
      const variantIds = variants.map(v => v.id);

      if (variantIds.length > 0) {
        await OrderItem.update({ variantId: null }, { where: { variantId: variantIds }, transaction: removeTransaction });
        await WarehouseStock.destroy({ where: { variantId: variantIds }, transaction: removeTransaction });
        await CartItem.destroy({ where: { variantId: variantIds }, transaction: removeTransaction });
        await Wishlist.destroy({ where: { variantId: variantIds }, transaction: removeTransaction });
        await InventoryMovementLog.destroy({ where: { variantId: variantIds }, transaction: removeTransaction });
      }

      await OrderItem.update({ productId: null }, { where: { productId: productIds }, transaction: removeTransaction });
      await WarehouseStock.destroy({ where: { productId: productIds }, transaction: removeTransaction });
      await CartItem.destroy({ where: { productId: productIds }, transaction: removeTransaction });
      await Wishlist.destroy({ where: { productId: productIds }, transaction: removeTransaction });
      await Review.destroy({ where: { productId: productIds }, transaction: removeTransaction });
      await StockAlert.destroy({ where: { productId: productIds }, transaction: removeTransaction });
      await InventoryMovementLog.destroy({ where: { productId: productIds }, transaction: removeTransaction });

      await ProductVariant.destroy({ where: { productId: productIds }, transaction: removeTransaction });
      await Product.destroy({ where: { id: productIds }, transaction: removeTransaction });
    }

    await vendor.destroy({ transaction: removeTransaction });
    await removeTransaction.commit();

    console.log(`🎉 SUCCESS: Vendor "${vendor.name}" deleted without foreign key errors!`);

    // Clean up test order & customer
    await OrderItem.destroy({ where: { id: orderItem.id } });
    await Order.destroy({ where: { id: order.id } });

    process.exit(0);
  } catch (err) {
    console.error('❌ Deletion failed with error:', err);
    process.exit(1);
  }
}

testVendorDeletionWithOrderItems();
