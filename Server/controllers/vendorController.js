'use strict';
const { Vendor, Product } = require('../models');

const handleDBError = (err, res, type = 'item') => {
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ success: false, message: `A ${type} with this email already exists.` });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ success: false, message: 'Foreign key constraint fails.' });
  }
  if (err.name === 'SequelizeValidationError') {
    const msg = err.errors.map(e => e.message).join(', ');
    return res.status(400).json({ success: false, message: msg });
  }
  return res.status(500).json({ success: false, message: err.message });
};

const parseVendorAddress = (v) => {
  const plain = v.get({ plain: true });
  if (typeof plain.address === 'string') {
    try { plain.address = JSON.parse(plain.address); } catch (e) { plain.address = {}; }
  }
  return plain;
};

const getAll = async (req, res) => {
  try {
    const { all, page, limit, search } = req.query;
    const { Op } = require('sequelize');
    const where = {};
    if (!all) where.isActive = true;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { gstin: { [Op.like]: `%${search}%` } }
      ];
    }

    if (page !== undefined || limit !== undefined) {
      const p = Math.max(1, parseInt(page || 1, 10));
      const l = Math.max(1, parseInt(limit || 10, 10));

      const { count, rows: rawVendors } = await Vendor.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        include: [{ model: Product, as: 'products', attributes: ['id', 'name', 'slug', 'stock'] }],
        distinct: true,
        limit: l,
        offset: (p - 1) * l
      });

      const vendors = rawVendors.map(parseVendorAddress);
      return res.json({
        success: true,
        vendors,
        total: count,
        page: p,
        limit: l,
        totalPages: Math.ceil(count / l)
      });
    }

    const rawVendors = await Vendor.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [{ model: Product, as: 'products', attributes: ['id', 'name', 'slug', 'stock'] }],
    });

    const vendors = rawVendors.map(parseVendorAddress);
    res.json({ success: true, vendors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const rawVendor = await Vendor.findByPk(req.params.id, {
      include: [{ model: Product, as: 'products', attributes: ['id', 'name', 'slug', 'price', 'stock'] }],
    });
    if (!rawVendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    
    const vendor = parseVendorAddress(rawVendor);
    res.json({ success: true, vendor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const data = { ...req.body };

    if (data.isActive !== undefined) {
      data.isActive = data.isActive === 'true' || data.isActive === true;
    }

    if (data.commissionRate) {
      data.commissionRate = parseFloat(data.commissionRate);
    }

    if (data.rating) {
      data.rating = parseFloat(data.rating);
    }

    if (data.address && typeof data.address === 'string') {
      try {
        data.address = JSON.parse(data.address);
      } catch (e) {
        data.address = {};
      }
    }

    if (data.gstin !== undefined) {
      if (data.gstin && String(data.gstin).trim()) {
        const cleanGst = String(data.gstin).trim().toUpperCase();
        if (cleanGst.length < 7 || cleanGst.length > 15 || !/^[0-9]{2}[A-Z0-9]{4,13}$/.test(cleanGst)) {
          return res.status(400).json({ success: false, message: 'Invalid GSTIN number format. GST number must start with 2 state code digits (e.g. 22AAAAA0000A1Z5 or 22A435HG).' });
        }
        data.gstin = cleanGst;
      } else {
        data.gstin = null;
      }
    }

    const vendor = await Vendor.create(data);
    res.status(201).json({ success: true, vendor });
  } catch (err) {
    return handleDBError(err, res, 'vendor');
  }
};

const update = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const data = { ...req.body };

    if (data.isActive !== undefined) {
      data.isActive = data.isActive === 'true' || data.isActive === true;
    }

    if (data.commissionRate !== undefined) {
      data.commissionRate = parseFloat(data.commissionRate);
    }

    if (data.rating !== undefined) {
      data.rating = parseFloat(data.rating);
    }

    if (data.address && typeof data.address === 'string') {
      try {
        data.address = JSON.parse(data.address);
      } catch (e) {
        // preserve existing if invalid JSON
      }
    }

    if (data.gstin !== undefined) {
      if (data.gstin && String(data.gstin).trim()) {
        const cleanGst = String(data.gstin).trim().toUpperCase();
        if (cleanGst.length < 7 || cleanGst.length > 15 || !/^[0-9]{2}[A-Z0-9]{4,13}$/.test(cleanGst)) {
          return res.status(400).json({ success: false, message: 'Invalid GSTIN number format. GST number must start with 2 state code digits (e.g. 22AAAAA0000A1Z5 or 22A435HG).' });
        }
        data.gstin = cleanGst;
      } else {
        data.gstin = null;
      }
    }

    await vendor.update(data);
    res.json({ success: true, vendor });
  } catch (err) {
    return handleDBError(err, res, 'vendor');
  }
};

const remove = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    // Enforce check: Do not delete if products are linked
    const productsCount = await Product.count({ where: { vendorId: vendor.id } });
    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete vendor "${vendor.name}" because they have ${productsCount} products associated with them. Please delete or reassign the products first.`
      });
    }

    await vendor.destroy();
    res.json({ success: true, message: 'Vendor deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
