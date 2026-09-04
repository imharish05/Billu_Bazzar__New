'use strict';
const assert = require('assert');
const { hasPermission } = require('../middleware/rbac');

console.log('--- Starting RBAC & Permission Audit Verification Tests ---');

let passedTests = 0;
let failedTests = 0;

const runTest = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failedTests++;
  }
};

// Mock response object
const createMockRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
};

// 1. Super Admin bypass test
runTest('Super Admin role bypasses all permissions', () => {
  const req = {
    admin: {
      role: { name: 'Super Admin', permissions: {} }
    }
  };
  const res = createMockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  hasPermission('delete_anything_random')(req, res, next);
  assert.strictEqual(nextCalled, true, 'Super admin should bypass permission check');
});

// 2. Unauthenticated returns 401
runTest('Unauthenticated admin returns 401', () => {
  const req = {};
  const res = createMockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  hasPermission('view_products')(req, res, next);
  assert.strictEqual(nextCalled, false, 'Next should not be called');
  assert.strictEqual(res.statusCode, 401, 'Status code should be 401');
});

// 3. Direct boolean permission check
runTest('Direct boolean permission granted', () => {
  const req = {
    admin: {
      role: { name: 'Product Manager', permissions: { view_products: true } }
    }
  };
  const res = createMockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  hasPermission('view_products')(req, res, next);
  assert.strictEqual(nextCalled, true, 'Next should be called');
});

// 4. Marketing manager group permission maps to granular add_banner
runTest('User with manage_marketing can add_banner', () => {
  const req = {
    admin: {
      role: { name: 'Marketing Staff', permissions: { manage_marketing: true } }
    }
  };
  const res = createMockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  hasPermission('add_banner')(req, res, next);
  assert.strictEqual(nextCalled, true, 'User with manage_marketing should be allowed to add_banner');
});

// 5. Marketing manager can delete_slider_message
runTest('User with manage_marketing can delete_slider_message', () => {
  const req = {
    admin: {
      role: { name: 'Marketing Staff', permissions: { manage_marketing: true } }
    }
  };
  const res = createMockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  hasPermission('delete_slider_message')(req, res, next);
  assert.strictEqual(nextCalled, true, 'User with manage_marketing should be allowed to delete_slider_message');
});

// 6. User with view_marketing can view_banners & view_coupons
runTest('User with view_marketing can view_banners and view_coupons', () => {
  const req = {
    admin: {
      role: { name: 'Marketing Viewer', permissions: { view_marketing: true } }
    }
  };
  let bannerViewed = false;
  let couponViewed = false;
  const res = createMockRes();

  hasPermission('view_banners')(req, res, () => { bannerViewed = true; });
  hasPermission('view_coupons')(req, res, () => { couponViewed = true; });

  assert.strictEqual(bannerViewed, true, 'Should allow viewing banners');
  assert.strictEqual(couponViewed, true, 'Should allow viewing coupons');
});

// 7. Operations manager group permission maps to delivery zones & warehouses
runTest('User with manage_operations can add_delivery_zone and delete_warehouse', () => {
  const req = {
    admin: {
      role: { name: 'Operations Lead', permissions: { manage_operations: true } }
    }
  };
  let zoneAdded = false;
  let whDeleted = false;
  const res = createMockRes();

  hasPermission('add_delivery_zone')(req, res, () => { zoneAdded = true; });
  hasPermission('delete_warehouse')(req, res, () => { whDeleted = true; });

  assert.strictEqual(zoneAdded, true, 'Should allow add_delivery_zone');
  assert.strictEqual(whDeleted, true, 'Should allow delete_warehouse');
});

// 8. Finance manager group permission maps to payments and reports
runTest('User with view_finance can view_payments and view_reports', () => {
  const req = {
    admin: {
      role: { name: 'Accountant', permissions: { view_finance: true } }
    }
  };
  let paymentViewed = false;
  let reportViewed = false;
  const res = createMockRes();

  hasPermission('view_payments')(req, res, () => { paymentViewed = true; });
  hasPermission('view_reports')(req, res, () => { reportViewed = true; });

  assert.strictEqual(paymentViewed, true, 'Should allow view_payments');
  assert.strictEqual(reportViewed, true, 'Should allow view_reports');
});

// 9. Customer support manager can view & delete personal shopper and contact enquiries
runTest('User with manage_customers can delete_contact_enquiry and delete_personal_shopper', () => {
  const req = {
    admin: {
      role: { name: 'Support Lead', permissions: { manage_customers: true } }
    }
  };
  let enquiryDeleted = false;
  let shopperDeleted = false;
  const res = createMockRes();

  hasPermission('delete_contact_enquiry')(req, res, () => { enquiryDeleted = true; });
  hasPermission('delete_personal_shopper')(req, res, () => { shopperDeleted = true; });

  assert.strictEqual(enquiryDeleted, true, 'Should allow delete_contact_enquiry');
  assert.strictEqual(shopperDeleted, true, 'Should allow delete_personal_shopper');
});

// 10. Settings manager group permission maps to manage_roles and manage_admin_users
runTest('User with manage_settings can manage_roles and manage_admin_users', () => {
  const req = {
    admin: {
      role: { name: 'IT Admin', permissions: { manage_settings: true } }
    }
  };
  let rolesManaged = false;
  let usersManaged = false;
  const res = createMockRes();

  hasPermission('manage_roles')(req, res, () => { rolesManaged = true; });
  hasPermission('manage_admin_users')(req, res, () => { usersManaged = true; });

  assert.strictEqual(rolesManaged, true, 'Should allow manage_roles');
  assert.strictEqual(usersManaged, true, 'Should allow manage_admin_users');
});

// 11. Unauthorized action correctly blocked with 403
runTest('Unauthorized permission returns 403 Access Denied', () => {
  const req = {
    admin: {
      role: { name: 'Read Only Staff', permissions: { view_products: true } }
    }
  };
  const res = createMockRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  hasPermission('delete_product')(req, res, next);
  assert.strictEqual(nextCalled, false, 'Next should not be called');
  assert.strictEqual(res.statusCode, 403, 'Should return 403 Forbidden');
  assert.strictEqual(res.body.success, false, 'Success should be false');
});

console.log(`\nTest Summary: ${passedTests} passed, ${failedTests} failed.`);
if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
