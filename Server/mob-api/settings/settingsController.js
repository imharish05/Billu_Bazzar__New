'use strict';
const siteSetting = require('../../controllers/siteSettingController');

exports.subscribeNewsletter = (req, res, next) => siteSetting.subscribeNewsletter(req, res, next);

exports.getSetting = (req, res, next) => {
  if (!['about', 'loyalty', 'tax', 'otp_threshold'].includes(req.params.key)) {
    return res.status(404).json({ success: false, message: 'Setting not available to mobile customers' });
  }
  return siteSetting.getSetting(req, res, next);
};

