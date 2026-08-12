'use strict';
const router = require('express').Router();
const { getAll, getOne, create, update, remove, getStock, upsertStock, transferStock, getLowStockAlerts } = require('../controllers/warehouseController');
const { verifyAdmin } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');

router.get('/', verifyAdmin, hasPermission('view_warehouses'), getAll);
router.get('/alerts/low-stock', verifyAdmin, getLowStockAlerts);
router.get('/:id', verifyAdmin, hasPermission('view_warehouses'), getOne);
router.post('/', verifyAdmin, hasPermission('add_warehouse'), create);
router.put('/:id', verifyAdmin, hasPermission('edit_warehouse'), update);
router.delete('/:id', verifyAdmin, hasPermission('delete_warehouse'), remove);
router.get('/:id/stock', verifyAdmin, hasPermission('view_warehouses'), getStock);
router.post('/:id/stock/upsert', verifyAdmin, hasPermission('edit_warehouse'), upsertStock);
router.post('/transfer', verifyAdmin, hasPermission('edit_warehouse'), transferStock);

module.exports = router;
