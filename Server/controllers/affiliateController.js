'use strict';
const { Affiliate, Order, Customer } = require('../models');
const fs = require('fs');
const path = require('path');

const { deleteLocalFile } = require('../utils/fileHelper');

const getAll = async (req, res) => {
  try {
    // Admin user: return all affiliate details including bankDetails, documents, commissions
    if (req.admin) {
      const affiliates = await Affiliate.findAll({ order: [['createdAt', 'DESC']] });
      return res.json({ success: true, affiliates });
    }

    // Public / Storefront: return only active affiliates with public marketing display attributes
    const affiliates = await Affiliate.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'handle', 'avatar', 'productsCurated', 'followers', 'referralCode', 'isActive'],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, affiliates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const affiliate = await Affiliate.findByPk(req.params.id, {
      include: [{ model: Order, as: 'orders', include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] }] }],
    });
    if (!affiliate) return res.status(404).json({ success: false, message: 'Affiliate not found' });
    res.json({ success: true, affiliate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.referralCode) {
      return res.status(400).json({ success: false, message: 'Referral code is required' });
    }

    const code = data.referralCode.trim().toUpperCase();
    if (code.length < 3 || code.length > 20) {
      return res.status(400).json({ success: false, message: 'Referral code must be between 3 and 20 characters' });
    }

    const codeRegex = /^[A-Z0-9_-]+$/;
    if (!codeRegex.test(code)) {
      return res.status(400).json({ success: false, message: 'Referral code can only contain letters, numbers, hyphens, and underscores' });
    }

    // Check for duplicate referral code
    const existing = await Affiliate.findOne({ where: { referralCode: code } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This referral code is already in use by another affiliate' });
    }

    data.referralCode = code;

    if (data.handle) {
      let h = data.handle.trim();
      if (h) {
        if (!h.startsWith('@')) h = '@' + h;
        data.handle = h;
      }
    }
    if (data.productsCurated !== undefined) {
      data.productsCurated = parseInt(data.productsCurated) || 0;
    }

    if (req.file) {
      const normalizedPath = req.file.path.replace(/\\/g, '/');
      const uploadsIndex = normalizedPath.indexOf('uploads');
      data.documentProof = '/' + normalizedPath.substring(uploadsIndex);
    } else if (req.files?.documentProof?.[0]) {
      const normalizedPath = req.files.documentProof[0].path.replace(/\\/g, '/');
      const uploadsIndex = normalizedPath.indexOf('uploads');
      data.documentProof = '/' + normalizedPath.substring(uploadsIndex);
    }

    if (data.socialMedia) {
      if (typeof data.socialMedia === 'string') {
        try {
          data.socialMedia = JSON.parse(data.socialMedia);
        } catch (e) {
          data.socialMedia = [];
        }
      }
    }

    if (data.isActive !== undefined) {
      data.isActive = data.isActive === 'true' || data.isActive === true;
    }
    if (data.commissionRate !== undefined) {
      data.commissionRate = parseFloat(data.commissionRate) || 5.0;
    }

    const affiliate = await Affiliate.create(data);
    res.status(201).json({ success: true, affiliate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const affiliate = await Affiliate.findByPk(req.params.id);
    if (!affiliate) return res.status(404).json({ success: false, message: 'Affiliate not found' });
    
    const data = { ...req.body };
    if (data.referralCode) {
      const code = data.referralCode.trim().toUpperCase();
      if (code.length < 3 || code.length > 20) {
        return res.status(400).json({ success: false, message: 'Referral code must be between 3 and 20 characters' });
      }

      const codeRegex = /^[A-Z0-9_-]+$/;
      if (!codeRegex.test(code)) {
        return res.status(400).json({ success: false, message: 'Referral code can only contain letters, numbers, hyphens, and underscores' });
      }

      // Check duplicate code (excluding current affiliate)
      const { Op } = require('sequelize');
      const existing = await Affiliate.findOne({ where: { referralCode: code, id: { [Op.ne]: affiliate.id } } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'This referral code is already in use by another affiliate' });
      }
      data.referralCode = code;
    }

    if (data.handle) {
      let h = data.handle.trim();
      if (h) {
        if (!h.startsWith('@')) h = '@' + h;
        data.handle = h;
      }
    }
    if (data.productsCurated !== undefined) {
      data.productsCurated = parseInt(data.productsCurated) || 0;
    }

    if (req.file) {
      deleteLocalFile(affiliate.documentProof);
      const normalizedPath = req.file.path.replace(/\\/g, '/');
      const uploadsIndex = normalizedPath.indexOf('uploads');
      data.documentProof = '/' + normalizedPath.substring(uploadsIndex);
    } else if (req.files?.documentProof?.[0]) {
      deleteLocalFile(affiliate.documentProof);
      const normalizedPath = req.files.documentProof[0].path.replace(/\\/g, '/');
      const uploadsIndex = normalizedPath.indexOf('uploads');
      data.documentProof = '/' + normalizedPath.substring(uploadsIndex);
    }

    if (data.socialMedia) {
      if (typeof data.socialMedia === 'string') {
        try {
          data.socialMedia = JSON.parse(data.socialMedia);
        } catch (e) {
          data.socialMedia = [];
        }
      }
    }

    if (data.isActive !== undefined) {
      data.isActive = data.isActive === 'true' || data.isActive === true;
    }
    if (data.commissionRate !== undefined) {
      data.commissionRate = parseFloat(data.commissionRate) || 5.0;
    }

    await affiliate.update(data);
    res.json({ success: true, affiliate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const affiliate = await Affiliate.findByPk(req.params.id);
    if (!affiliate) return res.status(404).json({ success: false, message: 'Affiliate not found' });
    
    deleteLocalFile(affiliate.documentProof);
    await affiliate.destroy();
    res.json({ success: true, message: 'Affiliate permanently deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { affiliateId: req.params.id },
      include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    res.json({ success: true, orders, totalRevenue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const trackClick = async (req, res) => {
  try {
    const { ref } = req.query;
    if (!ref) {
      return res.status(400).json({ success: false, message: 'Referral code is required' });
    }
    const affiliate = await Affiliate.findOne({ where: { referralCode: ref.toUpperCase() } });
    if (!affiliate) {
      return res.status(404).json({ success: false, message: 'Referral link not found' });
    }
    if (!affiliate.isActive) {
      return res.status(403).json({ success: false, disabled: true, message: 'This affiliate link is currently inactive' });
    }
    await affiliate.increment('totalClicks');
    res.json({ success: true, message: 'Click tracked successfully', currentClicks: affiliate.totalClicks + 1 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove, getOrders, trackClick };
