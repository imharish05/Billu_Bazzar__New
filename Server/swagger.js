'use strict';
require('dotenv').config();

const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const port = process.env.PORT || 5000;
const defaultHost = `http://localhost:${port}`;
const serverUrl = process.env.API_URL || process.env.SWAGGER_HOST || defaultHost;

const doc = {
  info: {
    title: 'Billu Bazaar API Documentation',
    description: 'Comprehensive OpenAPI 3.0 Swagger specification for all backend API endpoints and CRUD operations.',
    version: '1.0.0',
    contact: {
      name: 'Billu Bazaar API Team',
      email: process.env.ADMIN_EMAIL || 'support@billubazaar.com'
    }
  },
  servers: [
    {
      url: '/',
      description: 'Relative Path / Current Domain (Best for HTTPS & Live)'
    },
    {
      url: serverUrl,
      description: 'Environment API Server'
    },
    {
      url: `http://localhost:${port}`,
      description: 'Local Development Server'
    }
  ],
  basePath: '/',
  schemes: ['http', 'https'],
  tags: [
    { name: 'Auth & Security', description: 'User authentication, registration, OTP verification, and JWT management' },
    { name: 'Products', description: 'Product catalog CRUD management, search, filtering, and price queries' },
    { name: 'Product Variants', description: 'SKU variant CRUD management and inventory options' },
    { name: 'Warehouses & Inventory', description: 'Warehouse management, stock movements, and multi-location inventory' },
    { name: 'Categories', description: 'Top-level category hierarchy CRUD operations and ordering' },
    { name: 'Subcategories', description: 'Subcategory CRUD management' },
    { name: 'Sub-Subcategories', description: 'Third-tier category CRUD management' },
    { name: 'Vendors', description: 'Multi-vendor & seller profiles management' },
    { name: 'Orders & Checkout', description: 'Customer checkout, order placement, tracking, and admin fulfillment' },
    { name: 'Cart', description: 'Customer shopping cart operations' },
    { name: 'Stock Status', description: 'Real-time stock availability and inventory checks' },
    { name: 'Payments', description: 'Razorpay integration and payment webhooks' },
    { name: 'Banners', description: 'Storefront promotional banners CRUD management' },
    { name: 'Customers', description: 'Customer accounts management and admin user lookup' },
    { name: 'Marketing Messages', description: 'Broadcast marketing notifications and promotional messages' },
    { name: 'Affiliates', description: 'Affiliate partner program registration and commission tracking' },
    { name: 'Search & Keywords', description: 'Search autocomplete, trending queries, and search caching' },
    { name: 'Coupons & Discounts', description: 'Promo codes, coupon validation, and discount rules' },
    { name: 'Site Settings', description: 'Global storefront settings and configuration management' },
    { name: 'Gift Services', description: 'Gift wrapping options and specialized services' },
    { name: 'Customer Reviews', description: 'Product reviews, ratings, and content moderation' },
    { name: 'Loyalty Program', description: 'Customer reward points ledger and redemption' },
    { name: 'Stock Alerts', description: 'Back-in-stock subscriptions and customer notifications' },
    { name: 'Delivery Zones', description: 'Pincode delivery zones, shipping charges, and delivery times' },
    { name: 'Contact Enquiries', description: 'Help desk and customer contact inquiry forms' },
    { name: 'Personal Shopper', description: 'Personal shopper booking and consultation requests' },
    { name: 'Currency', description: 'Live exchange rates and currency conversion' },
    { name: 'Roles & RBAC', description: 'Role-based access control and admin permission sets' },
    { name: 'Admin Users', description: 'Staff user accounts management and permission assignment' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT Token in format: Bearer <token>'
      }
    },
    schemas: {
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Premium Cotton Shirt' },
          slug: { type: 'string', example: 'premium-cotton-shirt' },
          sku: { type: 'string', example: 'PCS-001' },
          barcode: { type: 'string', example: '8901234567890' },
          description: { type: 'string', example: 'High quality 100% cotton shirt' },
          shortDescription: { type: 'string', example: 'Comfortable everyday wear' },
          price: { type: 'number', example: 1299.00 },
          comparePrice: { type: 'number', example: 1999.00 },
          costPrice: { type: 'number', example: 700.00 },
          quantity: { type: 'integer', example: 50 },
          lowStockThreshold: { type: 'integer', example: 5 },
          status: { type: 'string', enum: ['active', 'inactive', 'draft'], example: 'active' },
          featured: { type: 'boolean', example: true },
          newArrival: { type: 'boolean', example: true },
          bestSeller: { type: 'boolean', example: false },
          categoryId: { type: 'integer', example: 2 },
          subCategoryId: { type: 'integer', example: 5 },
          subSubCategoryId: { type: 'integer', example: 12 },
          vendorId: { type: 'integer', example: 1 },
          images: { type: 'array', items: { type: 'string' }, example: ['/uploads/products/shirt1.jpg'] },
          videoUrl: { type: 'string', example: '' },
          threeDModelUrl: { type: 'string', example: '' },
          seoTitle: { type: 'string', example: 'Buy Premium Cotton Shirt Online' },
          seoDescription: { type: 'string', example: 'Shop the best cotton shirt at Billu Bazaar.' },
          weight: { type: 'number', example: 0.35 },
          dimensions: { type: 'string', example: '30x20x5 cm' }
        }
      },
      ProductVariant: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 10 },
          productId: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Blue / Large' },
          sku: { type: 'string', example: 'PCS-001-BLU-L' },
          price: { type: 'number', example: 1299.00 },
          comparePrice: { type: 'number', example: 1999.00 },
          costPrice: { type: 'number', example: 700.00 },
          stock: { type: 'integer', example: 25 },
          options: { type: 'object', example: { Color: 'Blue', Size: 'L' } },
          image: { type: 'string', example: '/uploads/products/shirt1-blue.jpg' }
        }
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Fashion & Apparel' },
          slug: { type: 'string', example: 'fashion-apparel' },
          description: { type: 'string', example: 'Trendy clothing and accessories' },
          image: { type: 'string', example: '/uploads/categories/fashion.jpg' },
          sortOrder: { type: 'integer', example: 1 },
          isActive: { type: 'boolean', example: true }
        }
      },
      SubCategory: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 5 },
          categoryId: { type: 'integer', example: 1 },
          name: { type: 'string', example: "Men's Wear" },
          slug: { type: 'string', example: 'mens-wear' },
          description: { type: 'string', example: 'Shirts, trousers, and jacket collection' },
          image: { type: 'string', example: '/uploads/subcategories/mens.jpg' },
          sortOrder: { type: 'integer', example: 1 },
          isActive: { type: 'boolean', example: true }
        }
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 101 },
          orderNumber: { type: 'string', example: 'BB-2026-0814-101' },
          customerId: { type: 'integer', example: 12 },
          customerName: { type: 'string', example: 'John Doe' },
          customerEmail: { type: 'string', example: 'john@example.com' },
          customerPhone: { type: 'string', example: '+919876543210' },
          subtotal: { type: 'number', example: 2598.00 },
          discountAmount: { type: 'number', example: 200.00 },
          taxAmount: { type: 'number', example: 119.90 },
          shippingFee: { type: 'number', example: 50.00 },
          totalAmount: { type: 'number', example: 2567.90 },
          paymentStatus: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'], example: 'paid' },
          paymentMethod: { type: 'string', example: 'razorpay' },
          orderStatus: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], example: 'processing' },
          couponCode: { type: 'string', example: 'WELCOME10' }
        }
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 12 },
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'john@example.com' },
          phone: { type: 'string', example: '+919876543210' },
          address: { type: 'string', example: '123 Main St, City, State' },
          whatsappOptIn: { type: 'boolean', example: true },
          loyaltyPoints: { type: 'integer', example: 150 }
        }
      },
      Coupon: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 3 },
          code: { type: 'string', example: 'SUMMER20' },
          discountType: { type: 'string', enum: ['percentage', 'fixed'], example: 'percentage' },
          discountValue: { type: 'number', example: 20.00 },
          minOrderAmount: { type: 'number', example: 1000.00 },
          maxDiscount: { type: 'number', example: 500.00 },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          usageLimit: { type: 'integer', example: 500 },
          usedCount: { type: 'integer', example: 42 },
          isActive: { type: 'boolean', example: true }
        }
      },
      Vendor: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Apex Apparel Vendors' },
          email: { type: 'string', example: 'vendor@apexapparel.com' },
          phone: { type: 'string', example: '+919876500000' },
          storeName: { type: 'string', example: 'Apex Store' },
          commissionRate: { type: 'number', example: 10.00 },
          status: { type: 'string', enum: ['active', 'inactive', 'pending'], example: 'active' }
        }
      },
      Warehouse: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Central Warehouse' },
          code: { type: 'string', example: 'WH-01' },
          address: { type: 'string', example: 'Industrial Logistics Hub' },
          city: { type: 'string', example: 'Bangalore' },
          state: { type: 'string', example: 'Karnataka' },
          pincode: { type: 'string', example: '560001' },
          isActive: { type: 'boolean', example: true }
        }
      },
      Role: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Store Admin' },
          description: { type: 'string', example: 'Full administrative permissions' },
          permissions: { type: 'array', items: { type: 'string' }, example: ['view_products', 'add_product', 'edit_product', 'delete_product'] }
        }
      },
      AdminUser: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Admin User' },
          email: { type: 'string', example: 'admin@billubazaar.com' },
          roleId: { type: 'integer', example: 1 },
          isActive: { type: 'boolean', example: true }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Invalid parameter or entity not found' }
        }
      }
    }
  }
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./app.js'];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log(`✅ Swagger documentation generated successfully into swagger-output.json (Server URL: ${serverUrl})`);
});

