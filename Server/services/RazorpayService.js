'use strict';

const Razorpay = require('razorpay');
const crypto = require('crypto');
const PaymentGatewayInterface = require('./PaymentGatewayInterface');

class RazorpayService extends PaymentGatewayInterface {
  /**
   * Helper to get a configured Razorpay instance with response interceptor
   * to prevent SDK crashes on network/timeout errors.
   * @private
   * @returns {Razorpay}
   */
  _getInstance() {
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_mocksecret',
    });

    if (instance.api && instance.api.rq && instance.api.rq.interceptors) {
      instance.api.rq.interceptors.response.use(
        (response) => response,
        (error) => {
          if (!error.response) {
            error.response = {
              status: 500,
              data: {
                error: {
                  code: 'NETWORK_ERROR',
                  description: error.message || 'Network error connecting to Razorpay'
                }
              }
            };
          }
          return Promise.reject(error);
        }
      );
    }

    return instance;
  }

  /**
   * Create an order in Razorpay.
   * @param {Object} orderData
   * @param {number} orderData.amount - Total amount in standard currency unit (INR)
   * @param {string} [orderData.currency='INR'] - Currency code
   * @param {string} orderData.receipt - Unique receipt reference ID
   * @returns {Promise<import('./PaymentGatewayInterface').PaymentResult>}
   */
  async createOrder({ amount, currency = 'INR', receipt }) {
    try {
      const hasRealKeys = process.env.RAZORPAY_KEY_ID && 
                          !process.env.RAZORPAY_KEY_ID.includes('mock') && 
                          process.env.RAZORPAY_KEY_SECRET &&
                          !process.env.RAZORPAY_KEY_SECRET.includes('mock');

      if (!hasRealKeys) {
        console.log('[RazorpayService] Live Razorpay credentials not configured. Running in simulation mode.');
        return {
          success: true,
          gatewayRef: `order_sim_${Date.now()}`,
          amount: parseFloat(amount),
          currency,
          status: 'CREATED',
          raw: { isSimulation: true },
        };
      }

      const instance = this._getInstance();

      const options = {
        amount: Math.round(amount * 100), // amount in paisa
        currency,
        receipt,
      };

      const order = await instance.orders.create(options);

      return {
        success: true,
        gatewayRef: order.id,
        amount,
        currency,
        status: order.status.toUpperCase(),
        raw: order,
      };
    } catch (err) {
      console.error('[Razorpay createOrder] Error:', err.message);
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Razorpay createOrder] Fallback to simulated order in development mode.');
        return {
          success: true,
          gatewayRef: `order_sim_${Date.now()}`,
          amount: parseFloat(amount),
          currency,
          status: 'CREATED',
          raw: { isSimulation: true, originalError: err.message },
        };
      }
      throw err;
    }
  }

  /**
   * Verify signature of Razorpay webhook events.
   * @param {any} payload - The raw request body
   * @param {string} signature - The x-razorpay-signature header
   * @returns {Promise<boolean>}
   */
  async verifySignature(payload, signature) {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_mocksecret';
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      return expectedSignature === signature;
    } catch (err) {
      console.error('[Razorpay verifySignature] Error:', err.message);
      return false;
    }
  }

  /**
   * Fetch payment details from Razorpay.
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<import('./PaymentGatewayInterface').PaymentResult>}
   */
  async fetchPayment(paymentId) {
    try {
      if (typeof paymentId === 'string' && paymentId.startsWith('order_sim_')) {
        return {
          success: true,
          gatewayRef: paymentId,
          amount: 0,
          currency: 'INR',
          status: 'CAPTURED',
          raw: { isSimulation: true }
        };
      }

      const instance = this._getInstance();
      const payment = await instance.payments.fetch(paymentId);
      return {
        success: payment.status === 'captured',
        gatewayRef: payment.order_id,
        amount: payment.amount / 100, // normalized to INR rupees
        currency: payment.currency,
        status: payment.status.toUpperCase(),
        raw: payment,
      };
    } catch (err) {
      console.error('[Razorpay fetchPayment] Error:', err.message);
      if (process.env.NODE_ENV !== 'production') {
        return {
          success: true,
          gatewayRef: paymentId,
          amount: 0,
          currency: 'INR',
          status: 'CAPTURED',
          raw: { isSimulation: true }
        };
      }
      throw err;
    }
  }

  /**
   * Process refund in Razorpay.
   * @param {string} paymentId - Razorpay payment ID to refund
   * @param {number} amount - Amount in INR rupees to refund
   * @returns {Promise<import('./PaymentGatewayInterface').PaymentResult>}
   */
  async refund(paymentId, amount) {
    const hasRealKeys = process.env.RAZORPAY_KEY_ID && 
                        !process.env.RAZORPAY_KEY_ID.includes('mock') && 
                        process.env.RAZORPAY_KEY_SECRET &&
                        !process.env.RAZORPAY_KEY_SECRET.includes('mock');

    if (!hasRealKeys || (typeof paymentId === 'string' && paymentId.startsWith('order_sim_'))) {
      return {
        success: true,
        gatewayRef: `rfnd_sim_${Date.now()}`,
        amount: parseFloat(amount || 0),
        currency: 'INR',
        status: 'REFUNDED',
        raw: { isSimulation: true }
      };
    }

    try {
      const instance = this._getInstance();
      let refundAmountInPaisa = amount ? Math.round(amount * 100) : null;

      // Check payment status and remaining refundable balance on Razorpay
      try {
        const paymentDetails = await instance.payments.fetch(paymentId);
        if (paymentDetails && paymentDetails.amount) {
          const alreadyRefunded = paymentDetails.amount_refunded || 0;
          const maxAvailablePaisa = Math.max(0, paymentDetails.amount - alreadyRefunded);

          if (maxAvailablePaisa === 0) {
            console.log('[Razorpay refund] Payment was already fully refunded on Razorpay.');
            const existingRefundId = (paymentDetails.refunds?.items?.[0]?.id) || paymentDetails.id || `rfnd_${Date.now()}`;
            return {
              success: true,
              gatewayRef: existingRefundId,
              amount: parseFloat(amount || 0),
              currency: paymentDetails.currency || 'INR',
              status: 'REFUNDED',
              raw: paymentDetails,
            };
          }

          if (refundAmountInPaisa && refundAmountInPaisa > maxAvailablePaisa) {
            console.warn(`[Razorpay refund] Requested refund (${refundAmountInPaisa} paise) exceeds available balance (${maxAvailablePaisa} paise). Auto-capping to ${maxAvailablePaisa} paise.`);
            refundAmountInPaisa = maxAvailablePaisa;
          }
        }
      } catch (fetchErr) {
        console.warn('[Razorpay refund] Pre-fetch payment warning:', fetchErr.message);
      }

      const options = {};
      if (refundAmountInPaisa) {
        options.amount = refundAmountInPaisa;
      }

      const refundObj = await instance.payments.refund(paymentId, options);
      return {
        success: refundObj.status === 'processed' || refundObj.status === 'pending' || !!refundObj.id,
        gatewayRef: refundObj.id,
        amount: refundObj.amount / 100,
        currency: refundObj.currency,
        status: (refundObj.status || 'PROCESSED').toUpperCase(),
        raw: refundObj,
      };
    } catch (err) {
      const errorDescription = err?.error?.description || err?.message || 'Payment gateway rejected refund request';
      console.error('[Razorpay refund] Error:', errorDescription);
      return {
        success: false,
        status: errorDescription,
        error: err?.error || err,
      };
    }
  }
}

module.exports = new RazorpayService();
