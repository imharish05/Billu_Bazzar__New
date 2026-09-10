'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
process.env.JWT_SECRET = 'mobile-api-test-secret-not-for-production';
const stub = (file, exports) => { require.cache[require.resolve(file)] = { id: require.resolve(file), filename: require.resolve(file), loaded: true, exports }; };
let active = true;
let dbFailure = false;
const models = {
  Customer: { findByPk: async id => { if (dbFailure) throw Error('database unavailable'); return id === 7 ? { id, isActive: active, email: 'customer@example.com' } : null; } },
  Order: { findOne: async ({ where }) => Number(where.id) === 10 && where.customerId === 7 ? { id: 10, customerId: 7, paymentGatewayRef: 'owned-ref' } : null },
  Product: { findOne: async ({ where }) => Number(where.id) === 1 ? { id: 1 } : null },
  Coupon: { findAll: async () => [] },
};
stub('../../models', models);
stub('../../services/emailService', { sendOtpEmail: async () => {} });
stub('../../middleware/upload', { fields: () => (req, res, next) => next() });
const fs = require('fs');
const featureRoot = path.join(__dirname, '..');
const endpoints = [];
const shared = new Map();
for (const name of fs.readdirSync(featureRoot)) {
  if (name === 'Auth') continue;
  const routeFile = path.join(featureRoot, name, name + 'Routes.js');
  if (!fs.existsSync(routeFile)) continue;
  const source = fs.readFileSync(routeFile, 'utf8');
  for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\('([^']+)'/g)) endpoints.push([match[1], match[2]]);
  const controller = fs.readFileSync(path.join(featureRoot, name, name + 'Controller.js'), 'utf8');
  for (const [, variable, file] of controller.matchAll(/const (\w+) = require\('..\/..\/controllers\/(\w+)Controller'\)/g)) {
    if (!shared.has(file)) shared.set(file, {});
    for (const [, action] of controller.matchAll(new RegExp(variable + '\\.([A-Za-z]+)', 'g'))) shared.get(file)[action] = (req, res) => res.json({ success: true, customerId: req.customer.id, query: req.query, action });
  }
}
for (const [source, handlers] of shared) stub(path.join('../../controllers', source + 'Controller'), handlers);
const { signMobileToken } = require('../../config/jwt');
const token = signMobileToken({ id: 7 });
let server;
let base;
before(async () => {
  const app = express();
  app.use(express.json());
  require('../swaggerUi')(app);
  const router = require('../index');
  app.use('/mob-api', router);
  app.use('/api/mob', router);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(() => new Promise(resolve => server.close(resolve)));
const request = (url, { access = token, method = 'GET', body } = {}) => fetch(base + url, {
  method, headers: { ...(access ? { Authorization: 'Bearer ' + access } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

test('every commerce route requires authentication on both mounts', async () => {
  for (const prefix of ['/mob-api', '/api/mob']) for (const [method, route] of endpoints) {
    const result = await request(prefix + route.replace(/:[A-Za-z]+/g, '1'), { access: null, method: method.toUpperCase() });
    assert.equal(result.status, 401, method + ' ' + prefix + route);
  }
});
test('rejects admin, reset, expired, and forged tokens', async () => {
  const claims = [{ id: 7, type: 'ADMIN' }, { id: 7, purpose: 'password_reset' }, { id: 7, type: 'CUSTOMER', purpose: 'mobile_access', exp: 1 }];
  for (const payload of claims) assert.equal((await request('/mob-api/cart', { access: jwt.sign(payload, process.env.JWT_SECRET) })).status, 401);
  assert.equal((await request('/mob-api/cart', { access: jwt.sign({ id: 7, type: 'CUSTOMER', purpose: 'mobile_access' }, 'wrong-secret') })).status, 401);
});
test('accepts original mobile tokens and strips admin catalog flags', async () => {
  const result = await request('/mob-api/products?admin=true&all=true&limit=999');
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(data.customerId, 7);
  assert.deepEqual(data.query, { limit: '100' });
  assert.equal((await request('/api/mob/products?limit=-1')).status, 400);
});
test('rejects inactive or missing customers and reports database outages as server errors', async () => {
  active = false;
  assert.equal((await request('/mob-api/cart')).status, 401);
  active = true;
  assert.equal((await request('/mob-api/cart', { access: signMobileToken({ id: 99 }) })).status, 401);
  dbFailure = true;
  assert.equal((await request('/mob-api/cart')).status, 500);
  dbFailure = false;
});
test('payment and support controllers enforce order ownership', async () => {
  for (const route of ['/payments/initiate', '/payments/verify', '/customers/tickets']) {
    assert.equal((await request('/mob-api' + route, { method: 'POST', body: { orderId: 11 } })).status, 404);
    assert.equal((await request('/mob-api' + route, { method: 'POST', body: { orderId: 10 } })).status, 200);
  }
  assert.equal((await request('/mob-api/payments/verify', { method: 'POST', body: { orderId: 10, orderRef: 'other-order-ref' } })).status, 400);
  assert.equal((await request('/mob-api/payments/initiate', { method: 'POST', body: { orderId: { id: 10 } } })).status, 400);
});
test('admin mutations and settings outside the customer allowlist are unavailable', async () => {
  for (const [method, route] of [['POST', '/products'], ['GET', '/orders'], ['GET', '/cart/admin/abandoned'], ['POST', '/categories/seed'], ['GET', '/site-settings/secrets']]) {
    assert.equal((await request('/mob-api' + route, { method })).status, 404);
  }
  assert.equal((await request('/mob-api/variants/product/999')).status, 404);
});
test('login and recovery are reachable without a token; profile aliases are protected', async () => {
  for (const route of ['/login', '/register', '/forgot-password', '/verify-otp', '/new-password', '/reset-password']) {
    assert.equal((await request('/mob-api/auth' + route, { method: 'POST', access: null, body: {} })).status, 400);
  }
  for (const route of ['/me', '/getme']) assert.equal((await request('/mob-api/auth' + route, { access: null })).status, 401);
});
test('Swagger serves every allowed operation with bearer security and request schemas', async () => {
  const response = await request('/mob-api/openapi.json', { access: null });
  assert.equal(response.status, 200);
  const spec = await response.json();
  for (const [method, route, , , , schema] of endpoints) {
    const operation = spec.paths['/mob-api' + route.replace(/:([A-Za-z]+)/g, '{$1}')][method];
    assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
    if (schema) assert.ok(operation.requestBody);
  }
  for (const url of ['/mob-api/docs/', '/mob-api-docs/', '/api/mob/docs/']) {
    const page = await request(url, { access: null });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Mobile Customer API/);
  }
});
