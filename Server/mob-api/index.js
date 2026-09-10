'use strict';
const router = require('express').Router();

router.use('/auth', require('./Auth/authRoutes'));
router.use('/auth', require('./Auth/authAliases'));
router.use(require('./common/auth'));
router.use(require('./common/customerRequest'));
router.use(require('./settings/settingsRoutes'));
router.use(require('./products/productsRoutes'));
router.use(require('./categories/categoriesRoutes'));
router.use(require('./banners/bannersRoutes'));
router.use(require('./search/searchRoutes'));
router.use(require('./cart/cartRoutes'));
router.use(require('./orders/ordersRoutes'));
router.use(require('./payments/paymentsRoutes'));
router.use(require('./myaccount/myaccountRoutes'));
router.use(require('./offers/offersRoutes'));
router.use(require('./reviews/reviewsRoutes'));
router.use(require('./returns/returnsRoutes'));
router.use(require('./delivery/deliveryRoutes'));
router.use(require('./stock/stockRoutes'));
router.use(require('./currency/currencyRoutes'));
router.use(require('./gifts/giftsRoutes'));
router.use(require('./contact/contactRoutes'));
router.use(require('./personalshopper/personalshopperRoutes'));
router.use(require('./affiliates/affiliatesRoutes'));
router.use(require('./checkout/checkoutRoutes'));

router.use((req, res) => res.status(404).json({ success: false, message: 'Mobile route not found' }));
router.use((err, req, res, next) => {
  console.error('[Mobile API]', err.message);
  res.status(err.name === 'MulterError' ? 400 : 500).json({ success: false, message: err.name === 'MulterError' ? 'Invalid upload' : 'Internal server error' });
});
module.exports = router;
