'use strict';
const router = require('express').Router();
const { getAll, getOne, create, update, remove, getStock, upsertStock, transferStock, getLowStockAlerts } = require('../controllers/warehouseController');
const { verifyAdmin } = require('../middleware/auth');

router.get('/', verifyAdmin, getAll);
router.get('/alerts/low-stock', verifyAdmin, getLowStockAlerts);
router.get('/:id', verifyAdmin, getOne);
router.post('/', verifyAdmin, create);
router.put('/:id', verifyAdmin, update);
router.delete('/:id', verifyAdmin, remove);
router.get('/:id/stock', verifyAdmin, getStock);
router.post('/:id/stock/upsert', verifyAdmin, upsertStock);
router.post('/transfer', verifyAdmin, transferStock);

module.exports = router;
