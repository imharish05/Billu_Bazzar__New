'use strict';
const express = require('express');
const router = express.Router();
const { getLedger } = require('../controllers/loyaltyController');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/ledger', verifyAdmin, hasPermission('manage_loyalty'), getLedger);

module.exports = router;
