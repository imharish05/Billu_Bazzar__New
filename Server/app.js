'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');

const app = express();

// ── Security & Logging ────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));

// ── CORS ─────────────────────────────────────────────────────────────────────
// app.use(cors({
//   origin: [process.env.CLIENT_URL, process.env.ADMIN_URL],
//   credentials: true,
// }));

app.use(cors())

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static Uploads ─────────────────────────────────────────────────────────────
// setHeaders overrides Content-Type based on real file bytes, not extension —
// see middleware/imageContentType.js for why this matters for 360 frames.
const { fixImageContentType } = require('./middleware/imageContentType');
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: fixImageContentType,
}));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/products',   require('./routes/productRoutes'));
app.use('/api/variants',   require('./routes/variantRoutes'));
app.use('/api/warehouses', require('./routes/warehouseRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/subcategories', require('./routes/subCategoryRoutes'));
app.use('/api/subsubcategories', require('./routes/subSubCategoryRoutes'));
app.use('/api/vendors',     require('./routes/vendorRoutes'));
app.use('/api/orders',     require('./routes/orderRoutes'));
app.use('/api/cart',       require('./routes/cartRoutes'));
app.use('/api/stock-status', require('./routes/stockRoutes'));
app.use('/api/payments',     require('./routes/paymentRoutes'));

app.use('/api/banners',    require('./routes/bannerRoutes'));
app.use('/api/customers',  require('./routes/customerRoutes'));
app.use('/api/marketing-messages', require('./routes/marketingMessageRoutes'));
app.use('/api/affiliates',  require('./routes/affiliateRoutes'));
app.use('/api/search',      require('./routes/searchRoutes'));
app.use('/api/coupons',     require('./routes/couponRoutes'));
app.use('/api/site-settings', require('./routes/siteSettingRoutes'));
app.use('/api/settings', require('./routes/siteSettingRoutes'));
app.use('/api/gift-service',  require('./routes/giftServiceRoutes'));
app.use('/api/reviews',       require('./routes/reviewRoutes'));
app.use('/api/loyalty',       require('./routes/loyaltyRoutes'));
app.use('/api/stock-alerts',  require('./routes/stockAlertRoutes'));
app.use('/api/delivery-zones', require('./routes/deliveryZoneRoutes'));
app.use('/api/contact-enquiries', require('./routes/contactEnquiryRoutes'));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;