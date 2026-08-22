'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');

const app = express();

// Trust reverse proxy (Nginx, Webuzo, Cloudflare) for accurate HTTPS detection
app.set('trust proxy', true);

// ── Security & Logging ────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));
app.use(morgan('dev'));

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-session-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

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
app.use('/mob-api/auth',   require('./mob-api/Auth/authRoutes'));
app.use('/api/mob/auth',   require('./mob-api/Auth/authRoutes'));
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
app.use('/api/returns',       require('./routes/returnRoutes'));
app.use('/api/loyalty',       require('./routes/loyaltyRoutes'));
app.use('/api/stock-alerts',  require('./routes/stockAlertRoutes'));
app.use('/api/delivery-zones', require('./routes/deliveryZoneRoutes'));
app.use('/api/contact-enquiries', require('./routes/contactEnquiryRoutes'));
app.use('/api/personal-shopper',   require('./routes/personalShopperRoutes'));
app.use('/api/currency',          require('./routes/currencyRoutes'));
app.use('/api/roles',             require('./routes/roleRoutes'));
app.use('/api/admin-users',       require('./routes/adminUserRoutes'));

// ── Warm up exchange rate cache on startup (non-blocking) ────────────────────
require('./services/currencyRateService').warmUp().catch(() => {});

// ── Swagger API Documentation ──────────────────────────────────────────────────
try {
  const swaggerUi = require('swagger-ui-express');
  const fs = require('fs');
  const swaggerSpecPath = path.join(__dirname, 'swagger-output.json');
  if (fs.existsSync(swaggerSpecPath)) {
    const swaggerDocument = JSON.parse(fs.readFileSync(swaggerSpecPath, 'utf8'));

    app.use('/api-docs', (req, res, next) => {
      // Dynamically detect scheme/host from proxy or fallback to relative URL
      const reqHost = req.get('host');
      const forwardedProto = req.headers['x-forwarded-proto'];
      const reqProtocol = forwardedProto || req.protocol || 'http';
      const dynamicUrl = `${reqProtocol}://${reqHost}`;
      
      swaggerDocument.servers = [
        { url: '/', description: 'Current Domain / Relative Path (Recommended for Live HTTPS)' },
        { url: dynamicUrl, description: `Request Origin (${dynamicUrl})` },
        ...(process.env.API_URL ? [{ url: process.env.API_URL, description: 'Environment API_URL' }] : [])
      ];
      req.swaggerDoc = swaggerDocument;
      next();
    }, swaggerUi.serve, (req, res, next) => {
      swaggerUi.setup(req.swaggerDoc, {
        customSiteTitle: 'Billu Bazaar API Documentation',
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'list',
          filter: true
        }
      })(req, res, next);
    });
  }
} catch (swaggerErr) {
  console.log('⚠️ Swagger UI setup note:', swaggerErr.message);
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Uploaded file is too large. Maximum file size allowed is 10MB.' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

module.exports = app;