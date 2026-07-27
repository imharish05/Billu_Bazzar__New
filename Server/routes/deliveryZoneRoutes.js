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

// Multer memory storage for Excel parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Public route: Storefront pincode lookup
router.get('/check/:pincode', checkPincodeDelivery);
router.get('/check', checkPincodeDelivery);

// Admin routes
router.get('/', verifyAdmin, getDeliveryZones);
router.get('/sample-template', verifyAdmin, downloadSampleTemplate);
router.post('/', verifyAdmin, createDeliveryZone);
router.put('/:id', verifyAdmin, updateDeliveryZone);
router.delete('/bulk', verifyAdmin, bulkDeleteDeliveryZones);
router.delete('/:id', verifyAdmin, deleteDeliveryZone);
router.post('/bulk-upload', verifyAdmin, upload.single('file'), bulkUploadDeliveryZones);

module.exports = router;
