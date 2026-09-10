'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const spec = require('../mob-api/swagger');
const dir = __dirname;
const scenarios = [];
const folders = [];
let serial = 0;
const folder = name => { const value = { name, item: [] }; folders.push(value); return value; };
const request = (group, name, method, route, expected, body, options = {}) => {
  const id = `MOB-${String(++serial).padStart(3, '0')}`;
  const tests = [
    `pm.test('Expected HTTP ${expected}', () => pm.expect(pm.response.code).to.eql(${expected}));`,
    "pm.test('JSON response', () => pm.response.to.be.json);",
    ...(expected < 300 ? ["pm.test('Application success', () => pm.expect(pm.response.json().success).to.eql(true));"] : []),
    ...(options.tests || []),
  ];
  const pre = [];
  if (options.manual) pre.push("if (pm.environment.get('runManual') !== 'true') pm.execution.skipRequest();");
  for (const v of options.requires || []) pre.push(`if (!pm.environment.get('${v}')) pm.execution.skipRequest();`);
  const item = {
    name: `${id} ${name}`,
    request: { method, header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [], url: '{{baseUrl}}' + route,
      description: `${name}. Expected HTTP ${expected}. ${options.note || ''}`,
      ...(body ? { body: { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } } : {}),
      ...(options.noauth ? { auth: { type: 'noauth' } } : options.token ? { auth: { type: 'bearer', bearer: [{ key: 'token', value: options.token, type: 'string' }] } } : {}),
    },
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }, ...(pre.length ? [{ listen: 'prerequest', script: { type: 'text/javascript', exec: pre } }] : [])],
  };
  group.item.push(item);
  const responseKeys = { '/mob-api/subcategories': 'subCategories', '/mob-api/subsubcategories': 'subSubCategories', '/mob-api/marketing-messages': 'messages', '/mob-api/banners': 'banners', '/mob-api/categories': 'categories' };
  if (method === 'GET' && expected === 200 && responseKeys[route]) tests.push(`pm.test('Correct feature response data', () => pm.expect(pm.response.json()['${responseKeys[route]}']).to.be.an('array'));`);
  scenarios.push({ id, name, method, route, expected, manual: !!options.manual, prerequisites: options.requires || [], note: options.note || '' });
  return item;
};
const save = (key, expression) => `if (pm.response.code < 300) pm.environment.set('${key}', ${expression});`;
const auth = folder('01 Authentication - dedicated QA accounts');
const credentials = { email: '{{qaEmail}}', password: '{{qaPassword}}' };
request(auth, 'Register QA customer A', 'POST', '/mob-api/auth/register', 201, { name: 'Mobile API QA Customer A', ...credentials, phone: '{{qaPhone}}' }, { noauth: true, tests: [save('token', 'pm.response.json().token')] });
request(auth, 'Duplicate email is rejected', 'POST', '/mob-api/auth/register', 409, { name: 'Mobile API QA Customer A', ...credentials, phone: '{{qaPhone}}' }, { noauth: true });
request(auth, 'Invalid registration email', 'POST', '/mob-api/auth/register', 400, { name: 'QA', email: 'not-an-email', password: '{{qaPassword}}', phone: '{{qaPhone}}' }, { noauth: true });
request(auth, 'Login with wrong password', 'POST', '/mob-api/auth/login', 401, { email: '{{qaEmail}}', password: 'DeliberatelyWrongPassword123!' }, { noauth: true });
request(auth, 'Login QA customer A', 'POST', '/mob-api/auth/login', 200, credentials, { noauth: true, tests: [save('token', 'pm.response.json().token')] });
request(auth, 'Register QA customer B for ownership tests', 'POST', '/mob-api/auth/register', 201, { name: 'Mobile API QA Customer B', email: '{{qaEmailB}}', password: '{{qaPassword}}', phone: '{{qaPhoneB}}' }, { noauth: true, tests: [save('tokenB', 'pm.response.json().token')] });
request(auth, 'Fetch current mobile customer', 'GET', '/mob-api/auth/getme', 200, null, { tests: [save('customerId', 'pm.response.json().customer.id'), "pm.test('Correct customer', () => pm.expect(pm.response.json().customer.email).to.eql(pm.environment.get('qaEmail')));"] });
request(auth, 'Current customer alias', 'GET', '/mob-api/auth/me', 200);

