'use strict';

const {
  sequelize,
  Warehouse,
  Vendor,
  Product,
  WarehouseStock,
  Banner,
  MarketingMessage
} = require('../models');

async function seedFullSystem() {
  console.log('🚀 --- Starting Full System Seeding (Warehouses, Vendors, Banners, Announcements) ---');
  try {
    // 1. Create 4 Warehouses
    const warehouseData = [
      { name: 'Chennai Central Hub', code: 'WH-CHE-01', contactName: 'Rajesh Kumar', contactPhone: '9840123456', streetAddress: '100 Mount Road, Guindy', city: 'Chennai', state: 'Tamil Nadu', pincode: '600032', isFulfillment: true, isProcurement: true, isActive: true },
      { name: 'Mumbai Metro Logistics', code: 'WH-MUM-01', contactName: 'Amit Shah', contactPhone: '9820123456', streetAddress: 'Sector 18, Vashi', city: 'Mumbai', state: 'Maharashtra', pincode: '400703', isFulfillment: true, isProcurement: true, isActive: true },
      { name: 'Bengaluru Fulfillment Center', code: 'WH-BLR-01', contactName: 'Sunil Rao', contactPhone: '9880123456', streetAddress: 'Outer Ring Road, Marathahalli', city: 'Bengaluru', state: 'Karnataka', pincode: '560037', isFulfillment: true, isProcurement: false, isActive: true },
      { name: 'Delhi NCR Distribution Depot', code: 'WH-DEL-01', contactName: 'Vikas Sharma', contactPhone: '9810123456', streetAddress: 'Industrial Area Phase 2, Okhla', city: 'New Delhi', state: 'Delhi', pincode: '110020', isFulfillment: true, isProcurement: true, isActive: true }
    ];

    const warehouses = [];
    for (const wData of warehouseData) {
      const [wh] = await Warehouse.findOrCreate({
        where: { code: wData.code },
        defaults: wData
      });
      warehouses.push(wh);
    }
    console.log(`✅ Created/Verified ${warehouses.length} Warehouses.`);

    // 2. Create 4 Vendors
    const vendorData = [
      { name: 'Apex Tech Distributors Pvt Ltd', email: 'contact@apextech.com', phone: '9876543210', address: { streetAddress: 'Nehru Place, New Delhi' }, contactPerson: 'Arun Verma', isActive: true },
      { name: 'Vogue Global Fashion House', email: 'info@voguefashion.com', phone: '9876543211', address: { streetAddress: 'T. Nagar, Chennai' }, contactPerson: 'Priya Sundaram', isActive: true },
      { name: 'Imperial Home & Kitchen Goods', email: 'sales@imperialhome.com', phone: '9876543212', address: { streetAddress: 'Crawford Market, Mumbai' }, contactPerson: 'Rohan Mehta', isActive: true },
      { name: 'Aura Beauty & Wellness Supplies', email: 'support@aurabeauty.com', phone: '9876543213', address: { streetAddress: 'Indiranagar, Bengaluru' }, contactPerson: 'Deepika Nair', isActive: true }
    ];

    const vendors = [];
    for (const vData of vendorData) {
      const [v] = await Vendor.findOrCreate({
        where: { email: vData.email },
        defaults: vData
      });
      vendors.push(v);
    }
    console.log(`✅ Created/Verified ${vendors.length} Vendors.`);

    // 3. Distribute Products across Warehouses & Vendors
    const products = await Product.findAll();
    console.log(`📦 Found ${products.length} Products. Distributing across warehouses & vendors...`);

    for (let i = 0; i < products.length; i++) {
      const prod = products[i];
      const assignedWh = warehouses[i % warehouses.length];
      const assignedVnd = vendors[i % vendors.length];

      // Assign vendor & default warehouse to product
      await prod.update({
        vendorId: assignedVnd.id,
        warehouseId: assignedWh.id
      });

      // Distribute stock across multiple warehouses (primary + secondary)
      const primaryStockQty = 35 + (i % 25);
      const secondaryWh = warehouses[(i + 1) % warehouses.length];
      const secondaryStockQty = 15 + (i % 15);

      await WarehouseStock.findOrCreate({
        where: { warehouseId: assignedWh.id, productId: prod.id, variantId: null },
        defaults: { warehouseId: assignedWh.id, productId: prod.id, variantId: null, quantity: primaryStockQty, reservedQty: 0 }
      });

      await WarehouseStock.findOrCreate({
        where: { warehouseId: secondaryWh.id, productId: prod.id, variantId: null },
        defaults: { warehouseId: secondaryWh.id, productId: prod.id, variantId: null, quantity: secondaryStockQty, reservedQty: 0 }
      });
    }
    console.log(`✅ Assigned inventory stock across all ${warehouses.length} Warehouses and ${vendors.length} Vendors.`);

    // 4. Create High Quality Banners with Images
    const bannerData = [
      { title: 'Festive Luxury Sale 2026', subtitle: 'Up to 50% Off Top Premium Brands', ctaText: 'Shop Luxury Now', ctaLink: '/category/electronics-gadgets', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80', type: 'HERO', position: 1, badgeText: 'FLAT 50% OFF', isActive: true },
      { title: 'New Fashion Arrivals', subtitle: 'Explore Handcrafted Apparel & Accessories', ctaText: 'Explore Collection', ctaLink: '/category/apparel-fashion', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80', type: 'HERO', position: 2, badgeText: 'NEW IN', isActive: true },
      { title: 'Smart Living & Decor', subtitle: 'Transform Your Home with Elegant Furniture', ctaText: 'Discover Home', ctaLink: '/category/home-living', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80', type: 'PROMO', position: 1, badgeText: 'POPULAR', isActive: true },
      { title: 'Exclusive Tech Launch', subtitle: 'NextGen Gadgets & Studio Audio Gear', ctaText: 'Buy Tech Now', ctaLink: '/category/electronics-gadgets', image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&q=80', type: 'EXCLUSIVE_DEAL', position: 1, badgeText: 'LIMITED EDITION', isActive: true },
      { title: 'Mega Savings Week', subtitle: 'Special Cashback & Free Delivery on All Orders', ctaText: 'Claim Offers', ctaLink: '/products', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80', type: 'DEAL', position: 1, badgeText: 'EXTRA 15% OFF', isActive: true },
      { title: 'Flash Countdown Event', subtitle: 'Hurry! Limited Stock Remaining for 24 Hours Only', ctaText: 'Grab Deal', ctaLink: '/products', image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1200&q=80', type: 'COUNTDOWN', position: 1, badgeText: 'ENDING SOON', isActive: true }
    ];

    for (const b of bannerData) {
      await Banner.findOrCreate({
        where: { title: b.title },
        defaults: b
      });
    }
    console.log(`✅ Created/Verified ${bannerData.length} High-Quality Banners with images.`);

    // 5. Create 10 Slider Announcement Messages
    const announcements = [
      '✨ FREE Express Delivery on all orders above ₹1,499 across India!',
      '🎁 Use Code LUXURY10 to get Flat 10% Instant Discount on your first purchase!',
      '⚡ Flash Sale: Get up to 50% OFF on Premium Wireless Audio & Headphones today!',
      '💳 Extra 10% Cashback on HDFC, ICICI, and SBI Credit & Debit Cards.',
      '📦 Guaranteed 100% Authentic & Certified Luxury Products with Easy Returns.',
      '🚚 Same-Day Dispatch available for orders placed before 2:00 PM in metro cities.',
      '🎉 New Season Fashion Collection 2026 is Live now – Explore Apparel & Accessories!',
      '🌟 Earn Reward Points on every order and redeem instantly at checkout.',
      '🏡 Modern Home & Living Essentials now starting at just ₹799.',
      '📞 24/7 Dedicated Customer Support & Instant WhatsApp Assistance.'
    ];

    // Clear old sample messages and insert 10 fresh active messages
    await MarketingMessage.destroy({ where: {} });

    for (let i = 0; i < announcements.length; i++) {
      await MarketingMessage.create({
        message: announcements[i],
        position: i + 1,
        isActive: true
      });
    }
    console.log(`✅ Added ${announcements.length} Announcement Slider Messages.`);

    console.log('\n==================================================');
    console.log('🎉 SUCCESS! Full System Seeding Completed!');
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ Error during system seeding:', err);
  } finally {
    process.exit(0);
  }
}

seedFullSystem();
