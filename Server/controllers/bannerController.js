'use strict';
const { Banner } = require('../models');
const fs = require('fs');
const path = require('path');

const handleDBError = (err, res, type = 'item') => {
  console.error(`[Banner DB Error - ${type}]`, err);
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ success: false, message: `A ${type} with this name or slug already exists.` });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ success: false, message: 'Foreign key constraint fails. Please verify that all parent links are valid.' });
  }
  if (err.name === 'SequelizeValidationError') {
    const msg = err.errors ? err.errors.map(e => e.message).join(', ') : err.message;
    return res.status(400).json({ success: false, message: msg });
  }
  return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
};

// Helper to delete local file
const deleteLocalFile = (imagePath) => {
  if (imagePath && imagePath.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '..', imagePath.substring(1)); // strip leading slash
    try {
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`[Upload] Deleted local file: ${localPath}`);
      }
    } catch (err) {
      console.error(`[Upload] Error deleting local file: ${err.message}`);
    }
  }
};

// Clean incoming payload data
const prepareBannerData = (rawData) => {
  const data = { ...rawData };
  if (data.isActive !== undefined) {
    data.isActive = (data.isActive === 'true' || data.isActive === true);
  }
  if (!data.countdown || typeof data.countdown !== 'string' || data.countdown.trim() === '') {
    data.countdown = null;
  }
  return data;
};

const { toAbsoluteUrl } = require('../utils/imageUrl');

const formatBanner = (banner, req) => {
  if (!banner) return banner;
  const json = typeof banner.toJSON === 'function' ? banner.toJSON() : { ...banner };
  json.image = toAbsoluteUrl(json.image, req);
  return json;
};

const getAll = async (req, res) => {
  try {
    const { type, all } = req.query;
    const showAll = (all === 'true' || all === true);

    // Only auto-deactivate expired countdown banners when serving public site requests (!showAll)
    if (!showAll) {
      const { Op } = require('sequelize');
      const now = new Date();
      const expiredBanners = await Banner.findAll({
        where: {
          isActive: true,
          type: 'COUNTDOWN',
          countdown: {
            [Op.ne]: null,
            [Op.gt]: new Date('2000-01-01'),
            [Op.lt]: now
          }
        }
      });

      if (expiredBanners && expiredBanners.length > 0) {
        for (const banner of expiredBanners) {
          banner.isActive = false;
          await banner.save();
          console.log(`[Banner Auto-deactivate] Deactivated expired banner ID ${banner.id} (type: ${banner.type}, countdown: ${banner.countdown})`);
        }
      }
    }

    const where = {};
    if (!showAll) where.isActive = true;
    if (type) where.type = type;
    const banners = await Banner.findAll({ where, order: [['position', 'ASC']] });
    const formattedBanners = banners.map(b => formatBanner(b, req));
    res.json({ success: true, banners: formattedBanners });
  } catch (err) {
    return handleDBError(err, res, 'banner');
  }
};

const create = async (req, res) => {
  try {
    const data = prepareBannerData(req.body);
    if (data.type === 'COUNTDOWN') {
      if (data.countdown && new Date(data.countdown).getTime() <= Date.now()) {
        if (req.file) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({ success: false, message: 'Countdown date & time cannot be in the past.' });
      }
      const existing = await Banner.findOne({ where: { type: 'COUNTDOWN' } });
      if (existing) {
        if (req.file) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({ success: false, message: 'A countdown banner already exists. Please edit the existing one instead.' });
      }
    }
    if (req.file) {
      if (req.file.size > 5 * 1024 * 1024) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ success: false, message: 'Image file size exceeds 5MB limit.' });
      }
      const normalizedPath = req.file.path.replace(/\\/g, '/');
      const uploadsIndex = normalizedPath.indexOf('uploads');
      data.image = '/' + normalizedPath.substring(uploadsIndex);
    }
    const banner = await Banner.create(data);
    res.status(201).json({ success: true, banner: formatBanner(banner, req) });
  } catch (err) {
    return handleDBError(err, res, 'banner');
  }
};

const update = async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }
    const data = prepareBannerData(req.body);
    if (data.type === 'COUNTDOWN') {
      if (data.countdown && new Date(data.countdown).getTime() <= Date.now()) {
        if (req.file) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({ success: false, message: 'Countdown date & time cannot be in the past.' });
      }
      if (banner.type !== 'COUNTDOWN') {
        const { Op } = require('sequelize');
        const existing = await Banner.findOne({ where: { type: 'COUNTDOWN', id: { [Op.ne]: banner.id } } });
        if (existing) {
          if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
          }
          return res.status(400).json({ success: false, message: 'A countdown banner already exists. Please edit the existing one instead.' });
        }
      }
    }
    if (req.file) {
      if (req.file.size > 5 * 1024 * 1024) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ success: false, message: 'Image file size exceeds 5MB limit.' });
      }
      deleteLocalFile(banner.image);
      const normalizedPath = req.file.path.replace(/\\/g, '/');
      const uploadsIndex = normalizedPath.indexOf('uploads');
      data.image = '/' + normalizedPath.substring(uploadsIndex);
    }
    await banner.update(data);
    res.json({ success: true, banner: formatBanner(banner, req) });
  } catch (err) {
    return handleDBError(err, res, 'banner');
  }
};

const remove = async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    deleteLocalFile(banner.image);
    await banner.destroy();
    res.json({ success: true, message: 'Banner deleted' });
  } catch (err) {
    return handleDBError(err, res, 'banner');
  }
};

module.exports = { getAll, create, update, remove };
