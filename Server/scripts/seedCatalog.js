'use strict';

const { sequelize, Category, SubCategory, SubSubCategory, Product, Warehouse, WarehouseStock } = require('../models');

const CATALOG_DATA = [
  {
    name: 'Electronics & Gadgets',
    slug: 'electronics-gadgets',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80',
    subCategories: [
      {
        name: 'Audio',
        slug: 'audio',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
        subSubCategories: [
          { name: 'Headphones', slug: 'headphones', prodName: 'Studio Pro Wireless ANC Headphones', price: 14999, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80' },
          { name: 'Earbuds', slug: 'earbuds', prodName: 'Sonic Air True Wireless Earbuds', price: 4999, img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80' },
          { name: 'Bluetooth Speakers', slug: 'bluetooth-speakers', prodName: 'Pulse 360 Portable Waterproof Speaker', price: 7999, img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80' },
          { name: 'Soundbars', slug: 'soundbars', prodName: 'Cinematic Soundbar 5.1 Surround', price: 22999, img: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80' }
        ]
      },
      {
        name: 'Computers & Laptops',
        slug: 'computers-laptops',
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80',
        subSubCategories: [
          { name: 'Laptops', slug: 'laptops', prodName: 'UltraSlim Pro 15.6 Retina Laptop', price: 74999, img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80' },
          { name: 'Desktops', slug: 'desktops', prodName: 'Titan Gaming Desktop i9 32GB RTX 4080', price: 149999, img: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=600&q=80' },
          { name: 'Monitors', slug: 'monitors', prodName: 'VividVue 27-inch 4K HDR Monitor', price: 28999, img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80' },
          { name: 'Components (RAM, SSDs)', slug: 'components-ram-ssds', prodName: 'NVMe Gen4 2TB High-Speed SSD', price: 11999, img: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&q=80' }
        ]
      },
      {
        name: 'Smartphones & Tablets',
        slug: 'smartphones-tablets',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
        subSubCategories: [
          { name: 'Phones', slug: 'phones', prodName: 'Aero X1 Flagship Smartphone 256GB', price: 59999, img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80' },
          { name: 'Tablets', slug: 'tablets', prodName: 'ProTab 11-inch OLED Stylus Tablet', price: 39999, img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80' },
          { name: 'Cases', slug: 'cases', prodName: 'MagArmor Carbon Fiber Case', price: 1299, img: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&q=80' },
          { name: 'Chargers', slug: 'chargers', prodName: '65W GaN Fast Dual-Port Charger', price: 1999, img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80' },
          { name: 'Power Banks', slug: 'power-banks', prodName: 'PowerBoost 20,000mAh PD Power Bank', price: 2499, img: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80' }
        ]
      },
      {
        name: 'Smart Home & IoT',
        slug: 'smart-home-iot',
        image: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80',
        subSubCategories: [
          { name: 'Smart Speakers', slug: 'smart-speakers', prodName: 'VoiceHub Smart Home Assistant', price: 4499, img: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=600&q=80' },
          { name: 'Security Cameras', slug: 'security-cameras', prodName: 'Guardian 2K Outdoor Solar Cam', price: 5999, img: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&q=80' },
          { name: 'Smart Lighting', slug: 'smart-lighting', prodName: 'LumiGlow RGB Ambient Light Strip', price: 1899, img: 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=600&q=80' }
        ]
      },
      {
        name: 'Wearable Tech',
        slug: 'wearable-tech',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        subSubCategories: [
          { name: 'Smartwatches', slug: 'smartwatches', prodName: 'Apex Health Tracker Smartwatch', price: 12999, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80' },
          { name: 'Fitness Trackers', slug: 'fitness-trackers', prodName: 'PulseFit Slim Heart Rate Band', price: 2999, img: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&q=80' }
        ]
      }
    ]
  },
  {
    name: 'Apparel & Fashion',
    slug: 'apparel-fashion',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80',
    subCategories: [
      {
        name: "Men's Clothing",
        slug: 'mens-clothing',
        image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80',
        subSubCategories: [
          { name: 'Shirts', slug: 'mens-shirts', prodName: 'Royal Linen Slim Fit Button Shirt', price: 2499, img: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80' },
          { name: 'T-Shirts', slug: 'mens-tshirts', prodName: 'Premium Heavyweight Cotton Crew Tee', price: 999, img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80' },
          { name: 'Pants', slug: 'mens-pants', prodName: 'Tailored Chino Trousers Khaki', price: 2999, img: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80' },
          { name: 'Jackets', slug: 'mens-jackets', prodName: 'Vintage Biker Leather Jacket', price: 7999, img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80' },
          { name: 'Activewear', slug: 'mens-activewear', prodName: 'DryFit Athletic Training Shorts', price: 1499, img: 'https://images.unsplash.com/photo-1483721061986-fe1a829668f8?w=600&q=80' }
        ]
      },
      {
        name: "Women's Clothing",
        slug: 'womens-clothing',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
        subSubCategories: [
          { name: 'Dresses', slug: 'womens-dresses', prodName: 'Elegant Floral Summer Maxi Dress', price: 3499, img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80' },
          { name: 'Tops', slug: 'womens-tops', prodName: 'Silk Blend Wrap Blouse', price: 1999, img: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=600&q=80' },
          { name: 'Skirts', slug: 'womens-skirts', prodName: 'Pleated High-Waist Midi Skirt', price: 1799, img: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&q=80' },
          { name: 'Jeans', slug: 'womens-jeans', prodName: 'Classic High-Rise Stretch Denim Jeans', price: 2799, img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80' },
          { name: 'Outerwear', slug: 'womens-outerwear', prodName: 'Double-Breasted Wool Trench Coat', price: 8999, img: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&q=80' },
          { name: 'Activewear', slug: 'womens-activewear', prodName: 'High-Impact Yoga Leggings Set', price: 2299, img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80' }
        ]
      },
      {
        name: 'Kids & Baby',
        slug: 'kids-baby',
        image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&q=80',
        subSubCategories: [
          { name: 'Infant Rompers', slug: 'infant-rompers', prodName: 'Organic Soft Cotton Baby Romper 3-Pack', price: 1299, img: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&q=80' },
          { name: 'Toddler Clothes', slug: 'toddler-clothes', prodName: 'Playful Denim Overalls Outfit', price: 1599, img: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80' },
          { name: 'School Uniforms', slug: 'school-uniforms', prodName: 'Classic Navy Blue Blazer Set', price: 2499, img: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600&q=80' }
        ]
      },
      {
        name: 'Footwear',
        slug: 'footwear',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
        subSubCategories: [
          { name: 'Sneakers', slug: 'sneakers', prodName: 'Air Cushion Performance Running Sneakers', price: 4999, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80' },
          { name: 'Boots', slug: 'boots', prodName: 'Rugged Chelsea Leather Boots', price: 5999, img: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&q=80' },
          { name: 'Sandals', slug: 'sandals', prodName: 'Comfort Cushion Leather Sandals', price: 1899, img: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=600&q=80' },
          { name: 'Formal Shoes', slug: 'formal-shoes', prodName: 'Handcrafted Oxford Derby Shoes', price: 4499, img: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&q=80' }
        ]
      },
      {
        name: 'Accessories',
        slug: 'accessories',
        image: 'https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?w=600&q=80',
        subSubCategories: [
          { name: 'Bags & Backpacks', slug: 'bags-backpacks', prodName: 'Urban Waterproof Travel Backpack', price: 3299, img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80' },
          { name: 'Wallets', slug: 'wallets', prodName: 'Slim RFID Blocking Leather Wallet', price: 1299, img: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80' },
          { name: 'Belts', slug: 'belts', prodName: 'Full Grain Genuine Leather Belt', price: 999, img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80' },
          { name: 'Sunglasses', slug: 'sunglasses', prodName: 'Polarized Aviator Sunglasses', price: 2199, img: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80' },
          { name: 'Jewelry', slug: 'jewelry', prodName: '18K Gold Plated Pendant Necklace', price: 2799, img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80' },
          { name: 'Watches', slug: 'watches', prodName: 'Chronograph Minimalist Steel Watch', price: 6999, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80' }
        ]
      }
    ]
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
    subCategories: [
      {
        name: 'Furniture',
        slug: 'furniture',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
        subSubCategories: [
          { name: 'Living Room (Sofas, Tables)', slug: 'living-room', prodName: 'Modern Velvet 3-Seater Sofa', price: 34999, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80' },
          { name: 'Bedroom (Beds, Wardrobes)', slug: 'bedroom', prodName: 'Solid Oak King Bed Frame', price: 29999, img: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80' },
          { name: 'Office Chairs', slug: 'office-chairs', prodName: 'Ergonomic Mesh High-Back Chair', price: 8999, img: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=600&q=80' }
        ]
      },
      {
        name: 'Kitchen & Dining',
        slug: 'kitchen-dining',
        image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&q=80',
        subSubCategories: [
          { name: 'Cookware', slug: 'cookware', prodName: 'Non-Stick Induction Cookware Set 10-Piece', price: 5999, img: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&q=80' },
          { name: 'Dinnerware', slug: 'dinnerware', prodName: 'Ceramic Dinner Set 24-Piece White Gold', price: 4299, img: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600&q=80' },
          { name: 'Small Appliances (Blenders, Coffee Makers)', slug: 'small-appliances', prodName: 'Automatic Espresso Coffee Machine', price: 12999, img: 'https://images.unsplash.com/photo-1517668808822-9e428824603b?w=600&q=80' }
        ]
      },
      {
        name: 'Bedding & Bath',
        slug: 'bedding-bath',
        image: 'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=600&q=80',
        subSubCategories: [
          { name: 'Sheets', slug: 'sheets', prodName: '400 Thread Count Egyptian Cotton Bed Sheet', price: 2499, img: 'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=600&q=80' },
          { name: 'Pillows', slug: 'pillows', prodName: 'Memory Foam Ergonomic Contour Pillow', price: 1499, img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&q=80' },
          { name: 'Towels', slug: 'towels', prodName: 'Plush Turkish Cotton Bath Towel 4-Pack', price: 1899, img: 'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=600&q=80' },
          { name: 'Shower Curtains', slug: 'shower-curtains', prodName: 'Waterproof Linen Textured Shower Curtain', price: 899, img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80' }
        ]
      },
      {
        name: 'Home Decor',
        slug: 'home-decor',
        image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&q=80',
        subSubCategories: [
          { name: 'Rugs', slug: 'rugs', prodName: 'Boho Geometry Area Rug 5x7 ft', price: 4999, img: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&q=80' },
          { name: 'Lighting', slug: 'lighting', prodName: 'Nordic Wooden Tripod Floor Lamp', price: 3499, img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80' },
          { name: 'Wall Art', slug: 'wall-art', prodName: 'Abstract Canvas Paintings Set of 3', price: 2999, img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&q=80' },
          { name: 'Candles', slug: 'candles', prodName: 'Scented Soy Wax Therapy Candle', price: 799, img: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&q=80' },
          { name: 'Vases', slug: 'vases', prodName: 'Handcrafted Ceramic Donut Vase', price: 1199, img: 'https://images.unsplash.com/photo-1612196808214-b7e239e5f6b7?w=600&q=80' }
        ]
      },
      {
        name: 'Garden & Outdoor',
        slug: 'garden-outdoor',
        image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80',
        subSubCategories: [
          { name: 'Patio Furniture', slug: 'patio-furniture', prodName: 'All-Weather Rattan Wicker Patio Set', price: 21999, img: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80' },
          { name: 'Grills', slug: 'grills', prodName: 'Portable Stainless Steel Charcoal Grill', price: 5499, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80' },
          { name: 'Gardening Tools', slug: 'gardening-tools', prodName: 'Ergonomic Garden Tool Set 7-Piece', price: 1499, img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80' },
          { name: 'Outdoor Lighting', slug: 'outdoor-lighting', prodName: 'Solar Powered Pathway LED Lights 8-Pack', price: 1999, img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80' }
        ]
      }
    ]
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80',
    subCategories: [
      {
        name: 'Skincare',
        slug: 'skincare',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80',
        subSubCategories: [
          { name: 'Cleansers', slug: 'cleansers', prodName: 'Gentle Hydrating Facial Cleanser 200ml', price: 699, img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80' },
          { name: 'Moisturizers', slug: 'moisturizers', prodName: 'Hyaluronic Acid Gel Moisturizer', price: 899, img: 'https://images.unsplash.com/photo-1608248597379-8ac80e816a75?w=600&q=80' },
          { name: 'Serums', slug: 'serums', prodName: 'Vitamin C Brightening Face Serum', price: 1199, img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80' },
          { name: 'Sunscreen', slug: 'sunscreen', prodName: 'Ultra-Light SPF 50 PA++++ Sunscreen', price: 799, img: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&q=80' }
        ]
      },
      {
        name: 'Makeup',
        slug: 'makeup',
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
        subSubCategories: [
          { name: 'Face', slug: 'makeup-face', prodName: 'Matte Finish Liquid Foundation', price: 1499, img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80' },
          { name: 'Eyes', slug: 'makeup-eyes', prodName: '12-Color Nude Eyeshadow Palette', price: 1299, img: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&q=80' },
          { name: 'Lips', slug: 'makeup-lips', prodName: 'Velvet Matte Liquid Lipstick', price: 899, img: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80' },
          { name: 'Brushes & Tools', slug: 'brushes-tools', prodName: 'Professional Makeup Brush Set 12-Piece', price: 1699, img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80' }
        ]
      },
      {
        name: 'Haircare',
        slug: 'haircare',
        image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&q=80',
        subSubCategories: [
          { name: 'Shampoo', slug: 'shampoo', prodName: 'Argan Oil Repairing Shampoo 400ml', price: 799, img: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&q=80' },
          { name: 'Conditioner', slug: 'conditioner', prodName: 'Deep Moisture Nourishing Conditioner', price: 799, img: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&q=80' },
          { name: 'Styling Products', slug: 'styling-products', prodName: 'Heat Protectant Styling Spray', price: 649, img: 'https://images.unsplash.com/photo-1608248597379-8ac80e816a75?w=600&q=80' },
          { name: 'Hair Dryers', slug: 'hair-dryers', prodName: 'Ionic High-Speed Salon Hair Dryer', price: 3999, img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80' }
        ]
      },
      {
        name: 'Fragrances',
        slug: 'fragrances',
        image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80',
        subSubCategories: [
          { name: 'Perfumes', slug: 'perfumes', prodName: 'Luxury Oud EDP Perfume 100ml', price: 4999, img: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80' },
          { name: 'Colognes', slug: 'colognes', prodName: 'Fresh Citrus Wood Cologne for Men', price: 3499, img: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=80' },
          { name: 'Body Sprays', slug: 'body-sprays', prodName: 'Long-Lasting Deodorant Body Spray', price: 499, img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80' }
        ]
      },
      {
        name: 'Personal Care',
        slug: 'personal-care',
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80',
        subSubCategories: [
          { name: 'Oral Care', slug: 'oral-care', prodName: 'Sonic Electric Toothbrush Smart Sensor', price: 2999, img: 'https://images.unsplash.com/photo-1559591937-e58af10078d4?w=600&q=80' },
          { name: 'Deodorants', slug: 'deodorants', prodName: 'Natural Mineral Roll-On Deodorant', price: 399, img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80' },
          { name: 'Shaving & Grooming', slug: 'shaving-grooming', prodName: 'Waterproof Beard Trimmer Kit', price: 1999, img: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=600&q=80' }
        ]
      }
    ]
  },
  {
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&q=80',
    subCategories: [
      {
        name: 'Fitness & Exercise',
        slug: 'fitness-exercise',
        image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&q=80',
        subSubCategories: [
          { name: 'Dumbbells', slug: 'dumbbells', prodName: 'Adjustable Rubber Dumbbell Set 20kg', price: 3999, img: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&q=80' },
          { name: 'Yoga Mats', slug: 'yoga-mats', prodName: 'Non-Slip Eco TPE Yoga Mat 6mm', price: 1499, img: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&q=80' },
          { name: 'Resistance Bands', slug: 'resistance-bands', prodName: 'Heavy Duty Loop Resistance Bands 5-Pack', price: 899, img: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600&q=80' },
          { name: 'Treadmills', slug: 'treadmills', prodName: 'Foldable Smart Motorized Treadmill', price: 27999, img: 'https://images.unsplash.com/photo-1576678927484-cc909957088c?w=600&q=80' }
        ]
      },
      {
        name: 'Camping & Hiking',
        slug: 'camping-hiking',
        image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80',
        subSubCategories: [
          { name: 'Tents', slug: 'tents', prodName: 'Waterproof 4-Person Camping Tent', price: 6999, img: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80' },
          { name: 'Sleeping Bags', slug: 'sleeping-bags', prodName: 'All-Season Thermal Sleeping Bag', price: 2499, img: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=600&q=80' },
          { name: 'Backpacks', slug: 'backpacks-hiking', prodName: '50L Trekking Backpack with Rain Cover', price: 3499, img: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&q=80' },
          { name: 'Navigation', slug: 'navigation', prodName: 'Outdoor GPS Tracker Compass', price: 2999, img: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80' }
        ]
      },
      {
        name: 'Cycling',
        slug: 'cycling',
        image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80',
        subSubCategories: [
          { name: 'Bicycles', slug: 'bicycles', prodName: '22-Speed Lightweight Alloy Mountain Bike', price: 18999, img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80' },
          { name: 'Helmets', slug: 'cycling-helmets', prodName: 'Aero Safety Cycling Helmet LED Light', price: 1799, img: 'https://images.unsplash.com/photo-1559348349-86f1f65817fe?w=600&q=80' },
          { name: 'Bike Accessories', slug: 'bike-accessories', prodName: 'Waterproof Bike Frame Bag & Phone Mount', price: 999, img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80' }
        ]
      },
      {
        name: 'Water Sports',
        slug: 'water-sports',
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80',
        subSubCategories: [
          { name: 'Kayaks', slug: 'kayaks', prodName: 'Inflatable 2-Person Tandem Kayak', price: 16999, img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
          { name: 'Swim Gear', slug: 'swim-gear', prodName: 'Anti-Fog UV Protection Swim Goggles', price: 799, img: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80' },
          { name: 'Paddleboards', slug: 'paddleboards', prodName: 'Stand-Up Inflatable Paddleboard Set', price: 21999, img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' }
        ]
      }
    ]
  },
  {
    name: 'Toys, Hobbies & Media',
    slug: 'toys-hobbies-media',
    image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=600&q=80',
    subCategories: [
      {
        name: 'Toys & Games',
        slug: 'toys-games',
        image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=600&q=80',
        subSubCategories: [
          { name: 'Board Games', slug: 'board-games', prodName: 'Strategy Empire Board Game Edition', price: 1999, img: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80' },
          { name: 'Puzzles', slug: 'puzzles', prodName: '1000-Piece Landscape Jigsaw Puzzle', price: 899, img: 'https://images.unsplash.com/photo-1588783948922-d2f155b13c89?w=600&q=80' },
          { name: 'Action Figures', slug: 'action-figures', prodName: 'Collectible Superhero Action Figure 12-inch', price: 1499, img: 'https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=600&q=80' },
          { name: 'Dolls', slug: 'dolls', prodName: 'Interactive Fashion Doll with Accessories', price: 1299, img: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=600&q=80' },
          { name: 'Building Blocks', slug: 'building-blocks', prodName: 'City Architect Building Blocks 500-Piece Set', price: 2999, img: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80' }
        ]
      },
      {
        name: 'Video Games',
        slug: 'video-games',
        image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&q=80',
        subSubCategories: [
          { name: 'Consoles', slug: 'consoles', prodName: 'NextGen Gaming Console 1TB Edition', price: 49999, img: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&q=80' },
          { name: 'Controller Accessories', slug: 'controller-accessories', prodName: 'Dual Charge Wireless Controller Dock', price: 1499, img: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=600&q=80' },
          { name: 'Game Discs/Codes', slug: 'game-discs-codes', prodName: 'Cyber Quest Action RPG Physical Disc', price: 3499, img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80' }
        ]
      },
      {
        name: 'Books',
        slug: 'books',
        image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80',
        subSubCategories: [
          { name: 'Fiction', slug: 'fiction', prodName: 'The Forgotten Realm Hardcover Novel', price: 699, img: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80' },
          { name: 'Non-Fiction', slug: 'non-fiction', prodName: 'Mastering Mindset & Leadership Growth', price: 799, img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80' },
          { name: 'Children\'s Books', slug: 'childrens-books', prodName: 'Illustrated Bedtime Stories Treasury', price: 599, img: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80' },
          { name: 'E-books', slug: 'e-books', prodName: 'Digital Tech Trends 2026 E-Book', price: 399, img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80' }
        ]
      }
    ]
  }
];

async function seedCatalog() {
  console.log('🚀 --- Starting Full 6-Pillar Catalog Seeding ---');
  try {
    // 1. Resolve primary warehouse for stock inventory
    let primaryWh = await Warehouse.findOne();
    const warehouseId = primaryWh ? primaryWh.id : 1;
    console.log(`📦 Using Warehouse ID: ${warehouseId} for stock allocation.`);

    let totalCatCount = 0;
    let totalSubCatCount = 0;
    let totalSubSubCatCount = 0;
    let totalProductCount = 0;

    for (const catData of CATALOG_DATA) {
      // 1. Create Main Category
      const [category] = await Category.findOrCreate({
        where: { slug: catData.slug },
        defaults: {
          name: catData.name,
          slug: catData.slug,
          image: catData.image,
          description: `Shop high quality ${catData.name} products at Billu Bazaar.`,
          isActive: true,
          showHeader: true
        }
      });
      totalCatCount++;
      console.log(`\n📂 Main Category [${category.id}]: ${category.name}`);

      for (const subData of catData.subCategories) {
        // 2. Create SubCategory
        const [subCat] = await SubCategory.findOrCreate({
          where: { slug: subData.slug },
          defaults: {
            categoryId: category.id,
            name: subData.name,
            slug: subData.slug,
            image: subData.image,
            description: `${subData.name} under ${category.name}`,
            isActive: true
          }
        });
        totalSubCatCount++;
        console.log(`  └─ SubCategory [${subCat.id}]: ${subCat.name}`);

        for (const subSubData of subData.subSubCategories) {
          // 3. Create SubSubCategory
          const [subSubCat] = await SubSubCategory.findOrCreate({
            where: { slug: subSubData.slug },
            defaults: {
              subCategoryId: subCat.id,
              name: subSubData.name,
              slug: subSubData.slug,
              image: subSubData.img,
              description: `${subSubData.name} under ${subCat.name}`,
              isActive: true
            }
          });
          totalSubSubCatCount++;
          console.log(`      └─ SubSubCategory [${subSubCat.id}]: ${subSubCat.name}`);

          // 4. Create Sample Product for this SubSubCategory
          const prodSlug = `${subSubData.slug}-prod-${Math.floor(100 + Math.random() * 900)}`;
          const sku = `SKU-${subSubData.slug.toUpperCase().slice(0, 8)}-${Math.floor(1000 + Math.random() * 9000)}`;

          const [product, created] = await Product.findOrCreate({
            where: { name: subSubData.prodName },
            defaults: {
              name: subSubData.prodName,
              slug: prodSlug,
              description: `Experience luxury design and superior durability with the ${subSubData.prodName}. Authored under ${category.name} > ${subCat.name} > ${subSubCat.name}.`,
              shortDescription: `Premium ${subSubData.name} featuring state-of-the-art craftsmanship and luxury aesthetics.`,
              price: subSubData.price,
              comparePrice: Math.round(subSubData.price * 1.25),
              currency: 'INR',
              sku: sku,
              stock: 50,
              categoryId: category.id,
              subCategoryId: subCat.id,
              subSubCategoryId: subSubCat.id,
              warehouseId: warehouseId,
              images: [subSubData.img],
              defaultProductImage: subSubData.img,
              gstRate: '18%',
              isActive: true,
              showAuthenticity: true
            }
          });

          if (created) {
            // Allocate initial warehouse stock
            await WarehouseStock.findOrCreate({
              where: { warehouseId: warehouseId, productId: product.id, variantId: null },
              defaults: { warehouseId: warehouseId, productId: product.id, variantId: null, quantity: 50, reservedQty: 0 }
            });
            totalProductCount++;
            console.log(`          ✨ Product Created: ${product.name} (₹${product.price})`);
          } else {
            console.log(`          ✓ Product Already Exists: ${product.name}`);
          }
        }
      }
    }

    console.log('\n==================================================');
    console.log(`🎉 SUCCESS! Catalog Seeding Complete!`);
    console.log(`Categories Processed: ${totalCatCount}`);
    console.log(`SubCategories Processed: ${totalSubCatCount}`);
    console.log(`SubSubCategories Processed: ${totalSubSubCatCount}`);
    console.log(`New Products Created: ${totalProductCount}`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ Error during catalog seeding:', err);
  } finally {
    process.exit(0);
  }
}

seedCatalog();
