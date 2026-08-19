'use strict';

const axios = require('axios');
const PaymentGatewayInterface = require('./PaymentGatewayInterface');

class TelrService extends PaymentGatewayInterface {
  /**
   * Create order/session in Telr and obtain hosted payment page URL.
   * @param {Object} orderData
   * @param {number} orderData.amount - Total amount in standard currency unit (AED)
   * @param {string} [orderData.currency='AED'] - Currency code
   * @param {string} orderData.receipt - Unique order number or receipt code
   * @param {string|number} [orderData.orderId] - Internal database order ID
   * @returns {Promise<import('./PaymentGatewayInterface').PaymentResult>}
   */
  async createOrder({ amount, currency = 'AED', receipt, orderId }) {
    try {
      const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
      const storeId = process.env.TELR_STORE_ID || 'mock_store_id';
      const authKey = process.env.TELR_AUTH_KEY || 'mock_auth_key';
      const isTestMode = process.env.TELR_TEST_MODE !== undefined ? process.env.TELR_TEST_MODE : '1';

      // ── TELR CREDENTIAL CHECK & FALLBACK ─────────────────────────────────────
      // If real Telr keys are not configured in .env, run in simulation mode.
      // Once real TELR_STORE_ID & TELR_AUTH_KEY are added to .env, this will
      // automatically execute the live Telr gateway request below.
      const hasRealKeys = process.env.TELR_STORE_ID && 
                          process.env.TELR_STORE_ID !== 'mock_store_id' &&
                          process.env.TELR_AUTH_KEY && 
                          process.env.TELR_AUTH_KEY !== 'mock_auth_key';

      const orderParam = orderId ? `orderId=${orderId}&orderNumber=${receipt}` : `orderId=${receipt}&cartId=${receipt}`;

      if (!hasRealKeys) {
        console.log('[TelrService] TELR_STORE_ID/AUTH_KEY not set in .env. Running Telr in simulation mode.');
        return {
          success: true,
          gatewayRef: `telr_sim_${Date.now()}`,
          amount: parseFloat(amount),
          currency,
          status: 'CREATED',
          redirectUrl: `${clientUrl}/order-confirmation?gateway=telr&status=success&${orderParam}`,
          raw: { isSimulation: true, note: 'Add TELR_STORE_ID & TELR_AUTH_KEY to .env for live Telr payment redirect' },
        };
      }

      // ── LIVE TELR GATEWAY REQUEST (Active when credentials exist in .env) ────
      const payload = {
        ivp_method: 'create',
        ivp_store: storeId,
        ivp_authkey: authKey,
        ivp_cart: String(receipt),
        ivp_test: String(isTestMode),
        ivp_amount: parseFloat(amount).toFixed(2),
        ivp_currency: currency,
        ivp_desc: `Payment for Order ${receipt}`,
        return_auth: `${clientUrl}/order-confirmation?gateway=telr&status=success&${orderParam}`,
        return_decl: `${clientUrl}/checkout?gateway=telr&status=declined&${orderParam}`,
        return_can: `${clientUrl}/checkout?gateway=telr&status=cancelled&${orderParam}`,
      };

      const response = await axios.post('https://secure.telr.com/gateway/order.json', payload);
      const data = response.data;

      if (data.error) {
        console.error('[Telr createOrder] API Error:', data.error.message);
        throw new Error(data.error.message || 'Telr order creation failed');
      }

      if (!data.order || !data.order.ref || !data.order.url) {
        throw new Error('Invalid response payload from Telr gateway');
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
   * @param {string} [signature] - Optional signature (unused for Telr backchannel checks)
   * @returns {Promise<boolean>}
   */
  async verifySignature(payload, signature) {
    try {
      const hasRealKeys = process.env.TELR_STORE_ID && 
                          process.env.TELR_STORE_ID !== 'mock_store_id' &&
                          process.env.TELR_AUTH_KEY && 
                          process.env.TELR_AUTH_KEY !== 'mock_auth_key';

      if (!hasRealKeys) {
        return true;
      }

      const storeId = payload.tran_store || payload.store || payload.ivp_store;
      const orderRef = payload.tran_order_ref || payload.order_ref || payload.ivp_order;
      const expectedStoreId = process.env.TELR_STORE_ID || 'mock_store_id';

      if (!orderRef || String(storeId) !== String(expectedStoreId)) {
        console.warn(`[Telr verifySignature] Invalid webhook metadata. Expected store ${expectedStoreId}, got ${storeId}. Order ref: ${orderRef}`);
        return false;
      }

      // Query Telr direct check API to confirm this transaction status
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
      const hasRealKeys = process.env.TELR_STORE_ID && 
                          process.env.TELR_STORE_ID !== 'mock_store_id' &&
                          process.env.TELR_AUTH_KEY && 
                          process.env.TELR_AUTH_KEY !== 'mock_auth_key';

      if (!hasRealKeys || (typeof orderRef === 'string' && orderRef.startsWith('telr_sim_'))) {
        return {
          success: true,
          gatewayRef: orderRef,
          amount: 0,
          currency: 'AED',
          status: 'PAID',
          raw: { isSimulation: true }
        };
      }

      const storeId = process.env.TELR_STORE_ID || 'mock_store_id';
      const authKey = process.env.TELR_AUTH_KEY || 'mock_auth_key';

      const payload = {
        ivp_method: 'check',
        ivp_store: storeId,
        ivp_authkey: authKey,
        ivp_order: orderRef,
      };

      const response = await axios.post('https://secure.telr.com/gateway/order.json', payload);
      const data = response.data;

      if (data.error) {
        console.error('[Telr fetchPayment] API Error:', data.error.message);
        throw new Error(data.error.message || 'Telr payment check failed');
      }

      const orderStatus = data.order?.status?.text || '';
      const success = orderStatus.toLowerCase() === 'paid' || orderStatus.toLowerCase() === 'authorised';

      return {
        success,
        gatewayRef: data.order?.ref || orderRef,
        amount: parseFloat(data.order?.amount || 0),
        currency: data.order?.currency || 'AED',
        status: success ? 'PAID' : 'FAILED',
        raw: data,
      };
    } catch (err) {
      console.error('[Telr fetchPayment] Error:', err.message);
      throw err;
    }
  }

  /**
   * Refund a captured Telr transaction.
   * @param {string} orderRef - Telr order reference ID to refund
   * @param {number} amount - Amount in AED to refund
   * @returns {Promise<import('./PaymentGatewayInterface').PaymentResult>}
   */
  async refund(orderRef, amount) {
    try {
      const hasRealKeys = process.env.TELR_STORE_ID && 
                          process.env.TELR_STORE_ID !== 'mock_store_id' &&
                          process.env.TELR_AUTH_KEY && 
                          process.env.TELR_AUTH_KEY !== 'mock_auth_key';

      if (!hasRealKeys || (typeof orderRef === 'string' && orderRef.startsWith('telr_sim_'))) {
        return {
          success: true,
          gatewayRef: orderRef,
          amount: parseFloat(amount),
          currency: 'AED',
          status: 'REFUNDED',
          raw: { isSimulation: true }
        };
      }

      const storeId = process.env.TELR_STORE_ID || 'mock_store_id';
      const authKey = process.env.TELR_AUTH_KEY || 'mock_auth_key';

      const payload = {
        ivp_method: 'refund',
        ivp_store: storeId,
        ivp_authkey: authKey,
        ivp_order: orderRef,
        ivp_amount: parseFloat(amount).toFixed(2),
      };

      const response = await axios.post('https://secure.telr.com/gateway/order.json', payload);
      const data = response.data;

      if (data.error) {
        console.error('[Telr refund] API Error:', data.error.message);
        throw new Error(data.error.message || 'Telr refund failed');
      }

      const refundStatus = data.order?.status?.text || '';
      const success = refundStatus.toLowerCase() === 'refunded' || refundStatus.toLowerCase() === 'success';

      return {
        success,
        gatewayRef: data.order?.ref || orderRef,
        amount: parseFloat(amount),
        currency: data.order?.currency || 'AED',
        status: success ? 'REFUNDED' : 'FAILED',
        raw: data,
      };
    } catch (err) {
      console.error('[Telr refund] Error:', err.message);
      throw err;
    }
  }
}

module.exports = new TelrService();
