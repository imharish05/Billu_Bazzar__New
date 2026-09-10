# Mobile customer API

Each feature has its own folder containing its controller, routes, and Swagger documentation. For example:

    mob-api/
      Auth/                   Original authentication implementation
      categories/
        categoriesController.js
        categoriesRoutes.js
        categoriesSwagger.js
      products/
        productsController.js
        productsRoutes.js
        productsSwagger.js
      banners/
      offers/
      cart/
      checkout/
      orders/
      payments/
      myaccount/
      reviews/
      returns/
      delivery/
      stock/
      search/
      settings/
      currency/
      gifts/
      contact/
      personalshopper/
      affiliates/
      common/                 Shared authentication, ownership, request checks
      index.js                Explicit feature router mounts
      swagger.js              Collects feature documentation
      swaggerUi.js            Serves Swagger

## Usage

API base: /mob-api (also /api/mob).
Swagger: /mob-api/docs/ or /mob-api-docs/.
OpenAPI JSON: /mob-api/openapi.json.

Start the existing Server with npm start. Log in through /mob-api/auth/login and send Authorization: Bearer <token> for feature APIs. All feature routes require an active customer. Registration, login, and password recovery remain public and rate-limited. Documentation is public.

Auth's original authController.js, authRoutes.js, authValidation.js, and JWT signing behavior are retained, including the original 10-year mobile token lifetime. Auth/authAliases.js adds client URL aliases /auth/me and /auth/reset-password without editing those original files. Recovery uses the original OTP -> resetToken -> new-password flow. Mobile clients use that long-lived token; web refresh-token endpoints are not duplicated.

## Client processes

- banners: banners and marketing messages.
- categories: category tree, categories, subcategories, sub-subcategories.
- products: product list, details, featured products, search, price range, variants. New arrivals and best sellers use product-list filters.
- offers: /offers and /offers/validate; /coupons URLs also work.
- cart: fetch, add, sync, update/remove item, clear.
- checkout: /checkout/send-otp and /checkout/verify-otp, also available at the client's /auth/send-checkout-otp and /auth/verify-checkout-otp URLs.
- orders: place, list my orders, details, cancel, track by ID or order number.
- payments: region detection, initiate, verify. Ownership and gateway-reference checks run before shared payment logic.
- myaccount: profile, change password, wishlist, loyalty, tickets. /auth/profile, /auth/change-password, and /customers/* aliases are preserved.
- reviews and returns: customer review and return processes, including return evidence uploads.
- delivery, stock, currency, gifts, contact, personalshopper, affiliates, search: corresponding storefront processes.
- settings: about, loyalty, tax, OTP threshold and newsletter subscription. Both /settings/:key and /site-settings/:key work.

Feature controllers call the existing backend commerce controllers to share business rules and response formats. Mobile-specific ownership and storefront checks live in the relevant feature folder. Admin CRUD, reports, seeding, and webhook endpoints are not mounted in this API. Existing gateway webhook URLs stay under /api/payments/webhook/*.

## Checks

From Server, run npm run test:mob and npm run swagger:mob (use npm.cmd on PowerShell if needed). Tests stub database and gateway dependencies; live MySQL, email, upload, and payment integration still require environment testing.
