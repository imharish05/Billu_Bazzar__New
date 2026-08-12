'use strict';
const router = require('express').Router();
const { getSetting, updateSetting, subscribeNewsletter } = require('../controllers/siteSettingController');
const { verifyAdmin, optionalCustomer } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.post('/newsletter-subscribe', optionalCustomer, subscribeNewsletter);
router.get('/:key', getSetting);
router.post('/:key', verifyAdmin, hasPermission('edit_site_settings'), upload.single('image'), updateSetting);
router.put('/:key', verifyAdmin, hasPermission('edit_site_settings'), upload.single('image'), updateSetting);

module.exports = router;
