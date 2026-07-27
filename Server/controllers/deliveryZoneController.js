'use strict';

const { DeliveryZone } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

/**
 * Get paginated list of delivery zones & pincodes with search & filtering + summary stats
 */
exports.getDeliveryZones = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { search, isActive, zoneName } = req.query;

    const where = {};

    if (search && search.trim()) {
      const q = search.trim();
      where[Op.or] = [
        { pincode: { [Op.like]: `%${q}%` } },
        { zoneName: { [Op.like]: `%${q}%` } },
        { state: { [Op.like]: `%${q}%` } },
        { city: { [Op.like]: `%${q}%` } },
      ];
    }

    if (isActive !== undefined && isActive !== '' && isActive !== 'ALL') {
      where.isActive = isActive === 'true' || isActive === '1';
    }

    if (zoneName && zoneName.trim() && zoneName !== 'ALL') {
      where.zoneName = zoneName.trim();
    }

    const { count, rows } = await DeliveryZone.findAndCountAll({
      where,
      limit,
      offset,
      order: [['pincode', 'ASC']],
    });

    // Calculate Summary Stats
    const totalPincodes = await DeliveryZone.count();
    const activePincodes = await DeliveryZone.count({ where: { isActive: true } });
    const freeDeliveryPincodes = await DeliveryZone.count({
      where: {
        isActive: true,
        [Op.or]: [
          { deliveryCharge: 0 },
          { minOrderAmountForFreeDelivery: { [Op.not]: null } }
        ]
      }
    });

    // Unique Zones
    const uniqueZones = await DeliveryZone.findAll({
      attributes: ['zoneName'],
      group: ['zoneName'],
      raw: true
    });
    const zoneList = uniqueZones.map(z => z.zoneName).filter(Boolean);

    res.json({
      success: true,
      data: rows,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit,
      },
      stats: {
        totalPincodes,
        activePincodes,
        freeDeliveryPincodes,
        distinctZones: zoneList.length,
        zoneList
      }
    });
  } catch (error) {
    console.error('Error in getDeliveryZones:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery zones', error: error.message });
  }
};

/**
 * Check delivery availability and shipping charge for a pincode (Public/Store)
 */
exports.checkPincodeDelivery = async (req, res) => {
  try {
    const rawPincode = (req.params.pincode || req.query.pincode || '').trim();

    if (!rawPincode) {
      return res.status(400).json({ success: false, message: 'Pincode is required' });
    }

    const zone = await DeliveryZone.findOne({
      where: { pincode: rawPincode, isActive: true }
    });

    if (!zone) {
      return res.json({
        success: true,
        deliverable: false,
        pincode: rawPincode,
        message: 'Delivery is currently not available for this pincode',
      });
    }

    res.json({
      success: true,
      deliverable: true,
      pincode: zone.pincode,
      zoneName: zone.zoneName,
      city: zone.city,
      state: zone.state,
      deliveryCharge: parseFloat(zone.deliveryCharge || 0),
      minOrderAmountForFreeDelivery: zone.minOrderAmountForFreeDelivery !== null ? parseFloat(zone.minOrderAmountForFreeDelivery) : null,
    });
  } catch (error) {
    console.error('Error in checkPincodeDelivery:', error);
    res.status(500).json({ success: false, message: 'Failed to check pincode delivery', error: error.message });
  }
};

/**
 * Create a single delivery zone entry
 */
exports.createDeliveryZone = async (req, res) => {
  try {
    const { pincode, zoneName, state, city, deliveryCharge, minOrderAmountForFreeDelivery, isActive } = req.body;

    const cleanPincode = (pincode || '').toString().trim();
    if (!cleanPincode) {
      return res.status(400).json({ success: false, message: 'Pincode is required' });
    }

    const existing = await DeliveryZone.findOne({ where: { pincode: cleanPincode } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Pincode ${cleanPincode} already exists` });
    }

    const newZone = await DeliveryZone.create({
      pincode: cleanPincode,
      zoneName: zoneName ? zoneName.trim() : 'Standard Zone',
      state: state ? state.trim() : '',
      city: city ? city.trim() : '',
      deliveryCharge: deliveryCharge !== undefined && deliveryCharge !== '' ? parseFloat(deliveryCharge) : 0.00,
      minOrderAmountForFreeDelivery: minOrderAmountForFreeDelivery !== undefined && minOrderAmountForFreeDelivery !== '' && minOrderAmountForFreeDelivery !== null ? parseFloat(minOrderAmountForFreeDelivery) : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      success: true,
      message: 'Delivery Zone added successfully',
      data: newZone
    });
  } catch (error) {
    console.error('Error in createDeliveryZone:', error);
    res.status(500).json({ success: false, message: 'Failed to create delivery zone', error: error.message });
  }
};

/**
 * Update a delivery zone entry
 */
exports.updateDeliveryZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { pincode, zoneName, state, city, deliveryCharge, minOrderAmountForFreeDelivery, isActive } = req.body;

    const zone = await DeliveryZone.findByPk(id);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Delivery Zone not found' });
    }

    if (pincode && pincode.toString().trim() !== zone.pincode) {
      const cleanPincode = pincode.toString().trim();
      const existing = await DeliveryZone.findOne({ where: { pincode: cleanPincode, id: { [Op.ne]: id } } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Pincode ${cleanPincode} is already registered to another zone` });
      }
      zone.pincode = cleanPincode;
    }

    if (zoneName !== undefined) zone.zoneName = zoneName.trim();
    if (state !== undefined) zone.state = state.trim();
    if (city !== undefined) zone.city = city.trim();
    if (deliveryCharge !== undefined) zone.deliveryCharge = parseFloat(deliveryCharge || 0);
    if (minOrderAmountForFreeDelivery !== undefined) {
      zone.minOrderAmountForFreeDelivery = (minOrderAmountForFreeDelivery !== '' && minOrderAmountForFreeDelivery !== null)
        ? parseFloat(minOrderAmountForFreeDelivery)
        : null;
    }
    if (isActive !== undefined) zone.isActive = Boolean(isActive);

    await zone.save();

    res.json({
      success: true,
      message: 'Delivery Zone updated successfully',
      data: zone
    });
  } catch (error) {
    console.error('Error in updateDeliveryZone:', error);
    res.status(500).json({ success: false, message: 'Failed to update delivery zone', error: error.message });
  }
};

