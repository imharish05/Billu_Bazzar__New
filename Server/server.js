'use strict';
require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const start = async () => {
  try {
    // 1. Authenticate DB connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Run safe database alters for Wishlists table BEFORE syncing models
    try {
      const queryInterface = sequelize.getQueryInterface();
      const tableDesc = await queryInterface.describeTable('Wishlists').catch(() => null);
      if (tableDesc) {
        if (!tableDesc.variantId) {
          await sequelize.query("ALTER TABLE Wishlists ADD COLUMN variantId INT NULL");
          console.log('✅ Wishlists table variantId column added');
        }
        if (!tableDesc.selectedVariant) {
          await sequelize.query("ALTER TABLE Wishlists ADD COLUMN selectedVariant JSON NULL");
          console.log('✅ Wishlists table selectedVariant column added');
        }
        // Drop legacy unique index if it exists so 3-column index can sync cleanly
        try { await sequelize.query("ALTER TABLE Wishlists DROP INDEX customerId_productId"); } catch (e) {}
        try { await sequelize.query("ALTER TABLE Wishlists DROP INDEX customer_id_product_id"); } catch (e) {}
      }
    } catch (alterErr) {
      console.log('⚠️ Pre-sync Wishlists alter note:', alterErr.message);
    }

    // Run safe database alters for Affiliates table BEFORE syncing models
    try {
      const queryInterface = sequelize.getQueryInterface();
      const affTableDesc = await queryInterface.describeTable('Affiliates').catch(() => null);
      if (affTableDesc) {
        if (!affTableDesc.socialMedia) {
          await sequelize.query("ALTER TABLE Affiliates ADD COLUMN socialMedia JSON NULL");
          console.log('✅ Affiliates table socialMedia column added');
        }
        if (!affTableDesc.documentProof) {
          await sequelize.query("ALTER TABLE Affiliates ADD COLUMN documentProof VARCHAR(500) NULL");
          console.log('✅ Affiliates table documentProof column added');
        }
      }
    } catch (alterErr) {
      console.log('⚠️ Pre-sync Affiliates alter note:', alterErr.message);
    }

    // Run safe database alters for Vendors table BEFORE syncing models
    try {
      const queryInterface = sequelize.getQueryInterface();
      const vendorTableDesc = await queryInterface.describeTable('Vendors').catch(() => null);
      if (vendorTableDesc && !vendorTableDesc.contactPerson) {
        await sequelize.query("ALTER TABLE Vendors ADD COLUMN contactPerson VARCHAR(150) NULL AFTER name");
        console.log('✅ Vendors table contactPerson column added');
      }
    } catch (alterErr) {
      console.log('⚠️ Pre-sync Vendors alter note:', alterErr.message);
    }

    // Run safe database alters for StockAlerts table BEFORE syncing models
    try {
      const queryInterface = sequelize.getQueryInterface();
      const stockAlertTableDesc = await queryInterface.describeTable('StockAlerts').catch(() => null);
      if (stockAlertTableDesc) {
        if (!stockAlertTableDesc.variantId) {
          await sequelize.query("ALTER TABLE StockAlerts ADD COLUMN variantId INT NULL AFTER productId");
          console.log('✅ StockAlerts table variantId column added');
        }
        if (!stockAlertTableDesc.selectedVariant) {
          await sequelize.query("ALTER TABLE StockAlerts ADD COLUMN selectedVariant JSON NULL AFTER variantId");
          console.log('✅ StockAlerts table selectedVariant column added');
        }
      }
    } catch (alterErr) {
      console.log('⚠️ Pre-sync StockAlerts alter note:', alterErr.message);
    }

    // 2. Sync all models (safe — doesn't drop data)
    await sequelize.sync();
    console.log('✅ Models synced');

    // Run manual database alters for Banners table to support EXCLUSIVE_DEAL and optional title
    try {
      await sequelize.query("ALTER TABLE Banners MODIFY COLUMN type ENUM('HERO', 'PROMO', 'DEAL', 'EXCLUSIVE_DEAL', 'BRAND', 'COUNTDOWN') DEFAULT 'PROMO'");
      await sequelize.query("ALTER TABLE Banners MODIFY COLUMN title VARCHAR(200) NULL");
      console.log('✅ Banners table column definitions updated');
    } catch (alterErr) {
      console.log('⚠️ Manual alter note (already altered or table not synced yet):', alterErr.message);
    }

    // Run manual database alters for Orders table to support status flows & clean legacy RTO records
    try {
      await sequelize.query("UPDATE Orders SET status = 'CANCELLED' WHERE status = 'RTO'");
      await sequelize.query("ALTER TABLE Orders MODIFY COLUMN status ENUM('PENDING_PAYMENT', 'PAID', 'PAYMENT_RECEIVED_STOCK_FAILED', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED', 'EXPIRED') DEFAULT 'PENDING_PAYMENT'");
      console.log('✅ Orders table status column definition updated & RTO records cleaned');
    } catch (alterErr) {
      console.log('⚠️ Manual alter note (status already updated):', alterErr.message);
    }

    try {
      await sequelize.query("ALTER TABLE Orders ADD COLUMN sessionId VARCHAR(100) NULL");
      await sequelize.query("ALTER TABLE Orders ADD COLUMN razorpay_payment_id VARCHAR(100) NULL UNIQUE");
      await sequelize.query("ALTER TABLE Orders ADD COLUMN razorpay_order_id VARCHAR(100) NULL UNIQUE");
      await sequelize.query("ALTER TABLE Orders ADD COLUMN razorpay_signature VARCHAR(255) NULL");
      await sequelize.query("ALTER TABLE Orders ADD COLUMN inventoryProcessed BOOLEAN NOT NULL DEFAULT FALSE");
      console.log('✅ Orders table Razorpay columns added');
    } catch (alterErr) {
      console.log('⚠️ Manual alter note (Orders columns already exist):', alterErr.message);
    }

    // Clean up past unverified payment attempts that were mistakenly set to PAID
    try {
      await sequelize.query("UPDATE Orders SET status = 'PENDING_PAYMENT', paymentStatus = 'UNPAID' WHERE status = 'PAID' AND razorpay_payment_id IS NULL AND paymentMethod != 'COD' AND (paymentMethod LIKE '%Razorpay%' OR paymentGatewayRef IS NOT NULL)");
      console.log('✅ Cleaned up unverified payment attempt orders');
    } catch (cleanErr) {
      console.log('⚠️ Order cleanup note:', cleanErr.message);
    }

    // Run manual database alters for CartItems and OrderItems to support variantId snapshot
    try {
      await sequelize.query("ALTER TABLE CartItems ADD COLUMN variantId INT NULL");
      console.log('✅ CartItems table variantId column added');
    } catch (alterErr) {
      console.log('⚠️ Manual alter note (CartItems columns already exist):', alterErr.message);
    }

    try {
      await sequelize.query("ALTER TABLE OrderItems ADD COLUMN variantId INT NULL");
      console.log('✅ OrderItems table variantId column added');
    } catch (alterErr) {
      console.log('⚠️ Manual alter note (OrderItems columns already exist):', alterErr.message);
    }

    // Run manual database alters for Carts table to allow guest checkout customerId relaxation
    try {
      await sequelize.query("ALTER TABLE Carts ADD COLUMN sessionId VARCHAR(100) NULL");
      await sequelize.query("ALTER TABLE Carts MODIFY COLUMN customerId INT NULL DEFAULT NULL");
      console.log('✅ Carts table session columns updated');
    } catch (alterErr) {
      console.log('⚠️ Manual alter note (Carts columns already exist):', alterErr.message);
    }

    try {
      await sequelize.query("ALTER TABLE Carts ADD COLUMN lastEmailSentAt DATETIME NULL");
      console.log('✅ Carts table lastEmailSentAt column added');
    } catch (alterErr) {
      console.log('⚠️ Manual alter note (Carts lastEmailSentAt column already exists):', alterErr.message);
    }

    // Manual alter to add react-360-view materialized frame columns to existing Products tables
    try {
      await sequelize.query("ALTER TABLE Products ADD COLUMN defaultProductImage VARCHAR(500) NULL");
      await sequelize.query("ALTER TABLE Products ADD COLUMN has360View BOOLEAN NOT NULL DEFAULT FALSE");
      await sequelize.query("ALTER TABLE Products ADD COLUMN hasVideo BOOLEAN NOT NULL DEFAULT FALSE");
      await sequelize.query("ALTER TABLE Products ADD COLUMN videoUrl VARCHAR(500) NULL");
      console.log('✅ Products table media & listing columns added');
    } catch (alterErr) {
      console.log('⚠️ Manual alter note (Products columns already exist):', alterErr.message);
    }

    try {
      await sequelize.query("ALTER TABLE Products ADD COLUMN spinImagePath VARCHAR(300) NULL");
      await sequelize.query("ALTER TABLE Products ADD COLUMN subCategoryId INT NULL");
      await sequelize.query("ALTER TABLE Products ADD COLUMN subSubCategoryId INT NULL");
      console.log('✅ Products table sub-category columns added');
    } catch (alterErr) {
      console.log('⚠️ Manual alter note (already altered or table not synced yet):', alterErr.message);
    }

    // Helper to safely execute individual column alters
    const safeAddColumn = async (query) => {
      try {
        await sequelize.query(query);
      } catch (alterErr) {
        // Ignore column duplicate errors safely
      }
    };

    await safeAddColumn("ALTER TABLE Products ADD COLUMN showAuthenticity BOOLEAN NOT NULL DEFAULT FALSE");
    await safeAddColumn("ALTER TABLE Products ADD COLUMN warehouseId INT NULL");
    await safeAddColumn("ALTER TABLE ProductVariants ADD COLUMN warehouseId INT NULL");
    await safeAddColumn("ALTER TABLE ProductVariants ADD COLUMN lowStockThreshold INT NULL DEFAULT 10");
    await safeAddColumn("ALTER TABLE ProductVariants ADD COLUMN gstRate VARCHAR(20) NULL DEFAULT '18%'");
    await safeAddColumn("ALTER TABLE Products ADD COLUMN lowStockThreshold INT NULL DEFAULT 10");
    await safeAddColumn("ALTER TABLE Products ADD COLUMN gstRate VARCHAR(20) NULL DEFAULT '18%'");
    await safeAddColumn("ALTER TABLE Warehouses ADD COLUMN isFulfillment BOOLEAN NOT NULL DEFAULT FALSE");
    await safeAddColumn("ALTER TABLE Warehouses ADD COLUMN isProcurement BOOLEAN NOT NULL DEFAULT FALSE");
    await safeAddColumn("ALTER TABLE WarehouseStocks ADD COLUMN variantId INT NULL");
    await safeAddColumn("ALTER TABLE ProductVariants ADD COLUMN mrp DECIMAL(10, 2) NULL");
    await safeAddColumn("ALTER TABLE ProductVariants ADD COLUMN image VARCHAR(255) NULL");
    await safeAddColumn("ALTER TABLE ProductVariants ADD COLUMN images JSON NULL");
    await safeAddColumn("ALTER TABLE InventoryMovementLogs ADD COLUMN warehouseId INT NULL");
    await safeAddColumn("ALTER TABLE InventoryMovementLogs ADD COLUMN toWarehouseId INT NULL");
    await safeAddColumn('ALTER TABLE Customers ADD COLUMN passwordResetToken VARCHAR(128) NULL DEFAULT NULL');
    await safeAddColumn('ALTER TABLE Customers ADD COLUMN passwordResetExpiry DATETIME NULL DEFAULT NULL');
    await safeAddColumn("ALTER TABLE Orders ADD COLUMN taxRate DECIMAL(5, 2) NULL DEFAULT 0");

    // Ensure Banners table columns exist and migrate legacy type
    try {
      await sequelize.query("ALTER TABLE Banners MODIFY COLUMN type VARCHAR(50) NOT NULL DEFAULT 'PROMO'");
      await sequelize.query("UPDATE Banners SET type = 'EXCLUSIVE_DEAL' WHERE type = 'DEAL'");
    } catch (migErr) {
      // Ignore migration note
    }

    await safeAddColumn("ALTER TABLE Banners ADD COLUMN badgeText VARCHAR(50) NULL");
    await safeAddColumn("ALTER TABLE Banners ADD COLUMN countdown DATETIME NULL");
    await safeAddColumn("ALTER TABLE Banners ADD COLUMN position INT DEFAULT 0");

    // 2.5 Run search keywords sync if empty
    const { syncAllExisting } = require('./services/searchSyncService');
    await syncAllExisting();

    // 2.6 Fix any empty or null product slugs in the database
    try {
      const { Op } = require('sequelize');
      const { Product } = require('./models');
      const productsWithEmptySlugs = await Product.findAll({
        where: {
          [Op.or]: [
            { slug: '' },
            { slug: { [Op.is]: null } }
          ]
        }
      });
      for (const p of productsWithEmptySlugs) {
        const generatedSlug = p.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        let finalSlug = generatedSlug;
        let count = 1;
        while (await Product.findOne({ where: { slug: finalSlug } })) {
          finalSlug = `${generatedSlug}-${count}`;
          count++;
        }
        
        await p.update({ slug: finalSlug });
        console.log(`✅ Fixed empty slug for product "${p.name}" -> "${finalSlug}"`);
      }
    } catch (slugErr) {
      console.log('⚠️ Failed to sync empty product slugs:', slugErr.message);
    }


    // 3.1 Sync real product ratings with Review table entries
    const { syncAllProductRatings } = require('./controllers/reviewController');
    await syncAllProductRatings();

    // 3.5 Load background cron jobs (DISABLED per user preference — no cron jobs active)
    // require('./jobs/reminderJob');
    // require('./jobs/searchJob');
    // require('./jobs/orderExpiryJob');

    // 4. Start server
    app.listen(PORT, () => {
      console.log(`🚀 Billu Bazaar API running at http://localhost:${PORT}`);
      console.log(`   Client: ${process.env.CLIENT_URL}`);
      console.log(`   Admin:  ${process.env.ADMIN_URL}`);
    });
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
};

start();