'use strict';
/**
 * /server/models/index.js
 * Loads all Sequelize models and defines all associations in one place.
 * Import this file wherever you need the DB models.
 */

const sequelize = require('../config/db');

// ── Model imports ────────────────────────────────────────────────────────────
const Role          = require('./Role');
const AdminUser     = require('./AdminUser');
const Customer      = require('./Customer');
const Category      = require('./Category');
const SubCategory   = require('./SubCategory');
const SubSubCategory = require('./SubSubCategory');
const Vendor        = require('./Vendor');
const Product       = require('./Product');
const Warehouse     = require('./Warehouse');
const WarehouseStock = require('./WarehouseStock');
const Cart          = require('./Cart');
const CartItem      = require('./CartItem');
const Coupon        = require('./Coupon');
const Affiliate     = require('./Affiliate');
const Order         = require('./Order');
const OrderItem     = require('./OrderItem');
const Wishlist      = require('./Wishlist');
const LoyaltyLedger = require('./LoyaltyLedger');
const SupportTicket = require('./SupportTicket');
const Banner        = require('./Banner');
const Review        = require('./Review');
const StockAlert    = require('./StockAlert');
const MarketingMessage = require('./MarketingMessage');
const SearchKeyword    = require('./SearchKeyword');
const TrendingCache    = require('./TrendingCache');
const SiteSetting      = require('./SiteSetting');
const ProductVariant   = require('./ProductVariant');
const InventoryMovementLog = require('./InventoryMovementLog');

// ── Associations ─────────────────────────────────────────────────────────────

SearchKeyword.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Category.hasMany(SearchKeyword,   { foreignKey: 'category_id', as: 'searchKeywords' });

// AdminUser ↔ Role  (AdminUser belongs to Role; Role has many AdminUsers)
AdminUser.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(AdminUser,   { foreignKey: 'roleId', as: 'admins' });

// Category ↔ SubCategory ↔ SubSubCategory
SubCategory.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(SubCategory,   { foreignKey: 'categoryId', as: 'subcategories' });

SubSubCategory.belongsTo(SubCategory, { foreignKey: 'subCategoryId', as: 'subcategory' });
SubCategory.hasMany(SubSubCategory,   { foreignKey: 'subCategoryId', as: 'subsubcategories' });

// Product ↔ Category / Vendor / SubCategory / SubSubCategory
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Product,   { foreignKey: 'categoryId', as: 'products' });

Product.belongsTo(SubCategory, { foreignKey: 'subCategoryId', as: 'subcategory' });
SubCategory.hasMany(Product,   { foreignKey: 'subCategoryId', as: 'products' });

Product.belongsTo(SubSubCategory, { foreignKey: 'subSubCategoryId', as: 'subsubcategory' });
SubSubCategory.hasMany(Product,   { foreignKey: 'subSubCategoryId', as: 'products' });

Product.belongsTo(Vendor,   { foreignKey: 'vendorId', as: 'vendor' });
Vendor.hasMany(Product,     { foreignKey: 'vendorId', as: 'products' });

Product.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
Warehouse.hasMany(Product,   { foreignKey: 'warehouseId', as: 'products' });

ProductVariant.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
Warehouse.hasMany(ProductVariant,   { foreignKey: 'warehouseId', as: 'variants' });

// WarehouseStock ↔ Warehouse / Product / ProductVariant
WarehouseStock.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
Warehouse.hasMany(WarehouseStock,   { foreignKey: 'warehouseId', as: 'stocks' });

WarehouseStock.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(WarehouseStock,   { foreignKey: 'productId', as: 'stocks' });

WarehouseStock.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });
ProductVariant.hasMany(WarehouseStock, { foreignKey: 'variantId', as: 'stocks' });

// Cart ↔ Customer (hasOne)
Customer.hasOne(Cart,   { foreignKey: 'customerId', as: 'cart' });
Cart.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Cart.belongsTo(Coupon, { foreignKey: 'couponId', as: 'coupon' });