const catalog = folder('02 Catalog - capture real IDs');
request(catalog, 'Fetch products and choose an in-stock product', 'GET', '/mob-api/products?limit=100', 200, null, { tests: [
  "const products = pm.response.json().products || []; const p = products.find(p => Number(p.stock) >= 3);",
  "pm.test('An in-stock product fixture exists', () => pm.expect(p).to.be.an('object'));",
  "if (p) { ['id','slug','name','price','stock'].forEach(k => pm.environment.set('product'+k[0].toUpperCase()+k.slice(1), p[k])); }",
] });
request(catalog, 'Product details using captured slug', 'GET', '/mob-api/products/{{productSlug}}', 200, null, { requires: ['productSlug'] });
request(catalog, 'Variants for the selected product', 'GET', '/mob-api/variants/product/{{productId}}', 200, null, { requires: ['productId'], tests: ["const v = (pm.response.json().variants || []).find(v => Number(v.stock) >= 3); if (v) pm.environment.set('variantId',v.id);"] });
request(catalog, 'Category tree', 'GET', '/mob-api/categories/tree', 200, null, { tests: ["const c=(pm.response.json().categories||[])[0]; if(c) pm.environment.set('categoryId',c.id);"] });
for (const route of ['/categories', '/subcategories', '/subsubcategories', '/products/featured', '/products/price-range', '/products/search?q=sample', '/products?newArrival=true', '/products?bestSeller=true', '/banners', '/marketing-messages', '/search/autocomplete?q=sample', '/search/trending', '/currency/rate', '/gift-service', '/affiliates', '/payments/geo-detect?geo=IN', '/payments/geo-detect?geo=AE']) request(catalog, 'Read '+route, 'GET', '/mob-api'+route, 200);
for (const prefix of ['site-settings', 'settings']) for (const key of ['about', 'loyalty', 'tax', 'otp_threshold']) request(catalog, `Read ${prefix}/${key}`, 'GET', `/mob-api/${prefix}/${key}`, 200);
for (const route of ['/offers', '/coupons']) request(catalog, 'Read '+route, 'GET', '/mob-api'+route, 200, null, { tests: ["const c=(pm.response.json().coupons||[]).find(c => new Date(c.validFrom)<=new Date() && new Date(c.validUntil)>new Date()); if(c){pm.environment.set('couponCode',c.code);pm.environment.set('couponSubtotal',Math.max(1000,Number(c.minOrderValue||0)));}"] });
request(catalog, 'Validate real active offer', 'POST', '/mob-api/offers/validate', 200, '{"code":"{{couponCode}}","subtotal":{{couponSubtotal}}}', { requires: ['couponCode', 'couponSubtotal'] });
request(catalog, 'Delivery by pincode path', 'GET', '/mob-api/delivery-zones/check/{{pincode}}', 200);
request(catalog, 'Delivery by pincode query', 'GET', '/mob-api/delivery-zones/check?pincode={{pincode}}', 200);
request(catalog, 'Stock of selected product', 'GET', '/mob-api/stock-status?productId={{productId}}', 200, null, { requires: ['productId'] });
request(catalog, 'Alias API base accepts same customer token', 'GET', '/api/mob/products?limit=1', 200);

