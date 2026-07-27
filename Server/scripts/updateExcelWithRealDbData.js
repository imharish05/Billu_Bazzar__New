'use strict';
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { Product, ProductVariant, Category, SubCategory, SubSubCategory, Vendor, Warehouse } = require('../models');
const sequelize = require('../config/db');

// Path to output Excel files
const outputFile = path.join(__dirname, '..', '..', 'Product_and_Variant_CRUD_API_Specification.xlsx');
const mainOutputFile = path.join(__dirname, '..', '..', 'API_Endpoints_Specification.xlsx');

async function generateRealDbExcel() {
  await sequelize.authenticate();
  console.log('✅ Database connected to extract real product & variant data...');

  // Fetch real products with associations
  const realProducts = await Product.findAll({
    where: { isActive: true },
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      { model: SubCategory, as: 'subcategory', attributes: ['id', 'name', 'slug'] },
      { model: SubSubCategory, as: 'subsubcategory', attributes: ['id', 'name', 'slug'] },
      { model: Vendor, as: 'vendor', attributes: ['id', 'name', 'logo'] },
      { model: Warehouse, as: 'warehouse', attributes: ['id', 'name'] },
      { model: ProductVariant, as: 'variants', attributes: ['id', 'sku', 'price', 'mrp', 'stock', 'attributes', 'image', 'images', 'warehouseId', 'lowStockThreshold', 'gstRate'], include: [{ model: Warehouse, as: 'warehouse', attributes: ['id', 'name'] }] }
    ]
  });

  const sonyProduct = realProducts.find(p => p.id === 33) || realProducts[0];
  const airpodsProduct = realProducts.find(p => p.id === 34) || realProducts[1] || realProducts[0];
  const macbookProduct = realProducts.find(p => p.id === 35) || realProducts[2] || realProducts[0];

  const featuredProducts = realProducts.filter(p => p.isFeatured);

  // Fetch real variants with associations
  const realVariants = await ProductVariant.findAll({
    include: [
      { model: Product, as: 'product', attributes: ['id', 'name', 'slug'] },
      { model: Warehouse, as: 'warehouse', attributes: ['id', 'name'] }
    ]
  });

  const variant9 = realVariants.find(v => v.id === 9) || realVariants[0];
  const variant10 = realVariants.find(v => v.id === 10) || realVariants[1] || realVariants[0];

  const cleanJSON = (obj) => JSON.stringify(obj, null, 2);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Billu Bazaar Team';
  workbook.lastModifiedBy = 'Billu Bazaar AI Assistant';
  workbook.created = new Date();

  // Styles
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

  // Build Real DB Entries
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
cleanJSON({
  page: 1,
  limit: 20,
  search: "Sony",
  sort: "createdAt",
  order: "DESC",
  featured: "true"
}),
      response: cleanJSON({
        success: true,
        products: [sonyProduct, airpodsProduct],
        total: realProducts.length,
        page: 1,
        totalPages: 1
      }),
      remarks: `• Where Used: Storefront Catalog/Shop Page (/shop), Category Filter Pages, Search Listing, and Admin Product List View (/admin/products).\n` +
