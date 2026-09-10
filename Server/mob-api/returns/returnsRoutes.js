'use strict';
const router = require('express').Router();
const controller = require('./returnsController');
const upload = require('../../middleware/upload');

router.get('/returns/my', controller.getMyReturns);
router.get('/returns/my/:id', controller.getMyReturnById);
router.post('/returns/request', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'unboxingVideo', maxCount: 1 }, { name: 'images', maxCount: 5 }]), controller.requestReturn);

module.exports = router;
