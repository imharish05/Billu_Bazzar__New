'use strict';

const { sequelize, Banner } = require('../models');

async function seedLuxuryBanners() {
  console.log('🚀 --- Resetting & Populating High-Res Luxury Banners ---');
  try {
    // 1. Clear all old broken banner entries from database
    await Banner.destroy({ where: {} });
    console.log('🧹 Cleared old banner entries.');

    // 2. Define fresh luxury banners with valid Unsplash images
    const luxuryBanners = [
      {
        title: 'Royal Monsoon & Festive Collection',
        subtitle: 'Experience Handcrafted Elegance & Up to 50% Off Luxury Fashion',
        ctaText: 'Explore Collection',
        ctaLink: '/category/apparel-fashion',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1400&q=80',
        type: 'HERO',
        position: 1,
        badgeText: 'FLAT 50% OFF',
        isActive: true
      },
      {
        title: 'NextGen Audio & Premium Tech',
        subtitle: 'Immerse Yourself in Studio-Grade Sound & Wireless Freedom',
        ctaText: 'Shop Tech Gear',
        ctaLink: '/category/electronics-gadgets',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&q=80',
        type: 'HERO',
        position: 2,
        badgeText: 'NEW LAUNCH',
        isActive: true
      },
      {
        title: 'Exclusive Mid-Night Luxury Special',
        subtitle: 'Get Extra 20% Instant Discount on Premium Swiss Watches & Fine Jewelry',
        ctaText: 'Claim Offer',
        ctaLink: '/category/apparel-fashion',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1400&q=80',
        type: 'EXCLUSIVE_DEAL',
        position: 1,
        badgeText: 'MIDNIGHT SPECIAL',
        isActive: true
      },
      {
        title: 'Curated Home & Living Sanctuary',
        subtitle: 'Elevate Your Space with Nordic Wood Furniture & Artisan Decor',
        ctaText: 'Shop Home Decor',
        ctaLink: '/category/home-living',
        image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=80',
        type: 'EXCLUSIVE_DEAL',
        position: 2,
        badgeText: 'UP TO 40% OFF',
        isActive: true
      },
      {
        title: 'VIP Early Access Flash Sale',
        subtitle: 'Limited Inventory Remaining! Special Discounts Ending Soon',
        ctaText: 'Shop Deals',
        ctaLink: '/products',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=80',
        type: 'COUNTDOWN',
        position: 1,
        badgeText: '24-HOUR FLASH',
        isActive: true
      },
      {
        title: 'Beauty & Botanical Skincare Glow',
        subtitle: 'Pure Botanical Serums, Luxury Fragrances & Grooming Essentials',
        ctaText: 'Explore Beauty',
        ctaLink: '/category/beauty-personal-care',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1400&q=80',
        type: 'PROMO',
        position: 1,
        badgeText: 'BUY 2 GET 1 FREE',
        isActive: true
      },
      {
        title: 'First Order Luxury Welcome',
        subtitle: 'Enjoy Flat 15% Cashback & Free Express Delivery for New Members',
        ctaText: 'Claim Welcome Gift',
        ctaLink: '/products',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80',
        type: 'DEAL',
        position: 1,
        badgeText: 'NEW USER EXCLUSIVE',
        isActive: true
      }
    ];

    for (const b of luxuryBanners) {
      const created = await Banner.create(b);
      console.log(`✨ Created Banner [${created.id}]: ${created.title} (${created.type})`);
    }

    console.log('\n==================================================');
    console.log(`🎉 SUCCESS! ${luxuryBanners.length} Luxury Banners Seeded Cleanly!`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ Error during luxury banner seeding:', err);
  } finally {
    process.exit(0);
  }
}

seedLuxuryBanners();