`• How Used: Fetches paginated products with relational joins (Category, SubCategory, Vendor, Warehouse, Variants). Supports multi-faceted filtering by price, category slug/ID, seller vendor, and featured flags.`
    },
    {
      sno: 2,
      module: 'Product CRUD',
      name: 'Get Featured Products',
      method: 'GET',
      endpoint: '/api/products/featured',
      auth: 'None (Public Access)',
      request: `No Request Payload or Query Params required.`,
      response: cleanJSON({
        success: true,
        products: featuredProducts.length ? featuredProducts : [sonyProduct]
      }),
      remarks: `• Where Used: Storefront Homepage (/) in the "Featured Collection" slider / section.\n` +
`• How Used: Retrieves active products from DB flagged with isFeatured = true for promotional homepage showcase.`
    },
    {
      sno: 3,
      module: 'Product CRUD',
      name: 'Live Search Products',
      method: 'GET',
      endpoint: '/api/products/search',
      auth: 'None (Public Access)',
      request: `Query Parameters:\n` +
cleanJSON({
  q: "Sony WH-1000XM5"
}),
      response: cleanJSON({
        success: true,
        products: [
          {
            id: sonyProduct.id,
            name: sonyProduct.name,
            slug: sonyProduct.slug,
            price: sonyProduct.price,
            images: sonyProduct.images,
            discountPercent: sonyProduct.discountPercent || 0
          }
        ]
      }),
      remarks: `• Where Used: Storefront Header Navigation Search Bar.\n` +
`• How Used: Executes title string search (Op.like) returning candidate DB products for real-time live preview dropdown.`
    },
    {
      sno: 4,
      module: 'Product CRUD',
      name: 'Get Product Price Range',
      method: 'GET',
      endpoint: '/api/products/price-range',
      auth: 'None (Public Access)',
      request: `No Request Payload required.`,
      response: cleanJSON({
        success: true,
        minPrice: 450,
        maxPrice: 45000
      }),
      remarks: `• Where Used: Storefront Catalog Shop Page (/shop) Filter Sidebar.\n` +
`• How Used: Runs direct aggregate SQL query (MIN(price), MAX(price)) on active DB products to dynamically set the price slider range.`
    },
    {
      sno: 5,
      module: 'Product CRUD',
      name: 'Get Product Details by Slug',
      method: 'GET',
      endpoint: '/api/products/:slug',
      auth: 'None (Public Access)',
      request: `URL Parameter:\n:slug = "${sonyProduct.slug}"`,
      response: cleanJSON({
        success: true,
        product: sonyProduct
      }),
      remarks: `• Where Used: Storefront Product Detail Page (PDP) (/product/:slug) & Quick View Modal.\n` +
`• How Used: Loads full product metadata from DB including description, images, 360-spin frame sequence, video URL, vendor, warehouse, and associated variants for customer selection.`
    },
    {
      sno: 6,
      module: 'Product CRUD',
      name: 'Create Product (Admin)',
      method: 'POST',
      endpoint: '/api/products',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>\nContent-Type: multipart/form-data',
      request: `Form-Data Text Fields (Exact Admin Form Fields):\n` +
`productName / name: "${sonyProduct.name}"\n` +
`sku: "${sonyProduct.sku}"\n` +
`price: "${sonyProduct.price}"\n` +
`comparePrice: "${sonyProduct.comparePrice || ''}"\n` +
`stock: "${sonyProduct.stock}"\n` +
`weight: "${sonyProduct.weight || '25.00'}"\n` +
`dimensions: '${JSON.stringify(sonyProduct.dimensions)}'\n` +
`categoryId: "${sonyProduct.categoryId || '1'}"\n` +
`subCategoryId: "${sonyProduct.subCategoryId || '1'}"\n` +
`subSubCategoryId: "${sonyProduct.subSubCategoryId || '1'}"\n` +
`vendorId: "${sonyProduct.vendorId || '8'}"\n` +
`warehouseId: "${sonyProduct.warehouseId || '1'}"\n` +
`isFeatured: "${sonyProduct.isFeatured}"\n` +
`isNewArrival: "${sonyProduct.isNewArrival}"\n` +
`isBestSeller: "${sonyProduct.isBestSeller}"\n` +
`isActive: "${sonyProduct.isActive}"\n` +
`showAuthenticity: "${sonyProduct.showAuthenticity}"\n` +
`has360View: "${sonyProduct.has360View}"\n` +
`hasVideo: "${sonyProduct.hasVideo}"\n` +
`videoUrl: "${sonyProduct.videoUrl || ''}"\n` +
`tags: '${JSON.stringify(sonyProduct.tags || [])}'\n` +
`attributes: '${JSON.stringify(sonyProduct.attributes || {})}'\n` +
`variants: '${JSON.stringify((sonyProduct.variants || []).map(v => ({
  sku: v.sku, price: v.price, mrp: v.mrp, stock: v.stock, lowStockThreshold: v.lowStockThreshold, gstRate: v.gstRate, attributes: v.attributes, warehouseId: v.warehouseId
})))}'\n\n` +
`Form-Data File Fields:\n` +
`• images: [binary product gallery files]\n` +
`• defaultProductImage: [binary default thumbnail file]\n` +
`• spin_images: [binary 360 spin frame files]\n` +
`• video: [binary video clip file]\n` +
`• variantGallery_0: [gallery files for variant 0]`,
      response: cleanJSON({
        success: true,
        product: sonyProduct
      }),
      remarks: `• Where Used: Admin Panel Product Management (/admin/products -> "Add New Product" Modal/Form).\n` +
`• How Used: Inserts product into DB, uploads images, materializes 360-spin frame sequence metadata, creates SKU variants, and initializes warehouse stock entries.`
    },
    {
      sno: 7,
      module: 'Product CRUD',
      name: 'Update Product (Admin)',
      method: 'PUT',
      endpoint: '/api/products/:id',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>\nContent-Type: multipart/form-data',
      request: `URL Parameter:\n:id = ${sonyProduct.id}\n\n` +
`Form-Data Text Fields (Exact Admin Form Fields):\n` +
`productName / name: "${sonyProduct.name}"\n` +
`price: "${sonyProduct.price}"\n` +
`stock: "${sonyProduct.stock}"\n` +
`existingImages: '${JSON.stringify(sonyProduct.images || [])}'\n` +
`existingSpinImages: '${JSON.stringify(sonyProduct.spin_images || [])}'\n` +
`variants: '${JSON.stringify((sonyProduct.variants || []).map(v => ({
  id: v.id, sku: v.sku, price: v.price, mrp: v.mrp, stock: v.stock, lowStockThreshold: v.lowStockThreshold, gstRate: v.gstRate, attributes: v.attributes, warehouseId: v.warehouseId
})))}'\n\n` +
`Form-Data File Fields (Optional):\n` +
`• images: [new product gallery image files]\n` +
`• spin_images: [new 360 spin frame files]`,
      response: cleanJSON({
        success: true,
        product: sonyProduct
      }),
      remarks: `• Where Used: Admin Panel Product Manager (/admin/products -> "Edit Product" Modal/Form).\n` +
`• How Used: Updates product DB fields, deletes unselected local image files, updates or creates nested variants, and syncs warehouse stock.`
    },
    {
      sno: 8,
      module: 'Product CRUD',
      name: 'Delete Product (Admin)',
      method: 'DELETE',
      endpoint: '/api/products/:id',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>',
      request: `URL Parameter:\n:id = ${sonyProduct.id}`,
      response: cleanJSON({
        success: true,
        message: "Product deleted successfully"
      }),
      remarks: `• Where Used: Admin Panel Product Management Table (/admin/products -> "Delete Product" Button).\n` +
`• How Used: Executes a database transaction to cascade purge Product, ProductVariants, WarehouseStock, CartItems, Wishlists, Reviews, StockAlerts, OrderItems, InventoryLogs, and unlinks media files from disk.`
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
      response: cleanJSON({
        success: true,
        variants: [variant9, variant10]
      }),
      remarks: `• Where Used: Admin Panel Variant Management Page (/admin/variants).\n` +
`• How Used: Fetches real variant records from DB with joined Parent Product and Warehouse details for global SKU inventory control.`
    },
    {
      sno: 10,
      module: 'Variant CRUD',
      name: 'Get Variants by Product ID',
      method: 'GET',
      endpoint: '/api/variants/product/:productId',
      auth: 'None (Public Access)',
      request: `URL Parameter:\n:productId = ${sonyProduct.id}`,
      response: cleanJSON({
        success: true,
        variants: [variant9, variant10]
      }),
      remarks: `• Where Used: Storefront Product Details Page (PDP) & Quick View Modal.\n` +
`• How Used: Retrieves real DB variants for a specific product ID so customers can select variant options (Color, Size) and view updated price, SKU, and stock.`
    },
    {
      sno: 11,
      module: 'Variant CRUD',
      name: 'Add Variant to Product (Admin)',
      method: 'POST',
      endpoint: '/api/variants/add',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>\nContent-Type: multipart/form-data / application/json',
      request: `Body / Form-Data Fields (Exact Admin Form Fields):\n` +
cleanJSON({
  productId: sonyProduct.id,
  sku: variant9.sku,
  price: parseFloat(variant9.price),
  mrp: parseFloat(variant9.mrp || variant9.price),
  stock: variant9.stock,
  lowStockThreshold: variant9.lowStockThreshold || 10,
  gstRate: variant9.gstRate || "18%",
  attributes: variant9.attributes,
  warehouseId: variant9.warehouseId,
  existingImages: variant9.images || []
}),
      response: cleanJSON({
        success: true,
        variant: variant9
      }),
      remarks: `• Where Used: Admin Panel Variants Page (/admin/variants -> "Add Variant" Modal).\n` +
`• How Used: Creates a new variant in DB, validates duplicate attribute combinations, initializes warehouse stock record, logs inventory movement, and recalculates parent product price & aggregated stock.`
    },
    {
      sno: 12,
      module: 'Variant CRUD',
      name: 'Update Variant (Admin)',
      method: 'PUT',
      endpoint: '/api/variants/update/:id',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>\nContent-Type: multipart/form-data / application/json',
      request: `URL Parameter:\n:id = ${variant9.id}\n\nBody / Form-Data Fields (Exact Admin Form Fields):\n` +
cleanJSON({
  sku: variant9.sku,
  price: parseFloat(variant9.price),
  mrp: parseFloat(variant9.mrp || variant9.price),
  stock: variant9.stock,
  lowStockThreshold: variant9.lowStockThreshold || 10,
  gstRate: variant9.gstRate || "18%",
  attributes: variant9.attributes,
  warehouseId: variant9.warehouseId,
  existingImages: variant9.images || []
}),
      response: cleanJSON({
        success: true,
        variant: variant9
      }),
      remarks: `• Where Used: Admin Panel Variants Page (/admin/variants -> "Edit Variant" Modal).\n` +
`• How Used: Updates variant fields in DB, synchronizes warehouse inventory level, and recalculates parent product stock & price.`
    },
    {
      sno: 13,
      module: 'Variant CRUD',
      name: 'Delete Variant (Admin)',
      method: 'DELETE',
      endpoint: '/api/variants/:id',
      auth: 'Header: Authorization: Bearer <admin_jwt_token>',
      request: `URL Parameter:\n:id = ${variant9.id}`,
      response: cleanJSON({
        success: true,
        message: "Variant deleted successfully"
      }),
      remarks: `• Where Used: Admin Panel Variants Page (/admin/variants -> "Delete Variant" Action).\n` +
`• How Used: Deletes specified variant from DB, purges linked warehouse stock entries, and triggers a sync on the parent product to update remaining total stock and lowest price.`
    }
  ];

  // Write to Excel
  const setupSheet = (sheet) => {
    sheet.columns = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'Module', key: 'module', width: 14 },
      { header: 'Operation Name', key: 'name', width: 25 },
      { header: 'HTTP Method', key: 'method', width: 14 },
      { header: 'Endpoint Route', key: 'endpoint', width: 28 },
      { header: 'Authentication & Headers', key: 'auth', width: 32 },
      { header: 'Request Payload / Query / Params', key: 'request', width: 52 },
      { header: 'Response Payload (Real DB JSON)', key: 'response', width: 55 },
      { header: 'Remarks (Where & How It Is Used)', key: 'remarks', width: 55 }
    ];

    const hRow = sheet.getRow(1);
    hRow.height = 30;
    hRow.eachCell((cell) => { cell.style = headerStyle; });

    apiEntries.forEach((entry) => {
      const row = sheet.addRow(entry);
      row.height = 160;

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
  };

  // Generate dedicated Excel sheet
  const sheet1 = workbook.addWorksheet('Product & Variant CRUD');
  setupSheet(sheet1);
  await workbook.xlsx.writeFile(outputFile);
  console.log(`✅ Real DB Data Excel Generated: ${outputFile}`);

  // Also update main API_Endpoints_Specification.xlsx
  try {
    let mainWorkbook;
    if (fs.existsSync(mainOutputFile)) {
      mainWorkbook = new ExcelJS.Workbook();
      await mainWorkbook.xlsx.readFile(mainOutputFile);
    } else {
      mainWorkbook = new ExcelJS.Workbook();
    }

    let pvSheet = mainWorkbook.getWorksheet('Product & Variant CRUD');
    if (pvSheet) {
      mainWorkbook.removeWorksheet(pvSheet.id);
    }
    pvSheet = mainWorkbook.addWorksheet('Product & Variant CRUD');
    setupSheet(pvSheet);

    await mainWorkbook.xlsx.writeFile(mainOutputFile);
    console.log(`✅ Main Excel Specification Updated with Real DB Data: ${mainOutputFile}`);
  } catch (err) {
    console.error('Error updating main Excel:', err.message);
  }

  process.exit(0);
}

generateRealDbExcel().catch(err => {
  console.error(err);
  process.exit(1);
});
