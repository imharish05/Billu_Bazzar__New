'use strict';
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Path to output Excel file
const outputFile = path.join(__dirname, '..', '..', 'Product_and_Variant_CRUD_API_Specification.xlsx');
const mainOutputFile = path.join(__dirname, '..', '..', 'API_Endpoints_Specification.xlsx');

async function generateExcel() {
  console.log('Generating Excel Spreadsheet for Product & Variant CRUD API Specification...');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Billu Bazaar Team';
  workbook.lastModifiedBy = 'Billu Bazaar AI Assistant';
  workbook.created = new Date();

  // Header style
  const headerStyle = {
    font: { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF1F4E79' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    }
  };

  const getMethodFill = (method) => {
    let color = 'FF595959';
    if (method === 'GET') color = 'FF2E75B6';
    if (method === 'POST') color = 'FF548235';
    if (method === 'PUT') color = 'FFC65911';
    if (method === 'PATCH') color = 'FF70AD47';
    if (method === 'DELETE') color = 'FFC00000';
    return {
      font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: color } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    };
  };

  const dataRowStyle = {
    font: { name: 'Arial', size: 10, color: { argb: 'FF333333' } },
    alignment: { vertical: 'top', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    }
  };

  const codeStyle = {
    font: { name: 'Consolas', size: 9.5, color: { argb: 'FF1E1E1E' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } },
    alignment: { vertical: 'top', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    }
  };

  // Setup Worksheet
  const sheet = workbook.addWorksheet('Product & Variant CRUD APIs');

  sheet.columns = [
    { header: 'S.No', key: 'sno', width: 6 },
    { header: 'Module', key: 'module', width: 14 },
    { header: 'Operation Name', key: 'name', width: 25 },
    { header: 'HTTP Method', key: 'method', width: 14 },
    { header: 'Endpoint Route', key: 'endpoint', width: 28 },
    { header: 'Authentication & Headers', key: 'auth', width: 32 },
    { header: 'Request Payload / Query / Params', key: 'request', width: 50 },
    { header: 'Response Payload (JSON)', key: 'response', width: 55 },
    { header: 'Remarks (Where & How It Is Used)', key: 'remarks', width: 55 }
  ];

  // Set Header Row formatting
  const headerRow = sheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });

  const apiEntries = [
    // ─── PRODUCT CRUD ───
    {
      sno: 1,
      module: 'Product CRUD',
      name: 'List Products (Filtered & Paginated)',
      method: 'GET',
      endpoint: '/api/products',
      auth: 'None (Public Access)',
      request: `Query Parameters (Optional):\n` +
`{\n` +
`  "page": 1,\n` +
`  "limit": 20,\n` +
`  "category": "sarees-and-lehengas", // Slug or ID\n` +
`  "search": "silk",\n` +
`  "minPrice": 500,\n` +
`  "maxPrice": 10000,\n` +
`  "sort": "createdAt",\n` +
`  "order": "DESC",\n` +
`  "featured": "true",\n` +
`  "newArrival": "true",\n` +
`  "bestSeller": "true",\n` +
`  "vendorId": 2,\n` +
`  "minDiscount": 10,\n` +
`  "maxDiscount": 50\n` +
`}`,
      response: `{\n` +
`  "success": true,\n` +
`  "products": [\n` +
`    {\n` +
`      "id": 1,\n` +
`      "name": "Kanjivaram Pure Silk Saree",\n` +
`      "slug": "kanjivaram-pure-silk-saree",\n` +
`      "sku": "KJN-SLK-001",\n` +
`      "price": 4999,\n` +
`      "comparePrice": 6999,\n` +
`      "stock": 45,\n` +
`      "isFeatured": true,\n` +
`      "isNewArrival": true,\n` +
`      "defaultProductImage": "/uploads/products/kanjivaram1.jpg",\n` +
`      "images": ["/uploads/products/kanjivaram1.jpg"],\n` +
`      "category": { "id": 1, "name": "Sarees & Lehengas", "slug": "sarees-and-lehengas" },\n` +
`      "subcategory": { "id": 4, "name": "Silk Sarees", "slug": "silk-sarees" },\n` +
`      "vendor": { "id": 2, "name": "Royal Weaves Co.", "logo": "/uploads/vendors/royal.jpg" },\n` +
`      "warehouse": { "id": 1, "name": "Central Warehouse" },\n` +
`      "variants": [\n` +
`        {\n` +
`          "id": 10,\n` +
`          "sku": "KJN-SLK-001-RED-M",\n` +
`          "price": 4999,\n` +
`          "mrp": 6999,\n` +
`          "stock": 20,\n` +
`          "attributes": { "Color": "Red", "Size": "M" },\n` +
`          "image": "/uploads/variants/red-m.jpg"\n` +
`        }\n` +
`      ]\n` +
`    }\n` +
`  ],\n` +
`  "total": 120,\n` +
`  "page": 1,\n` +
`  "totalPages": 6\n` +
`}`,
      remarks: `• Where Used: Storefront Catalog/Shop Page (/shop), Category Filter Pages, Search Results Page, and Admin Product List View (/admin/products).\n` +
`• How Used: Fetches paginated products with relational joins (Category, SubCategory, Vendor, Warehouse, Variants). Supports multi-faceted filtering by price, discount percentage, category slug/ID, seller vendor, and featured badges.`
    },
    {
      sno: 2,
      module: 'Product CRUD',
      name: 'Get Featured Products',
      method: 'GET',
      endpoint: '/api/products/featured',
      auth: 'None (Public Access)',
      request: `No Request Payload or Query Params required.`,
      response: `{\n` +
`  "success": true,\n` +
`  "products": [\n` +
`    {\n` +
`      "id": 1,\n` +
`      "name": "Kanjivaram Pure Silk Saree",\n` +
`      "slug": "kanjivaram-pure-silk-saree",\n` +
`      "price": 4999,\n` +
`      "comparePrice": 6999,\n` +
`      "defaultProductImage": "/uploads/products/kanjivaram1.jpg",\n` +
`      "category": { "name": "Sarees & Lehengas", "slug": "sarees-and-lehengas" }\n` +
`    }\n` +
`  ]\n` +
`}`,
      remarks: `• Where Used: Storefront Homepage (/) in the "Featured Collection" slider / section.\n` +
`• How Used: Retrieves top 12 active products flagged with isFeatured = true for quick promotional showcase.`
    },
    {
      sno: 3,
      module: 'Product CRUD',
      name: 'Live Search Products',
      method: 'GET',
      endpoint: '/api/products/search',
      auth: 'None (Public Access)',
      request: `Query Parameters:\n` +
`{\n` +
`  "q": "Silk Saree"\n` +
`}`,
      response: `{\n` +
`  "success": true,\n` +
`  "products": [\n` +
`    {\n` +
`      "id": 1,\n` +
`      "name": "Kanjivaram Pure Silk Saree",\n` +
`      "slug": "kanjivaram-pure-silk-saree",\n` +
`      "price": 4999,\n` +
`      "discountPercent": 28,\n` +
`      "images": ["/uploads/products/kanjivaram1.jpg"]\n` +
`    }\n` +
`  ]\n` +
`}`,
      remarks: `• Where Used: Storefront Header Navigation Search Bar.\n` +
`• How Used: Executes lightweight title string matching (Op.like) returning top 8 candidate products for instant live preview dropdown as user types.`
    },
    {
      sno: 4,
      module: 'Product CRUD',
      name: 'Get Product Price Range',
      method: 'GET',
      endpoint: '/api/products/price-range',
      auth: 'None (Public Access)',
      request: `No Request Payload required.`,
      response: `{\n` +
`  "success": true,\n` +
`  "minPrice": 299,\n` +
`  "maxPrice": 75000\n` +
`}`,
      remarks: `• Where Used: Storefront Catalog Shop Page (/shop) Filter Sidebar.\n` +
`• How Used: Runs direct SQL aggregate query (MIN(price), MAX(price)) across active products to dynamically set the boundaries of min/max price range sliders.`
    },
    {
      sno: 5,
      module: 'Product CRUD',
      name: 'Get Product Details by Slug',
      method: 'GET',
      endpoint: '/api/products/:slug',
      auth: 'None (Public Access)',
      request: `URL Parameter:\n` +
`:slug = "kanjivaram-pure-silk-saree"`,
      response: `{\n` +
`  "success": true,\n` +
`  "product": {\n` +
`    "id": 1,\n` +
`    "name": "Kanjivaram Pure Silk Saree",\n` +
`    "slug": "kanjivaram-pure-silk-saree",\n` +
`    "sku": "KJN-SLK-001",\n` +
`    "price": 4999,\n` +
`    "comparePrice": 6999,\n` +
`    "stock": 45,\n` +
`    "weight": 1.2,\n` +
`    "dimensions": { "length": 5.5, "width": 1.2, "unit": "meters" },\n` +
`    "isFeatured": true,\n` +
`    "isNewArrival": true,\n` +
`    "showAuthenticity": true,\n` +
`    "has360View": true,\n` +
`    "hasVideo": true,\n` +
`    "videoUrl": "/uploads/videos/kanjivaram.mp4",\n` +
`    "images": ["/uploads/products/kanjivaram1.jpg", "/uploads/products/kanjivaram2.jpg"],\n` +
`    "spin_images": ["/uploads/spin/frame_01.jpg", "/uploads/spin/frame_02.jpg"],\n` +
`    "spin_frames": 36,\n` +
`    "tags": ["silk", "wedding"],\n` +
`    "attributes": { "Fabric": "Silk", "Occasion": "Wedding" },\n` +
`    "category": { "id": 1, "name": "Sarees & Lehengas", "slug": "sarees-and-lehengas" },\n` +
`    "subcategory": { "id": 4, "name": "Silk Sarees", "slug": "silk-sarees" },\n` +
`    "vendor": { "id": 2, "name": "Royal Weaves Co.", "rating": 4.8 },\n` +
`    "warehouse": { "id": 1, "name": "Central Warehouse" },\n` +
`    "variants": [\n` +
`      {\n` +
`        "id": 10,\n` +
`        "sku": "KJN-SLK-001-RED-M",\n` +
`        "price": 4999,\n` +
`        "mrp": 6999,\n` +
`        "stock": 20,\n` +
`        "attributes": { "Color": "Red", "Size": "M" },\n` +
`        "image": "/uploads/variants/red-m.jpg",\n` +
`        "images": ["/uploads/variants/red-m.jpg"],\n` +
`        "warehouseId": 1\n` +
`      }\n` +
`    ]\n` +
`  }\n` +
`}`,
      remarks: `• Where Used: Storefront Product Detail Page (PDP) (/product/:slug) & Quick View Modal.\n` +
`• How Used: Loads full product metadata including gallery images, 360-spin frame sequence, video url, vendor details, and full variant array to render size/color attribute selectors.`
    },
    {
      sno: 6,
      module: 'Product CRUD',
      name: 'Create Product (Admin)',
      method: 'POST',
      endpoint: '/api/products',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>\nContent-Type: multipart/form-data',
      request: `Form-Data Text Fields:\n` +
`productName: "Emerald Silk Kaftan"\n` +
`sku: "EMR-SK-01"\n` +
`price: "3999"\n` +
`comparePrice: "5999"\n` +
`stock: "50"\n` +
`weight: "0.8"\n` +
`dimensions: "{\\"length\\": 40, \\"width\\": 30}"\n` +
`categoryId: "1"\n` +
`subCategoryId: "4"\n` +
`vendorId: "2"\n` +
`warehouseId: "1"\n` +
`isFeatured: "true"\n` +
`isNewArrival: "true"\n` +
`showAuthenticity: "true"\n` +
`has360View: "true"\n` +
`tags: "[\\"kaftan\\", \\"silk\\"]"\n` +
`attributes: "{\\"Fabric\\": \\"Silk\\"}"\n` +
`variants: "[{\\"sku\\": \\"EMR-SK-01-GRN\\", \\"price\\": 3999, \\"mrp\\": 5999, \\"stock\\": 50, \\"attributes\\": {\\"Color\\": \\"Emerald\\"}, \\"warehouseId\\": 1}]"\n\n` +
`Form-Data File Fields:\n` +
`• images: [binary file(s)]\n` +
`• defaultProductImage: [binary file]\n` +
`• spin_images: [360 spin frame files]\n` +
`• video: [video file]\n` +
`• variantGallery_0: [files for variant 0]`,
      response: `{\n` +
`  "success": true,\n` +
`  "product": {\n` +
`    "id": 15,\n` +
`    "name": "Emerald Silk Kaftan",\n` +
`    "slug": "emerald-silk-kaftan",\n` +
`    "sku": "EMR-SK-01",\n` +
`    "price": 3999,\n` +
`    "comparePrice": 5999,\n` +
`    "stock": 50,\n` +
`    "defaultProductImage": "/uploads/products/emerald.jpg",\n` +
`    "images": ["/uploads/products/emerald.jpg"],\n` +
`    "variants": [\n` +
`      {\n` +
`        "id": 42,\n` +
`        "sku": "EMR-SK-01-GRN",\n` +
`        "price": 3999,\n` +
`        "stock": 50,\n` +
`        "attributes": { "Color": "Emerald" }\n` +
`      }\n` +
`    ]\n` +
`  }\n` +
`}`,
      remarks: `• Where Used: Admin Panel Product Management (/admin/products -> "Add New Product" Modal/Form).\n` +
`• How Used: Creates new product entry, processes file uploads, materializes 360-spin frame sequence metadata, creates default or custom variants, and initializes fulfillment warehouse stock records.`
    },
    {
      sno: 7,
      module: 'Product CRUD',
      name: 'Update Product (Admin)',
      method: 'PUT',
      endpoint: '/api/products/:id',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>\nContent-Type: multipart/form-data',
      request: `URL Parameter:\n` +
`:id = 15\n\n` +
`Form-Data Text Fields:\n` +
`name: "Emerald Silk Kaftan (Updated)"\n` +
`price: "3499"\n` +
`comparePrice: "5999"\n` +
`stock: "60"\n` +
`existingImages: "[\\"/uploads/products/emerald.jpg\\"]"\n` +
`existingSpinImages: "[\\"/uploads/spin/frame1.jpg\\"]"\n` +
`variants: "[{\\"id\\": 42, \\"sku\\": \\"EMR-SK-01-GRN\\", \\"price\\": 3499, \\"stock\\": 60, \\"attributes\\": {\\"Color\\": \\"Emerald\\"}}]" \n\n` +
`Form-Data File Fields (Optional):\n` +
`• images: [new binary file(s)]\n` +
`• spin_images: [new frame files]`,
      response: `{\n` +
`  "success": true,\n` +
`  "product": {\n` +
`    "id": 15,\n` +
`    "name": "Emerald Silk Kaftan (Updated)",\n` +
`    "price": 3499,\n` +
`    "stock": 60,\n` +
`    "variants": [...]\n` +
`  }\n` +
`}`,
      remarks: `• Where Used: Admin Panel Product Manager (/admin/products -> "Edit Product" Modal/Form).\n` +
`• How Used: Modifies product fields, handles addition of new images while deleting removed local files, updates or creates nested variants, and syncs warehouse inventory.`
    },
    {
      sno: 8,
      module: 'Product CRUD',
      name: 'Delete Product (Admin)',
      method: 'DELETE',
      endpoint: '/api/products/:id',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>',
      request: `URL Parameter:\n` +
`:id = 15`,
      response: `{\n` +
`  "success": true,\n` +
`  "message": "Product deleted successfully"\n` +
`}`,
      remarks: `• Where Used: Admin Panel Product Management Table (/admin/products -> "Delete Product" Button).\n` +
`• How Used: Performs SQL Transaction cascade delete purging Product, ProductVariants, WarehouseStock, CartItems, Wishlists, Reviews, StockAlerts, OrderItems, InventoryMovementLogs, and unlinks/deletes stored media files from disk.`
    },

    // ─── VARIANT CRUD ───
    {
      sno: 9,
      module: 'Variant CRUD',
      name: 'List All Variants (Admin)',
      method: 'GET',
      endpoint: '/api/variants',
      auth: 'None (or Admin)',
      request: `No Request Payload required.`,
      response: `{\n` +
`  "success": true,\n` +
`  "variants": [\n` +
`    {\n` +
`      "id": 10,\n` +
`      "productId": 1,\n` +
`      "sku": "KJN-SLK-001-RED-M",\n` +
`      "price": 4999,\n` +
`      "mrp": 6999,\n` +
`      "stock": 20,\n` +
`      "attributes": { "Color": "Red", "Size": "M" },\n` +
`      "image": "/uploads/variants/red-m.jpg",\n` +
`      "images": ["/uploads/variants/red-m.jpg"],\n` +
`      "warehouseId": 1,\n` +
`      "product": { "id": 1, "name": "Kanjivaram Pure Silk Saree", "slug": "kanjivaram-pure-silk-saree" },\n` +
`      "warehouse": { "id": 1, "name": "Central Warehouse" }\n` +
`    }\n` +
`  ]\n` +
`}`,
      remarks: `• Where Used: Admin Panel Variant Management Page (/admin/variants).\n` +
`• How Used: Fetches global variant list ordered by creation date with associated Parent Product and Warehouse info for storewide stock/SKU oversight.`
    },
    {
      sno: 10,
      module: 'Variant CRUD',
      name: 'Get Variants by Product ID',
      method: 'GET',
      endpoint: '/api/variants/product/:productId',
      auth: 'None (Public Access)',
      request: `URL Parameter:\n` +
`:productId = 1`,
      response: `{\n` +
`  "success": true,\n` +
`  "variants": [\n` +
`    {\n` +
`      "id": 10,\n` +
`      "productId": 1,\n` +
`      "sku": "KJN-SLK-001-RED-M",\n` +
`      "price": 4999,\n` +
`      "mrp": 6999,\n` +
`      "stock": 20,\n` +
`      "attributes": { "Color": "Red", "Size": "M" },\n` +
`      "image": "/uploads/variants/red-m.jpg",\n` +
`      "images": ["/uploads/variants/red-m.jpg"]\n` +
`    },\n` +
`    {\n` +
`      "id": 11,\n` +
`      "productId": 1,\n` +
`      "sku": "KJN-SLK-001-BLU-L",\n` +
`      "price": 5299,\n` +
`      "mrp": 7299,\n` +
`      "stock": 15,\n` +
`      "attributes": { "Color": "Blue", "Size": "L" },\n` +
`      "image": "/uploads/variants/blue-l.jpg",\n` +
`      "images": ["/uploads/variants/blue-l.jpg"]\n` +
`    }\n` +
`  ]\n` +
`}`,
      remarks: `• Where Used: Storefront Product Details Page (PDP) & Quick View Modal.\n` +
`• How Used: Retrieves specific product variants when customer interacts with variant options (Size, Color, Weight) to dynamically reflect selected variant pricing, SKU, image, and stock availability.`
    },
    {
      sno: 11,
      module: 'Variant CRUD',
      name: 'Add Variant to Product (Admin)',
      method: 'POST',
      endpoint: '/api/variants/add',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>\nContent-Type: multipart/form-data / application/json',
      request: `Body / Form-Data Fields:\n` +
`productId: 1 (Required)\n` +
`sku: "KJN-SLK-001-GRN-XL" (Optional, auto-generated if omitted)\n` +
`price: 5499\n` +
`mrp: 7499\n` +
`stock: 25\n` +
`lowStockThreshold: 10\n` +
`gstRate: "18%"\n` +
`attributes: "{\\"Color\\": \\"Green\\", \\"Size\\": \\"XL\\"}" (JSON or Object)\n` +
`warehouseId: 1\n` +
`existingImages: "[]"\n\n` +
`File Upload Fields (Optional):\n` +
`• files: [variant gallery image files]`,
      response: `{\n` +
`  "success": true,\n` +
`  "variant": {\n` +
`    "id": 12,\n` +
`    "productId": 1,\n` +
`    "sku": "KJN-SLK-001-GRN-XL",\n` +
`    "price": 5499,\n` +
`    "mrp": 7499,\n` +
`    "stock": 25,\n` +
`    "lowStockThreshold": 10,\n` +
`    "gstRate": "18%",\n` +
`    "attributes": { "Color": "Green", "Size": "XL" },\n` +
`    "image": "/uploads/variants/green-xl.jpg",\n` +
`    "images": ["/uploads/variants/green-xl.jpg"],\n` +
`    "warehouseId": 1\n` +
`  }\n` +
`}`,
      remarks: `• Where Used: Admin Panel Variants Page (/admin/variants -> "Add Variant" Modal).\n` +
`• How Used: Adds a new SKU variant to an existing product. Validates duplicate attribute combinations, uploads images, syncs initial warehouse stock entry, logs inventory movement, and recalculates parent product minimum price and total stock.`
    },
    {
      sno: 12,
      module: 'Variant CRUD',
      name: 'Update Variant (Admin)',
      method: 'PUT',
      endpoint: '/api/variants/update/:id',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>\nContent-Type: multipart/form-data / application/json',
      request: `URL Parameter:\n` +
`:id = 12\n\n` +
`Body / Form-Data Fields:\n` +
`sku: "KJN-SLK-001-GRN-XL"\n` +
`price: 4999\n` +
`mrp: 7499\n` +
`stock: 30\n` +
`lowStockThreshold: 10\n` +
`gstRate: "18%"\n` +
`attributes: "{\\"Color\\": \\"Green\\", \\"Size\\": \\"XL\\"}"\n` +
`warehouseId: 1\n` +
`existingImages: "[\\"/uploads/variants/green-xl.jpg\\"]"\n\n` +
`File Upload Fields (Optional):\n` +
`• files: [new variant gallery image files]`,
      response: `{\n` +
`  "success": true,\n` +
`  "variant": {\n` +
`    "id": 12,\n` +
`    "productId": 1,\n` +
`    "sku": "KJN-SLK-001-GRN-XL",\n` +
`    "price": 4999,\n` +
`    "mrp": 7499,\n` +
`    "stock": 30,\n` +
`    "attributes": { "Color": "Green", "Size": "XL" },\n` +
`    "image": "/uploads/variants/green-xl.jpg",\n` +
`    "images": ["/uploads/variants/green-xl.jpg"],\n` +
`    "warehouseId": 1\n` +
`  }\n` +
`}`,
      remarks: `• Where Used: Admin Panel Variants Page (/admin/variants -> "Edit Variant" Modal).\n` +
`• How Used: Updates variant attributes, pricing, MRP, stock quantity, images, or assigned warehouse. Triggers warehouse stock sync and auto-recalculates parent product aggregated stock and price.`
    },
    {
      sno: 13,
      module: 'Variant CRUD',
      name: 'Delete Variant (Admin)',
      method: 'DELETE',
      endpoint: '/api/variants/:id',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>',
      request: `URL Parameter:\n` +
`:id = 12`,
      response: `{\n` +
`  "success": true,\n` +
`  "message": "Variant deleted successfully"\n` +
`}`,
      remarks: `• Where Used: Admin Panel Variants Page (/admin/variants -> "Delete Variant" Action).\n` +
`• How Used: Deletes specified variant, removes associated warehouse stock entries, and triggers a sync on the parent product to update lowest price and remaining total stock.`
    }
  ];

  // Add rows
  apiEntries.forEach((entry) => {
    const row = sheet.addRow(entry);
    row.height = 140; // Adequate height for JSON previews

    row.getCell('sno').style = dataRowStyle;
    row.getCell('sno').alignment = { vertical: 'top', horizontal: 'center' };
    
    row.getCell('module').style = dataRowStyle;
    row.getCell('module').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F4E79' } };
    
    row.getCell('name').style = dataRowStyle;
    row.getCell('name').font = { name: 'Arial', size: 10, bold: true };
    
    row.getCell('method').style = getMethodFill(entry.method);
    
    row.getCell('endpoint').style = codeStyle;
    row.getCell('endpoint').font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: 'FF003366' } };

    row.getCell('auth').style = dataRowStyle;
    row.getCell('request').style = codeStyle;
    row.getCell('response').style = codeStyle;
    row.getCell('remarks').style = dataRowStyle;
  });

  // Save Excel file
  await workbook.xlsx.writeFile(outputFile);
  console.log(`✅ Dedicated Excel Generated Successfully: ${outputFile}`);

  // Also update API_Endpoints_Specification.xlsx if needed
  try {
    let mainWorkbook;
    if (fs.existsSync(mainOutputFile)) {
      mainWorkbook = new ExcelJS.Workbook();
      await mainWorkbook.xlsx.readFile(mainOutputFile);
      console.log(`Loaded existing ${mainOutputFile}`);
    } else {
      mainWorkbook = new ExcelJS.Workbook();
    }

    // Check if sheet exists
    let pvSheet = mainWorkbook.getWorksheet('Product & Variant CRUD');
    if (pvSheet) {
      mainWorkbook.removeWorksheet(pvSheet.id);
    }
    pvSheet = mainWorkbook.addWorksheet('Product & Variant CRUD');

    pvSheet.columns = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'Module', key: 'module', width: 14 },
      { header: 'Operation Name', key: 'name', width: 25 },
      { header: 'HTTP Method', key: 'method', width: 14 },
      { header: 'Endpoint Route', key: 'endpoint', width: 28 },
      { header: 'Authentication & Headers', key: 'auth', width: 32 },
      { header: 'Request Payload / Query / Params', key: 'request', width: 50 },
      { header: 'Response Payload (JSON)', key: 'response', width: 55 },
      { header: 'Remarks (Where & How It Is Used)', key: 'remarks', width: 55 }
    ];

    const hRow = pvSheet.getRow(1);
    hRow.height = 30;
    hRow.eachCell((cell) => { cell.style = headerStyle; });

    apiEntries.forEach((entry) => {
      const row = pvSheet.addRow(entry);
      row.height = 140;

      row.getCell('sno').style = dataRowStyle;
      row.getCell('sno').alignment = { vertical: 'top', horizontal: 'center' };
      row.getCell('module').style = dataRowStyle;
      row.getCell('module').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F4E79' } };
      row.getCell('name').style = dataRowStyle;
      row.getCell('name').font = { name: 'Arial', size: 10, bold: true };
      row.getCell('method').style = getMethodFill(entry.method);
      row.getCell('endpoint').style = codeStyle;
      row.getCell('endpoint').font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: 'FF003366' } };
      row.getCell('auth').style = dataRowStyle;
      row.getCell('request').style = codeStyle;
      row.getCell('response').style = codeStyle;
      row.getCell('remarks').style = dataRowStyle;
    });

    await mainWorkbook.xlsx.writeFile(mainOutputFile);
    console.log(`✅ Main Excel Specification Updated Successfully: ${mainOutputFile}`);
  } catch (err) {
    console.error('Error updating main Excel file:', err.message);
  }
}

generateExcel().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
