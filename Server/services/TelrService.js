'use strict';

const axios = require('axios');
const PaymentGatewayInterface = require('./PaymentGatewayInterface');

class TelrService extends PaymentGatewayInterface {
  /**
   * Helper to check if production / live Telr gateway credentials are configured.
   * @returns {boolean}
   */
  hasRealCredentials() {
    const storeId = process.env.TELR_STORE_ID;
    const authKey = process.env.TELR_AUTH_KEY;
    return Boolean(
      storeId &&
      storeId.trim() !== '' &&
      storeId !== 'mock_store_id' &&
      authKey &&
      authKey.trim() !== '' &&
      authKey !== 'mock_auth_key'
    );
  }

  /**
   * Create order/session in Telr and obtain hosted payment page URL.
   * @param {Object} orderData
   * @param {number} orderData.amount - Total amount in standard currency unit (AED)
   * @param {string} [orderData.currency='AED'] - Currency code
   * @param {string} orderData.receipt - Unique order number or receipt code
   * @param {string|number} [orderData.orderId] - Internal database order ID
   * @param {Object} [orderData.customer] - Customer profile (name, email, phone)
   * @param {Object} [orderData.billingAddress] - Billing address
   * @param {Object} [orderData.shippingAddress] - Shipping address fallback
   * @returns {Promise<import('./PaymentGatewayInterface').PaymentResult>}
   */
  async createOrder({ amount, currency = 'AED', receipt, orderId, customer, billingAddress, shippingAddress }) {
    try {
      const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
      const storeId = process.env.TELR_STORE_ID || 'mock_store_id';
      const authKey = process.env.TELR_AUTH_KEY || 'mock_auth_key';
      const rawTestMode = process.env.TELR_TEST_MODE;
      const isTestMode = rawTestMode !== undefined ? (rawTestMode === '0' || rawTestMode === 'false' ? '0' : '1') : '1';

      // ── Resolve Customer Billing Details for 3D-Secure ─────────────────────
      const addr = billingAddress || shippingAddress || {};
      const fullName = (addr.fullName || addr.name || customer?.name || 'Valued Customer').trim();
      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts[0] || 'Valued';
      const lastName = nameParts.slice(1).join(' ') || 'Customer';
      const email = (addr.email || customer?.email || 'customer@billubazzar.com').trim();
      const phone = (addr.phone || customer?.phone || '0500000000').replace(/[^0-9+]/g, '') || '0500000000';
      const addr1 = (addr.addressLine1 || addr.address || addr.street || 'Standard Delivery Address').slice(0, 120);
      const addr2 = (addr.addressLine2 || '').slice(0, 120);
      const city = (addr.city || 'Dubai').slice(0, 50);
      const region = (addr.state || addr.region || 'Dubai').slice(0, 50);
      const country = 'AE';

      const simRef = `telr_sim_${Date.now()}_${receipt}`;
      const orderParam = orderId 
        ? `orderId=${orderId}&orderNumber=${receipt}&orderRef=${simRef}` 
        : `orderId=${receipt}&cartId=${receipt}&orderRef=${simRef}`;

      // ── 1. TELR SIMULATION MODE (When keys are not configured) ─────────────
      if (!this.hasRealCredentials()) {
        console.log('[TelrService] TELR_STORE_ID / TELR_AUTH_KEY not configured. Running Telr in Simulation Mode.');
        return {
          success: true,
          gatewayRef: simRef,
          amount: parseFloat(amount),
          currency,
          status: 'CREATED',
          redirectUrl: `${clientUrl}/order-confirmation?gateway=telr&status=success&${orderParam}`,
          raw: {
            isSimulation: true,
            note: 'Running in Telr simulation mode. Add valid TELR_STORE_ID & TELR_AUTH_KEY to Server/.env for live gateway.',
          },
        };
      }

      // ── 2. LIVE TELR GATEWAY REQUEST (Active when real keys exist in .env) ──
      const liveOrderParam = orderId 
        ? `orderId=${orderId}&orderNumber=${receipt}` 
        : `orderId=${receipt}&cartId=${receipt}`;

      const payload = {
        ivp_method: 'create',
        ivp_store: storeId,
        ivp_authkey: authKey,
        ivp_cart: String(receipt),
        ivp_test: String(isTestMode),
        ivp_amount: parseFloat(amount).toFixed(2),
        ivp_currency: currency,
        ivp_desc: `Billu Bazzar Payment for Order ${receipt}`,
        return_auth: `${clientUrl}/order-confirmation?gateway=telr&status=success&${liveOrderParam}`,
        return_decl: `${clientUrl}/checkout?gateway=telr&status=declined&${liveOrderParam}`,
        return_can: `${clientUrl}/checkout?gateway=telr&status=cancelled&${liveOrderParam}`,
        bill_fname: firstName,
        bill_sname: lastName,
        bill_addr1: addr1,
        bill_addr2: addr2,
        bill_city: city,
        bill_region: region,
        bill_country: country,
        bill_email: email,
        bill_phone: phone,
      };

      console.log(`[TelrService] Initiating live Telr order for receipt: ${receipt}, amount: ${amount} ${currency}`);
      const response = await axios.post('https://secure.telr.com/gateway/order.json', payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });

      const data = response.data;
      if (data.error) {
        console.error('[Telr createOrder] Gateway Error:', data.error.message || data.error.note);
        throw new Error(data.error.message || data.error.note || 'Telr order creation rejected by gateway');
      }

      if (!data.order || !data.order.ref || !data.order.url) {
        throw new Error('Invalid response structure received from Telr gateway');
      }

      return {
        success: true,
        gatewayRef: data.order.ref,
        amount: parseFloat(amount),
        currency,
        status: 'CREATED',
        redirectUrl: data.order.url,
        raw: data,
      };
    } catch (err) {
      console.error('[Telr createOrder] Error:', err.message);
      throw err;
    }
  }

  /**
   * Verify authenticity of a Telr callback or IPN.
   * Performs a backchannel check API call to Telr to confirm authenticity.
   * @param {any} payload - Incoming webhook/IPN payload
   * @param {string} [signature] - Optional signature
   * @returns {Promise<boolean>}
   */
  async verifySignature(payload, signature) {
    try {
      if (!this.hasRealCredentials()) {
        return true;
      }

      const storeId = payload.tran_store || payload.store || payload.ivp_store;
      const orderRef = payload.tran_order_ref || payload.order_ref || payload.ivp_order || payload.tran_ref;
      const expectedStoreId = process.env.TELR_STORE_ID;

      if (expectedStoreId && storeId && String(storeId) !== String(expectedStoreId)) {
        console.warn(`[Telr verifySignature] Invalid webhook metadata. Expected store ${expectedStoreId}, got ${storeId}.`);
        return false;
      }

      if (!orderRef) {
        console.warn('[Telr verifySignature] No order reference found in webhook payload.');
        return false;
      }

      // Query Telr direct backchannel check API to confirm this transaction status
      const checkResult = await this.fetchPayment(orderRef);
      return checkResult.success;
    } catch (err) {
      console.error('[Telr verifySignature] Error verifying callback:', err.message);
      return false;
    }
  }

  /**
   * Fetch order status details from Telr.
   * @param {string} orderRef - Telr order reference ID
   * @returns {Promise<import('./PaymentGatewayInterface').PaymentResult>}
   */
  async fetchPayment(orderRef) {
    try {
      const isSimRef = typeof orderRef === 'string' && (orderRef.startsWith('telr_sim_') || orderRef.startsWith('telr_ref_'));
      if (!this.hasRealCredentials() || isSimRef) {
        return {
          success: true,
          gatewayRef: orderRef || `telr_sim_${Date.now()}`,
          amount: 0,
          currency: 'AED',
          status: 'PAID',
          raw: { isSimulation: true }
        };
      }

      const storeId = process.env.TELR_STORE_ID;
      const authKey = process.env.TELR_AUTH_KEY;

      const payload = {
        ivp_method: 'check',
        ivp_store: storeId,
        ivp_authkey: authKey,
        ivp_order: orderRef,
      };

      const response = await axios.post('https://secure.telr.com/gateway/order.json', payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });
      const data = response.data;

      if (data.error) {
        console.error('[Telr fetchPayment] Gateway Error:', data.error.message);
        throw new Error(data.error.message || 'Telr payment verification query failed');
      }

      const orderStatusText = (data.order?.status?.text || '').toLowerCase();
      const orderStatusCode = data.order?.status?.code;
      const isPaid = orderStatusText === 'paid' || 
                     orderStatusText === 'authorised' || 
                     orderStatusCode === 3 || 
                     orderStatusCode === '3';

      return {
        success: isPaid,
        gatewayRef: data.order?.ref || orderRef,
        amount: parseFloat(data.order?.amount || 0),
        currency: data.order?.currency || 'AED',
        status: isPaid ? 'PAID' : 'FAILED',
        raw: data,
      };
    } catch (err) {
      console.error('[Telr fetchPayment] Error:', err.message);
      throw err;
    }
  }

  /**
   * Refund a captured Telr transaction using Telr Remote XML API.
   * @param {string} orderRef - Telr transaction reference ID to refund
   * @param {number} amount - Amount in AED to refund
   * @param {string} [currency='AED'] - Currency
   * @returns {Promise<import('./PaymentGatewayInterface').PaymentResult>}
   */
  async refund(orderRef, amount, currency = 'AED') {
    try {
      const isSimRef = typeof orderRef === 'string' && (orderRef.startsWith('telr_sim_') || orderRef.startsWith('telr_ref_'));
      if (!this.hasRealCredentials() || isSimRef) {
        console.log(`[TelrService] Simulation refund executed for ref: ${orderRef}, amount: AED ${amount}`);
        return {
          success: true,
          gatewayRef: `telr_sim_refund_${Date.now()}`,
          amount: parseFloat(amount),
          currency: 'AED',
          status: 'REFUNDED',
          raw: { isSimulation: true }
        };
      }

      const storeId = process.env.TELR_STORE_ID;
      const authKey = process.env.TELR_AUTH_KEY;
      const rawTestMode = process.env.TELR_TEST_MODE;
      const isTestMode = rawTestMode !== undefined ? (rawTestMode === '0' || rawTestMode === 'false' ? '0' : '1') : '1';

      // ── Official Telr Remote XML API Format for Follow-up Refunds ───────────
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<remote>
  <store>${storeId}</store>
  <key>${authKey}</key>
  <tran>
    <type>refund</type>
    <class>ecom</class>
    <currency>${currency}</currency>
    <amount>${parseFloat(amount).toFixed(2)}</amount>
    <ref>${orderRef}</ref>
    <test>${isTestMode}</test>
  </tran>
</remote>`;

      console.log(`[TelrService] Executing live Remote XML refund for ref: ${orderRef}, amount: ${amount} ${currency}`);
      const response = await axios.post('https://secure.telr.com/gateway/remote.xml', xmlPayload, {
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/xml',
        },
        timeout: 20000,
      });

      const responseXml = String(response.data || '');
      const statusMatch = responseXml.match(/<status>(.*?)<\/status>/i);
      const messageMatch = responseXml.match(/<message>(.*?)<\/message>/i);
      const refMatch = responseXml.match(/<ref>(.*?)<\/ref>/i);

      const statusVal = statusMatch ? statusMatch[1].trim() : '';
      const messageVal = messageMatch ? messageMatch[1].trim() : '';
      const refundRef = refMatch ? refMatch[1].trim() : `telr_refund_${Date.now()}`;

      const isSuccess = statusVal === 'A' || statusVal.toLowerCase() === 'authorised' || statusVal.toLowerCase() === 'paid';

      if (!isSuccess) {
        console.error(`[Telr refund] Gateway response not authorized: ${statusVal} - ${messageVal}`);
        return {
          success: false,
          gatewayRef: refundRef,
          amount: parseFloat(amount),
          currency,
          status: 'FAILED',
          raw: { responseXml, message: messageVal },
        };
      }

      return {
        success: true,
        gatewayRef: refundRef,
        amount: parseFloat(amount),
        currency,
        status: 'REFUNDED',
        raw: { responseXml, status: statusVal, message: messageVal },
      };
    } catch (err) {
      console.error('[Telr refund] Error executing Remote XML refund:', err.message);
      throw err;
    }
  }
}

module.exports = new TelrService();
