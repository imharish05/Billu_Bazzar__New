'use strict';
const router = require('express').Router();
const {
  getGiftService,
  createGiftService,
  updateGiftService,
  deleteGiftService,
} = require('../controllers/giftServiceController');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/', getGiftService);
router.post('/', verifyAdmin, hasPermission('view_gift_services'), createGiftService);
router.put('/', verifyAdmin, hasPermission('view_gift_services'), updateGiftService);
router.delete('/', verifyAdmin, hasPermission('view_gift_services'), deleteGiftService);

module.exports = router;