const cart = folder('03 Cart - positive and ownership flows');
request(cart, 'Start with empty QA cart', 'DELETE', '/mob-api/cart/clear', 200);
request(cart, 'Add real product to QA cart', 'POST', '/mob-api/cart/add', 200, '{"productId":{{productId}},"quantity":1}', { requires: ['productId'] });
request(cart, 'Capture cart item ID', 'GET', '/mob-api/cart', 200, null, { tests: ["const item=(pm.response.json().cart.items||[])[0];pm.test('Cart contains added product',()=>pm.expect(item).to.be.an('object'));if(item)pm.environment.set('cartItemId',item.id);"] });
request(cart, 'Update own item quantity', 'PUT', '/mob-api/cart/item/{{cartItemId}}', 200, { quantity: 2 }, { requires: ['cartItemId'] });
request(cart, 'Customer B creates its own separate cart', 'POST', '/mob-api/cart/add', 200, '{"productId":{{productId}},"quantity":1}', { token: '{{tokenB}}', requires: ['productId', 'tokenB'] });
request(cart, 'Customer B cannot update customer A item', 'PUT', '/mob-api/cart/item/{{cartItemId}}', 404, { quantity: 3 }, { token: '{{tokenB}}', requires: ['cartItemId', 'tokenB'] });
request(cart, 'Customer B cannot delete customer A item', 'DELETE', '/mob-api/cart/item/{{cartItemId}}', 404, null, { token: '{{tokenB}}', requires: ['cartItemId', 'tokenB'] });
request(cart, 'Stock overflow rejected', 'POST', '/mob-api/cart/add', 409, '{"productId":{{productId}},"quantity":2147483647}', { requires: ['productId'] });
request(cart, 'Zero quantity rejected', 'POST', '/mob-api/cart/add', 400, '{"productId":{{productId}},"quantity":0}', { requires: ['productId'] });
request(cart, 'Remove own item', 'DELETE', '/mob-api/cart/item/{{cartItemId}}', 200, null, { requires: ['cartItemId'] });
request(cart, 'Sync QA cart', 'POST', '/mob-api/cart/sync', 200, '{"items":[{"productId":{{productId}},"quantity":1}]}', { requires: ['productId'] });

const account = folder('04 My account and customer services');
for (const route of ['/auth/profile','/myaccount/profile','/myaccount/wishlist','/customers/wishlist','/myaccount/loyalty','/customers/loyalty','/myaccount/tickets','/customers/tickets','/orders/my','/returns/my','/reviews/my-delivered-items','/reviews/product/{{productId}}']) request(account,'Read '+route,'GET','/mob-api'+route,200,null,{requires:route.includes('productId')?['productId']:[]});
request(account,'Update QA profile','PUT','/mob-api/myaccount/profile',200,{name:'Mobile API QA Updated',phone:'{{qaPhone}}',whatsappOptIn:false,address:{address:'QA test address',city:'Chennai',state:'Tamil Nadu',pincode:'{{pincode}}',country:'India'}});
request(account,'Add product to wishlist','POST','/mob-api/myaccount/wishlist',200,'{"productId":{{productId}}}',{requires:['productId'],tests:["pm.test('Wishlist item added',()=>pm.expect(pm.response.json().action).to.eql('added'));"]});
request(account,'Remove product from wishlist','POST','/mob-api/customers/wishlist',200,'{"productId":{{productId}}}',{requires:['productId'],tests:["pm.test('Wishlist item removed',()=>pm.expect(pm.response.json().action).to.eql('removed'));"]});
request(account,'Create QA support ticket','POST','/mob-api/myaccount/tickets',201,{subject:'[API QA] Test support ticket',description:'Automated local API verification. No action required.',category:'GENERAL'});
request(account,'Create QA personal shopper request','POST','/mob-api/personal-shopper',201,{name:'Mobile API QA',email:'{{qaEmail}}',phone:'{{qaPhone}}',occasion:'API test - no action required',budget:'1000',style:'Casual',notes:'Local automated test fixture.'});
request(account,'Create stock alert for QA account','POST','/mob-api/stock-alerts',201,'{"productId":{{productId}},"email":"{{qaEmail}}","phone":"{{qaPhone}}"}',{requires:['productId']});
request(account,'Newsletter compatibility endpoint','POST','/mob-api/settings/newsletter-subscribe',200,{email:'{{qaEmail}}'});
request(account,'Record search','POST','/mob-api/search/track',200,{q:'sample'});
request(account,'Change QA password','PUT','/mob-api/myaccount/change-password',200,{currentPassword:'{{qaPassword}}',newPassword:'{{qaNewPassword}}'});
request(account,'Login with changed password','POST','/mob-api/auth/login',200,{email:'{{qaEmail}}',password:'{{qaNewPassword}}'},{noauth:true,tests:[save('token','pm.response.json().token')]});
request(account,'Restore QA password','PUT','/mob-api/auth/change-password',200,{currentPassword:'{{qaNewPassword}}',newPassword:'{{qaPassword}}'});

