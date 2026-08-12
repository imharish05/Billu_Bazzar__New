'use strict';

const router = require('express').Router();
const multer = require('multer');
const {
  getDeliveryZones,
  checkPincodeDelivery,
  createDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
  bulkDeleteDeliveryZones,
  bulkUploadDeliveryZones,
  downloadSampleTemplate,
} = require('../controllers/deliveryZoneController');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

// Multer memory storage for Excel parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Public route: Storefront pincode lookup
router.get('/check/:pincode', checkPincodeDelivery);
router.get('/check', checkPincodeDelivery);

// Admin routes
router.get('/', verifyAdmin, hasPermission('view_delivery_zones'), getDeliveryZones);
router.get('/sample-template', verifyAdmin, hasPermission('view_delivery_zones'), downloadSampleTemplate);
router.post('/', verifyAdmin, hasPermission('add_delivery_zone'), createDeliveryZone);
router.put('/:id', verifyAdmin, hasPermission('edit_delivery_zone'), updateDeliveryZone);
router.delete('/bulk', verifyAdmin, hasPermission('delete_delivery_zone'), bulkDeleteDeliveryZones);
router.delete('/:id', verifyAdmin, hasPermission('delete_delivery_zone'), deleteDeliveryZone);
router.post('/bulk-upload', verifyAdmin, hasPermission('add_delivery_zone'), upload.single('file'), bulkUploadDeliveryZones);

module.exports = router;
