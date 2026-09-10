'use strict';
const spec = {
  "openapi": "3.0.0",
  "info": {
    "title": "Billu Bazaar Mobile Customer API",
    "version": "1.0.0",
    "description": "Customer APIs organized by feature. Log in with the existing mobile Auth API and use its token in Authorize. All feature routes require customer authentication."
  },
  "servers": [
    {
      "url": "/"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Mobile access token returned by /mob-api/auth/login or /register. Paste without the Bearer prefix."
      }
    },
    "schemas": {
      "Error": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": false
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  },
  "paths": {}
};
Object.assign(spec.paths, require('./Auth/authSwagger'));
Object.assign(spec.paths, require('./settings/settingsSwagger'));
Object.assign(spec.paths, require('./products/productsSwagger'));
Object.assign(spec.paths, require('./categories/categoriesSwagger'));
Object.assign(spec.paths, require('./banners/bannersSwagger'));
Object.assign(spec.paths, require('./search/searchSwagger'));
Object.assign(spec.paths, require('./cart/cartSwagger'));
Object.assign(spec.paths, require('./orders/ordersSwagger'));
Object.assign(spec.paths, require('./payments/paymentsSwagger'));
Object.assign(spec.paths, require('./myaccount/myaccountSwagger'));
Object.assign(spec.paths, require('./offers/offersSwagger'));
Object.assign(spec.paths, require('./reviews/reviewsSwagger'));
Object.assign(spec.paths, require('./returns/returnsSwagger'));
Object.assign(spec.paths, require('./delivery/deliverySwagger'));
Object.assign(spec.paths, require('./stock/stockSwagger'));
Object.assign(spec.paths, require('./currency/currencySwagger'));
Object.assign(spec.paths, require('./gifts/giftsSwagger'));
Object.assign(spec.paths, require('./contact/contactSwagger'));
Object.assign(spec.paths, require('./personalshopper/personalshopperSwagger'));
Object.assign(spec.paths, require('./affiliates/affiliatesSwagger'));
Object.assign(spec.paths, require('./checkout/checkoutSwagger'));
spec.paths['/mob-api/auth/me'] = spec.paths['/mob-api/auth/getme'];
spec.paths['/mob-api/auth/reset-password'] = spec.paths['/mob-api/auth/new-password'];
module.exports = spec;