const negative = folder('05 Validation and unavailable resources');
request(negative,'Clear QA cart before invalid checkout','DELETE','/mob-api/cart/clear',200);
request(negative,'Empty cart cannot be ordered','POST','/mob-api/orders',400,{paymentMethod:'Razorpay Secure Online',shippingAddress:{country:'India',pincode:'600001'}});
const negatives = [
 ['GET','/products?limit=-1',400],['GET','/products/qa-product-does-not-exist',404],['GET','/variants/product/2147483647',404],
 ['GET','/site-settings/private-secrets',404],['POST','/offers/validate',404,{code:'QA_DOES_NOT_EXIST',subtotal:1000}],
 ['GET','/delivery-zones/check',400],['GET','/stock-status',400],['POST','/search/track',400,{q:''}],
 ['POST','/payments/initiate',400,{}],['POST','/payments/initiate',404,{orderId:2147483647}],
 ['POST','/payments/verify',404,{orderId:2147483647,razorpayPaymentId:'pay_qa_invalid',razorpayOrderId:'order_qa_invalid',razorpaySignature:'invalid'}],
 ['POST','/customers/tickets',404,{orderId:2147483647,subject:'QA',description:'QA'}],
 ['GET','/orders/my/2147483647',404],['GET','/orders/track/QA_MISSING_ORDER',404],['POST','/orders/my/2147483647/cancel',404,{reason:'QA missing order'}],
 ['GET','/returns/my/2147483647',404],['POST','/returns/request',400,{orderId:2147483647,orderItemId:2147483647,reason:'DAMAGED'}],
 ['POST','/reviews',400,{productId:'{{productId}}',rating:6,body:'QA invalid rating'}],
 ['POST','/reviews',403,{productId:'{{productId}}',rating:5,body:'QA cannot review before delivery'}],
 ['PUT','/reviews/2147483647',404,{rating:4,body:'QA missing review'}],['DELETE','/reviews/2147483647',404],
 ['POST','/contact-enquiries',400,{name:'QA',email:'{{qaEmail}}',message:''}],
 ['POST','/personal-shopper',400,{occasion:'',budget:'1000'}],['POST','/stock-alerts',400,{}],
 ['GET','/affiliates/track',400],['GET','/affiliates/track?ref=QA_MISSING',404],
 ['POST','/checkout/verify-otp',400,{email:'{{qaEmail}}',otp:'000000'}],['POST','/auth/verify-checkout-otp',400,{email:'{{qaEmail}}',otp:'000000'}],
 ['POST','/auth/forgot-password',400,{email:'invalid-email'}],['POST','/auth/verify-otp',400,{email:'{{qaEmail}}',otp:'123'}],
 ['POST','/auth/new-password',401,{resetToken:'invalid-token',newPassword:'{{qaNewPassword}}'}],['POST','/auth/reset-password',401,{resetToken:'invalid-token',newPassword:'{{qaNewPassword}}'}],
 ];
for(const [method,route,status,body] of negatives)request(negative,`Reject ${method} ${route}`,method,'/mob-api'+route,status,body,{noauth: ['/auth/forgot-password','/auth/verify-otp','/auth/new-password','/auth/reset-password'].includes(route)});
request(negative,'Forged token rejected','GET','/mob-api/products',401,null,{token:'invalid.jwt.signature'});
for(const [method,route] of [['POST','/products'],['GET','/orders'],['POST','/categories/seed'],['GET','/cart/admin/abandoned'],['GET','/admin-users']])request(negative,'Admin operation unavailable '+route,method,'/mob-api'+route,404,method==='POST'?{}:null);