// CartItem ↔ Cart / Product
Cart.hasMany(CartItem,     { foreignKey: 'cartId', as: 'items' });
CartItem.belongsTo(Cart,   { foreignKey: 'cartId', as: 'cart' });
CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
CartItem.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });
ProductVariant.hasMany(CartItem, { foreignKey: 'variantId', as: 'cartItems' });

Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Order ↔ Customer / Affiliate / Coupon
Customer.hasMany(Order,  { foreignKey: 'customerId', as: 'orders' });
Order.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Order.belongsTo(Affiliate, { foreignKey: 'affiliateId', as: 'affiliate' });
Affiliate.hasMany(Order,   { foreignKey: 'affiliateId', as: 'orders' });

Order.belongsTo(Coupon,  { foreignKey: 'couponId', as: 'coupon' });
Coupon.hasMany(Order,    { foreignKey: 'couponId', as: 'orders' });

// OrderItem ↔ Order / Product
Order.hasMany(OrderItem,     { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order,   { foreignKey: 'orderId', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', constraints: false, as: 'product' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'variantId', constraints: false, as: 'variant' });
ProductVariant.hasMany(OrderItem, { foreignKey: 'variantId', constraints: false, as: 'orderItems' });

InventoryMovementLog.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
InventoryMovementLog.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });
InventoryMovementLog.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
InventoryMovementLog.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
InventoryMovementLog.belongsTo(Warehouse, { foreignKey: 'toWarehouseId', as: 'toWarehouse' });

// Wishlist ↔ Customer / Product / ProductVariant
Customer.hasMany(Wishlist,    { foreignKey: 'customerId', as: 'wishlists' });
Wishlist.belongsTo(Customer,  { foreignKey: 'customerId', as: 'customer' });
Wishlist.belongsTo(Product,   { foreignKey: 'productId', as: 'product' });
Product.hasMany(Wishlist,     { foreignKey: 'productId', as: 'wishlistedBy' });
Wishlist.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });
ProductVariant.hasMany(Wishlist,   { foreignKey: 'variantId', as: 'wishlists' });

// Review gates verified-purchase product feedback.
Product.hasMany(Review,     { foreignKey: 'productId', as: 'reviews' });
Review.belongsTo(Product,   { foreignKey: 'productId', as: 'product' });
Customer.hasMany(Review,    { foreignKey: 'customerId', as: 'reviews' });
Review.belongsTo(Customer,  { foreignKey: 'customerId', as: 'customer' });
Order.hasMany(Review,       { foreignKey: 'orderId', as: 'reviews' });
Review.belongsTo(Order,     { foreignKey: 'orderId', as: 'order' });

// Stock alerts queue Notify-Me emails when a SKU is restocked.
Product.hasMany(StockAlert,    { foreignKey: 'productId', as: 'stockAlerts' });
StockAlert.belongsTo(Product,  { foreignKey: 'productId', as: 'product' });
ProductVariant.hasMany(StockAlert, { foreignKey: 'variantId', as: 'stockAlerts' });
StockAlert.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });
Customer.hasMany(StockAlert,   { foreignKey: 'customerId', as: 'stockAlerts' });
StockAlert.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// LoyaltyLedger ↔ Customer / Order
Customer.hasMany(LoyaltyLedger,      { foreignKey: 'customerId', as: 'loyaltyLedger' });
LoyaltyLedger.belongsTo(Customer,   { foreignKey: 'customerId', as: 'customer' });
LoyaltyLedger.belongsTo(Order,      { foreignKey: 'orderId', as: 'order' });

// SupportTicket ↔ Customer / Order
Customer.hasMany(SupportTicket,    { foreignKey: 'customerId', as: 'tickets' });
SupportTicket.belongsTo(Customer,  { foreignKey: 'customerId', as: 'customer' });
SupportTicket.belongsTo(Order,     { foreignKey: 'orderId', as: 'order' });

// ── Exports ───────────────────────────────────────────────────────────────────
const DeliveryZone     = require('./DeliveryZone');
const ContactEnquiry   = require('./ContactEnquiry');

module.exports = {
  sequelize,
  Role, AdminUser, Customer,
  Category, SubCategory, SubSubCategory, Vendor, Product, ProductVariant,
  Warehouse, WarehouseStock,
  Cart, CartItem,
  Coupon, Affiliate,
  Order, OrderItem,
  Wishlist, LoyaltyLedger,
  SupportTicket, Banner,
  Review, StockAlert, MarketingMessage, SearchKeyword, TrendingCache, SiteSetting, InventoryMovementLog,
  DeliveryZone,
  ContactEnquiry,
};