/**
 * Delete a single delivery zone entry
 */
exports.deleteDeliveryZone = async (req, res) => {
  try {
    const { id } = req.params;
    const zone = await DeliveryZone.findByPk(id);

    if (!zone) {
      return res.status(404).json({ success: false, message: 'Delivery Zone not found' });
    }

    await zone.destroy();
    res.json({ success: true, message: 'Delivery Zone deleted successfully' });
  } catch (error) {
    console.error('Error in deleteDeliveryZone:', error);
    res.status(500).json({ success: false, message: 'Failed to delete delivery zone', error: error.message });
  }
};

/**
 * Bulk delete delivery zones
 */
exports.bulkDeleteDeliveryZones = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No delivery zone IDs provided for deletion' });
    }

    const deletedCount = await DeliveryZone.destroy({
      where: { id: { [Op.in]: ids } }
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} delivery zone records`
    });
  } catch (error) {
    console.error('Error in bulkDeleteDeliveryZones:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk delete delivery zones', error: error.message });
  }
};

/**
 * Bulk upload delivery zones from Excel file (.xlsx, .xls, .csv)
 */
exports.bulkUploadDeliveryZones = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
    }

    const workbook = new ExcelJS.Workbook();
    
    // Read from memory buffer or file path
    if (req.file.buffer) {
      await workbook.xlsx.load(req.file.buffer);
    } else if (req.file.path) {
      await workbook.xlsx.readFile(req.file.path);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid file upload buffer' });
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ success: false, message: 'Uploaded workbook contains no sheets' });
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Header normalization map
    const headerMap = {};

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          const rawVal = (cell.value || '').toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (rawVal.includes('pincode') || rawVal.includes('zipcode') || rawVal.includes('pin')) {
            headerMap.pincode = colNumber;
          } else if (rawVal.includes('zone')) {
            headerMap.zoneName = colNumber;
          } else if (rawVal.includes('state')) {
            headerMap.state = colNumber;
          } else if (rawVal.includes('city')) {
            headerMap.city = colNumber;
          } else if (rawVal.includes('charge') || rawVal.includes('fee') || rawVal.includes('delivery')) {
            if (!headerMap.deliveryCharge) headerMap.deliveryCharge = colNumber;
          } else if (rawVal.includes('minorder') || rawVal.includes('freeabove') || rawVal.includes('threshold') || rawVal.includes('freedelivery')) {
            headerMap.minOrderAmountForFreeDelivery = colNumber;
          } else if (rawVal.includes('active') || rawVal.includes('status')) {
            headerMap.isActive = colNumber;
          }
        });
        return;
      }

      // Parse row data
      const getVal = (colIdx) => {
        if (!colIdx) return '';
        const cell = row.getCell(colIdx);
        if (!cell || cell.value === null || cell.value === undefined) return '';
        if (typeof cell.value === 'object' && cell.value.result !== undefined) {
          return cell.value.result.toString().trim();
        }
        return cell.value.toString().trim();
      };

      const pincodeRaw = getVal(headerMap.pincode || 1);
      const cleanPincode = pincodeRaw.replace(/[^0-9]/g, '');

      if (!cleanPincode || cleanPincode.length < 3) {
        skippedCount++;
        return;
      }

      const zoneName = getVal(headerMap.zoneName) || 'Standard Zone';
      const state = getVal(headerMap.state) || '';
      const city = getVal(headerMap.city) || '';
      
      const chargeRaw = getVal(headerMap.deliveryCharge);
      const deliveryCharge = chargeRaw !== '' && !isNaN(parseFloat(chargeRaw)) ? parseFloat(chargeRaw) : 0;

      const freeAboveRaw = getVal(headerMap.minOrderAmountForFreeDelivery);
      const minOrderAmountForFreeDelivery = freeAboveRaw !== '' && !isNaN(parseFloat(freeAboveRaw)) ? parseFloat(freeAboveRaw) : null;

      const activeRaw = getVal(headerMap.isActive).toLowerCase();
      let isActive = true;
      if (activeRaw === 'no' || activeRaw === 'false' || activeRaw === '0' || activeRaw === 'inactive') {
        isActive = false;
      }

      // We queue records or process upsert
      row._parsedData = {
        pincode: cleanPincode,
        zoneName,
        state,
        city,
        deliveryCharge,
        minOrderAmountForFreeDelivery,
        isActive,
      };
    });

    // Perform DB upserts
    const rowsToProcess = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && row._parsedData) {
        rowsToProcess.push(row._parsedData);
      }
    });

    for (const item of rowsToProcess) {
      try {
        const [zoneRecord, created] = await DeliveryZone.findOrCreate({
          where: { pincode: item.pincode },
          defaults: item
        });

        if (created) {
          addedCount++;
        } else {
          await zoneRecord.update({
            zoneName: item.zoneName || zoneRecord.zoneName,
            state: item.state || zoneRecord.state,
            city: item.city || zoneRecord.city,
            deliveryCharge: item.deliveryCharge,
            minOrderAmountForFreeDelivery: item.minOrderAmountForFreeDelivery,
            isActive: item.isActive,
          });
          updatedCount++;
        }
      } catch (err) {
        errors.push(`Pincode ${item.pincode}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Bulk upload completed. ${addedCount} added, ${updatedCount} updated.`,
      stats: {
        totalRows: rowsToProcess.length,
        addedCount,
        updatedCount,
        skippedCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Error in bulkUploadDeliveryZones:', error);
    res.status(500).json({ success: false, message: 'Failed to process Excel upload', error: error.message });
  }
};

/**
 * Generate and download sample Excel template
 */
exports.downloadSampleTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Billu Bazzar';
    workbook.lastModifiedBy = 'Admin';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Delivery Zones', {
      views: [{ showGridLines: true }]
    });

    // Style Header Row
    sheet.columns = [
      { header: 'Pincode', key: 'pincode', width: 15 },
      { header: 'Zone Name', key: 'zoneName', width: 22 },
      { header: 'State', key: 'state', width: 20 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Delivery Charge (₹)', key: 'deliveryCharge', width: 22 },
      { header: 'Min Order For Free Delivery (₹)', key: 'minOrderAmountForFreeDelivery', width: 32 },
      { header: 'Is Active (YES/NO)', key: 'isActive', width: 20 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F46E5' } // Indigo header
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // Sample Data Rows
    const sampleRows = [
      { pincode: '600001', zoneName: 'Chennai Metro', state: 'Tamil Nadu', city: 'Chennai', deliveryCharge: 40, minOrderAmountForFreeDelivery: 999, isActive: 'YES' },
      { pincode: '600028', zoneName: 'Chennai Local', state: 'Tamil Nadu', city: 'Chennai', deliveryCharge: 30, minOrderAmountForFreeDelivery: 799, isActive: 'YES' },
      { pincode: '560001', zoneName: 'Bengaluru Central', state: 'Karnataka', city: 'Bengaluru', deliveryCharge: 60, minOrderAmountForFreeDelivery: 1499, isActive: 'YES' },
      { pincode: '110001', zoneName: 'Delhi NCR', state: 'Delhi', city: 'New Delhi', deliveryCharge: 80, minOrderAmountForFreeDelivery: 1499, isActive: 'YES' },
      { pincode: '400001', zoneName: 'Mumbai Fort', state: 'Maharashtra', city: 'Mumbai', deliveryCharge: 70, minOrderAmountForFreeDelivery: 1499, isActive: 'YES' },
      { pincode: '641001', zoneName: 'Coimbatore South', state: 'Tamil Nadu', city: 'Coimbatore', deliveryCharge: 50, minOrderAmountForFreeDelivery: 999, isActive: 'YES' },
      { pincode: '625001', zoneName: 'Madurai City', state: 'Tamil Nadu', city: 'Madurai', deliveryCharge: 50, minOrderAmountForFreeDelivery: 999, isActive: 'YES' },
    ];

    sampleRows.forEach(rowData => {
      const row = sheet.addRow(rowData);
      row.alignment = { vertical: 'middle' };
      row.height = 22;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Delivery_Zones_Sample_Template.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error in downloadSampleTemplate:', error);
    res.status(500).json({ success: false, message: 'Failed to generate sample template', error: error.message });
  }
};