const protection=folder('06 Missing-token checks - every protected operation');
const publicPaths=new Set(['/mob-api/auth/register','/mob-api/auth/login','/mob-api/auth/forgot-password','/mob-api/auth/verify-otp','/mob-api/auth/new-password','/mob-api/auth/reset-password']);
for(const [route,methods] of Object.entries(spec.paths))for(const method of Object.keys(methods)){
  if(publicPaths.has(route))continue;
  request(protection,`No token ${method.toUpperCase()} ${route}`,method.toUpperCase(),route.replace(/\{[^}]+\}/g,'1'),401,['post','put','patch'].includes(method)?{}:null,{noauth:true});
}

const manual=folder('90 Integration prerequisites - disabled by default');
const address={name:'Mobile API QA',email:'{{qaEmail}}',phone:'{{qaPhone}}',address:'QA test address',city:'Chennai',state:'Tamil Nadu',pincode:'{{pincode}}',country:'India'};
request(manual,'Place online order','POST','/mob-api/orders',201,{shippingAddress:address,billingAddress:address,paymentMethod:'Razorpay Secure Online',geoCountry:'IN',requestedCurrency:'INR',notes:'[API QA] Sandbox test order'}, {manual:true,requires:['token','productId'],note:'Requires isolated test inventory and an approved order lifecycle.',tests:[save('orderId','pm.response.json().order.id')]});
request(manual,'Initiate sandbox payment','POST','/mob-api/payments/initiate',200,'{"orderId":{{orderId}}}',{manual:true,requires:['orderId'],note:'Requires configured sandbox gateway.'});
request(manual,'Verify successful sandbox payment','POST','/mob-api/payments/verify',200,'{"orderId":{{orderId}},"razorpayPaymentId":"{{razorpayPaymentId}}","razorpayOrderId":"{{razorpayOrderId}}","razorpaySignature":"{{razorpaySignature}}"}',{manual:true,requires:['orderId','razorpayPaymentId','razorpayOrderId','razorpaySignature']});
request(manual,'Get owned order','GET','/mob-api/orders/my/{{orderId}}',200,null,{manual:true,requires:['orderId']});
request(manual,'Track owned order','GET','/mob-api/orders/track/{{orderId}}',200,null,{manual:true,requires:['orderId']});
request(manual,'Customer B cannot pay customer A order','POST','/mob-api/payments/initiate',404,'{"orderId":{{orderId}}}',{manual:true,requires:['orderId','tokenB'],token:'{{tokenB}}'});
request(manual,'Cancel QA order','POST','/mob-api/orders/my/{{orderId}}/cancel',200,{reason:'[API QA] End of sandbox test'},{manual:true,requires:['orderId'],note:'May send a cancellation email; order must be cancellable.'});
request(manual,'Request recovery OTP','POST','/mob-api/auth/forgot-password',200,{email:'{{qaEmail}}'},{manual:true,noauth:true,note:'Requires a test mailbox/SMTP sink; replace qaEmail with that account.'});
request(manual,'Verify recovery OTP','POST','/mob-api/auth/verify-otp',200,{email:'{{qaEmail}}',otp:'{{recoveryOtp}}'},{manual:true,noauth:true,requires:['recoveryOtp'],tests:[save('resetToken','pm.response.json().resetToken')]});
request(manual,'Set new password with reset token','POST','/mob-api/auth/new-password',200,{resetToken:'{{resetToken}}',newPassword:'{{qaNewPassword}}'},{manual:true,noauth:true,requires:['resetToken']});
request(manual,'Send checkout OTP','POST','/mob-api/checkout/send-otp',200,{email:'{{qaEmail}}',name:'Mobile API QA'},{manual:true,note:'Requires test mailbox/SMTP sink.'});
request(manual,'Verify valid checkout OTP','POST','/mob-api/checkout/verify-otp',200,{email:'{{qaEmail}}',otp:'{{checkoutOtp}}'},{manual:true,requires:['checkoutOtp']});
request(manual,'Submit contact enquiry','POST','/mob-api/contact-enquiries',201,{name:'Mobile API QA',email:'{{qaEmail}}',phone:'{{qaPhone}}',subject:'[API QA] Sandbox contact',message:'Test only; no response needed.'},{manual:true,note:'Sends an admin notification; requires approved sandbox email delivery.'});
request(manual,'Review delivered QA purchase','POST','/mob-api/reviews',201,'{"productId":{{productId}},"orderId":{{deliveredOrderId}},"rating":5,"title":"QA review","body":"Sandbox review of the delivered QA product."}',{manual:true,requires:['deliveredOrderId','productId'],tests:["if(pm.response.json().review)pm.environment.set('reviewId',pm.response.json().review.id);"]});
request(manual,'Update owned review','PUT','/mob-api/reviews/{{reviewId}}',200,{rating:4,title:'QA updated review',body:'Updated sandbox review.'},{manual:true,requires:['reviewId']});
request(manual,'Delete owned review','DELETE','/mob-api/reviews/{{reviewId}}',200,null,{manual:true,requires:['reviewId']});
const upload=request(manual,'Return delivered QA item with video','POST','/mob-api/returns/request',201,null,{manual:true,requires:['deliveredOrderId','orderItemId','returnVideoPath'],note:'Requires a delivered QA order within the return window, real unboxing video, and sandbox notification delivery.'});
upload.request.body={mode:'formdata',formdata:[{key:'orderId',value:'{{deliveredOrderId}}',type:'text'},{key:'orderItemId',value:'{{orderItemId}}',type:'text'},{key:'quantity',value:'1',type:'text'},{key:'reason',value:'DAMAGED',type:'text'},{key:'reasonDetails',value:'Sandbox return test',type:'text'},{key:'video',src:'{{returnVideoPath}}',type:'file'}]};

