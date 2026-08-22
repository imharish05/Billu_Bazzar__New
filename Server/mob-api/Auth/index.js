'use strict';
const authRoutes = require('./authRoutes');
const authController = require('./authController');
const authValidation = require('./authValidation');

module.exports = {
  routes: authRoutes,
  controller: authController,
  validation: authValidation,
};
