'use strict';
const router = require('express').Router();
const { getSetting, updateSetting, subscribeNewsletter } = require('../controllers/siteSettingController');
const { verifyAdmin, optionalCustomer } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/newsletter-subscribe', optionalCustomer, subscribeNewsletter);
router.get('/:key', getSetting);
router.post('/:key', verifyAdmin, upload.single('image'), updateSetting);
router.put('/:key', verifyAdmin, upload.single('image'), updateSetting);

module.exports = router;