const cleanup=folder('99 Clear QA carts');
request(cleanup,'Clear customer A QA cart','DELETE','/mob-api/cart/clear',200);
request(cleanup,'Clear customer B QA cart','DELETE','/mob-api/cart/clear',200,null,{token:'{{tokenB}}'});
request(cleanup,'Confirm QA cart is empty','GET','/mob-api/cart',200,null,{tests:["pm.test('Cart empty',()=>pm.expect(pm.response.json().cart.items).to.have.length(0));"]});
const collection={info:{name:'Billu Bazaar Mobile API - executable scenarios',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',description:'Run against a local/test database only. Creates dedicated QA accounts, carts, support/stock/personal-shopping fixtures. Folder 90 is disabled until runManual=true and its required fixtures are supplied. Never treat skipped cases as passed.'},auth:{type:'bearer',bearer:[{key:'token',value:'{{token}}',type:'string'}]},item:folders};
fs.writeFileSync(path.join(dir,'mobile-api.postman_collection.json'),JSON.stringify(collection,null,2));
fs.writeFileSync(path.join(dir,'scenarios.json'),JSON.stringify(scenarios,null,2));
const runId=Date.now().toString();
const values={baseUrl:'http://127.0.0.1:5000',qaEmail:`mobile.qa.${runId}@example.com`,qaEmailB:`mobile.qa.b.${runId}@example.com`,qaPhone:'+919'+runId.slice(-9),qaPhoneB:'+918'+runId.slice(-9),qaPassword:crypto.randomBytes(18).toString('base64url')+'!Aa1',qaNewPassword:crypto.randomBytes(18).toString('base64url')+'!Bb2',pincode:'600001',runManual:'false',token:'',tokenB:''};
const env=v=>({name:'Billu Bazaar Local QA',values:Object.entries(v).map(([key,value])=>({key,value,enabled:true,type:/password|token|signature/i.test(key)?'secret':'default'})),_postman_variable_scope:'environment'});
fs.writeFileSync(path.join(dir,'qa.local.json'),JSON.stringify(env(values),null,2));
fs.writeFileSync(path.join(dir,'mobile-api.postman_environment.json'),JSON.stringify(env({...values,qaPassword:'SET_A_QA_PASSWORD',qaNewPassword:'SET_A_DIFFERENT_QA_PASSWORD'}),null,2));
console.log(`Generated ${scenarios.length} scenarios; ${scenarios.filter(s=>s.manual).length} require integration prerequisites.`);
