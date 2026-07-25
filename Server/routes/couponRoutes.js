'use strict';
const router = require('express').Router();
const { getAll, create, update, remove, validate } = require('../controllers/couponController');
const { verifyAdmin, optionalCustomer } = require('../middleware/auth');

router.get('/', optionalCustomer, getAll);
router.post('/', verifyAdmin, create);
router.put('/:id', verifyAdmin, update);
router.delete('/:id', verifyAdmin, remove);
router.post('/validate', optionalCustomer, validate);

module.exports = router;
