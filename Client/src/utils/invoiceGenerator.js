/**
 * Customer Tax Invoice Generator for Billu Bazaar (Client Portal)
 * Features: Luxury Branding, Logo/Origin Resolution, Billed & Shipped To Addresses,
 * Razorpay Payment & Order Summary, Itemized Product Details with Thumbnails & Variants,
 * Financial Breakdown, and Optimized A4 PDF / Print Stylesheet.
 */

import { getImageUrl } from './imageUrl';
import { getPlaceholderSvg } from './placeholder';

// Standard Indian GST State Code Mapping
export const STATE_CODE_MAP = {
  'JAMMU AND KASHMIR': '01',
  'HIMACHAL PRADESH': '02',
  'PUNJAB': '03',
  'CHANDIGARH': '04',
  'UTTARAKHAND': '05',
  'HARYANA': '06',
  'DELHI': '07',
  'RAJASTHAN': '08',
  'UTTAR PRADESH': '09',
  'BIHAR': '10',
  'SIKKIM': '11',
  'ARUNACHAL PRADESH': '12',
  'NAGALAND': '13',
  'MANIPUR': '14',
  'MIZORAM': '15',
  'TRIPURA': '16',
  'MEGHALAYA': '17',
  'ASSAM': '18',
  'WEST BENGAL': '19',
  'JHARKHAND': '20',
  'ODISHA': '21',
  'CHHATTISGARH': '22',
  'MADHYA PRADESH': '23',
  'GUJARAT': '24',
  'DAMAN AND DIU': '25',
  'DADRA AND NAGAR HAVELI': '26',
  'MAHARASHTRA': '27',
  'ANDHRA PRADESH': '28',
  'KARNATAKA': '29',
  'GOA': '30',
  'LAKSHADWEEP': '31',
  'KERALA': '32',
  'TAMIL NADU': '33',
  'PUDUCHERRY': '34',
  'ANDAMAN AND NICOBAR ISLANDS': '35',
  'TELANGANA': '36',
  'ANDHRA PRADESH (NEW)': '37',
  'LADAKH': '38'
};

/**
 * Retrieve GST Billing & Seller Details from ENV (VITE_GST_BILLING JSON or individual vars)
 */
export const getSellerGstConfig = () => {
  let jsonConfig = {};
  if (import.meta.env.VITE_GST_BILLING) {
    try {
      jsonConfig = typeof import.meta.env.VITE_GST_BILLING === 'string'
        ? JSON.parse(import.meta.env.VITE_GST_BILLING)
        : import.meta.env.VITE_GST_BILLING;
    } catch (e) {
      console.warn('[invoiceGenerator] Failed to parse VITE_GST_BILLING JSON:', e);
    }
  }

  return {
    companyName: jsonConfig.companyName || import.meta.env.VITE_GST_COMPANY_NAME || 'Billu Bazaar Private Limited',
    gstin: jsonConfig.gstin || import.meta.env.VITE_GSTIN || '33ABCDE1234F1Z5',
    pan: jsonConfig.pan || import.meta.env.VITE_GST_PAN || 'ABCDE1234F',
    state: jsonConfig.state || import.meta.env.VITE_GST_STATE || 'Tamil Nadu',
    stateCode: jsonConfig.stateCode || import.meta.env.VITE_GST_STATE_CODE || '33',
    address: jsonConfig.address || import.meta.env.VITE_GST_ADDRESS || 'Door No. 12/A, Luxury Commercial Avenue, Anna Salai, Chennai, Tamil Nadu - 600002',
    email: jsonConfig.email || import.meta.env.VITE_GST_EMAIL || import.meta.env.VITE_SUPPORT_EMAIL || 'support@billubazaar.com',
    phone: jsonConfig.phone || import.meta.env.VITE_GST_PHONE || import.meta.env.VITE_SUPPORT_PHONE || '+91 91638 24881',
    website: jsonConfig.website || import.meta.env.VITE_GST_WEBSITE || 'www.billubazaar.com',
  };
};

/**
 * Robust Variant Formatter
 */
export const formatVariantAttributes = (rawVar) => {
  if (!rawVar) return '';
  let parsed = rawVar;
  for (let i = 0; i < 4; i++) {
    if (typeof parsed === 'string') {
      const trimmed = parsed.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          break;
        }
      } else {
        break;
      }
    }
  }

  if (Array.isArray(parsed) && parsed.length > 0) parsed = parsed[0];

  if (parsed && typeof parsed === 'object') {
    const entries = Object.entries(parsed).filter(
      ([k, v]) => v !== undefined && v !== null && v !== '' &&
      !['id', 'createdAt', 'updatedAt', 'productId', 'price', 'stock', 'sku', 'image', 'gstRate', 'variantId'].includes(k)
    );
    if (entries.length > 0) {
      return entries.map(([k, v]) => `${k}: ${v}`).join(' | ');
    }
  }

  if (typeof parsed === 'string' && parsed !== '{}' && parsed !== '[]') {
    return parsed;
  }
  return '';
};

/**
 * Convert number into Words (Indian numbering format: Lakhs, Crores, Thousands)
 */
export const numberToWords = (num, currency = 'INR') => {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return currency === 'AED' ? 'Zero Dirhams Only' : 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBelowThousand = (val) => {
    let str = '';
    if (val >= 100) {
      str += units[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      str += tens[Math.floor(val / 10)] + ' ';
      val %= 10;
    }
    if (val > 0) {
      str += units[val] + ' ';
    }
    return str.trim();
  };

  let word = '';
  let rem = n;

  if (currency === 'INR') {
    const crore = Math.floor(rem / 10000000);
    rem %= 10000000;
    const lakh = Math.floor(rem / 100000);
    rem %= 100000;
    const thousand = Math.floor(rem / 1000);
    rem %= 1000;

    if (crore > 0) word += convertBelowThousand(crore) + ' Crore ';
    if (lakh > 0) word += convertBelowThousand(lakh) + ' Lakh ';
    if (thousand > 0) word += convertBelowThousand(thousand) + ' Thousand ';
    if (rem > 0) word += convertBelowThousand(rem) + ' ';

    return `Indian Rupees ${word.trim()} Only`;
  } else {
    // International / AED formatting
    const million = Math.floor(rem / 1000000);
    rem %= 1000000;
    const thousand = Math.floor(rem / 1000);
    rem %= 1000;

    if (million > 0) word += convertBelowThousand(million) + ' Million ';
    if (thousand > 0) word += convertBelowThousand(thousand) + ' Thousand ';
    if (rem > 0) word += convertBelowThousand(rem) + ' ';

    return `AED ${word.trim()} Only`;
  }
};

/**
 * Generate Complete Customer Tax Invoice HTML matching the modern luxury design
 */
export const generateInvoiceHTML = (order) => {
  const seller = getSellerGstConfig();
  const currency = order.currency === 'AED' ? 'AED' : 'INR';
  const currencySymbol = currency === 'AED' ? 'AED ' : '₹';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const fmt = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const orderNum = String(order.orderNumber || (order.id ? `BB${String(order.id).slice(-8).toUpperCase()}` : 'BB1001')).replace(/^#/, '');
  const invoiceNum = `INV-${orderNum}`;
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const invoiceDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Parse addresses
  let shipping = order.shippingAddress || {};
  let billing = order.billingAddress || shipping;
  if (typeof shipping === 'string') {
    try { shipping = JSON.parse(shipping); } catch { shipping = {}; }
  }
  if (typeof billing === 'string') {
    try { billing = JSON.parse(billing); } catch { billing = {}; }
  }

  // Customer / Recipient details
  const buyerName = billing.fullName || billing.name || shipping.fullName || shipping.name || order.customer?.name || order.user?.name || 'Customer';
  const buyerPhone = billing.phone || billing.mobile || shipping.phone || shipping.mobile || order.customer?.phone || order.user?.phone || '';
  const buyerEmail = billing.email || shipping.email || order.customer?.email || order.user?.email || '';

  // Format Address Lines
  const formatAddressBlock = (addr) => {
    const line1 = [addr.flatHouse, addr.line1, addr.address, addr.street].filter(Boolean).join(', ');
    const line2 = [addr.areaStreet, addr.line2, addr.landmark ? `Near ${addr.landmark}` : ''].filter(Boolean).join(', ');
    const cityStatePin = [
      addr.city,
      addr.state,
      addr.pincode || addr.zipCode || addr.postalCode
    ].filter(Boolean).join(' ');
    const country = addr.country || 'India';

    return {
      line1: line1 || 'Address details on file',
      line2,
      cityStatePin,
      country
    };
  };

  const shippingAddrFormatted = formatAddressBlock(shipping);
  const billingAddrFormatted = formatAddressBlock(billing);
  const isSameAddress = JSON.stringify(shippingAddrFormatted) === JSON.stringify(billingAddrFormatted);

  // Parse status timeline
  let timelineObj = order.statusTimeline || {};
  if (typeof timelineObj === 'string') {
    try { timelineObj = JSON.parse(timelineObj); } catch (e) { timelineObj = {}; }
  }

  // Payment Details & Status Resolution
  let rawPaymentMethod = order.paymentMethod || 'Online Payment';
  const rawLower = String(rawPaymentMethod).toLowerCase();
  if (rawLower.includes('razorpay') || rawLower.includes('online') || rawPaymentMethod === 'CARD' || rawPaymentMethod === 'UPI' || rawPaymentMethod === 'NETBANKING') {
    rawPaymentMethod = 'Razorpay Secure Online';
  } else if (rawPaymentMethod.toUpperCase() === 'COD' || rawLower.includes('cash')) {
    rawPaymentMethod = 'Cash on Delivery (COD)';
  }

  const isCod = rawPaymentMethod.includes('Cash on Delivery') || rawPaymentMethod === 'COD';
  const orderStatusUpper = String(order.status || '').toUpperCase();
  const paymentStatusUpper = String(order.paymentStatus || '').toUpperCase();
  const isCancelled = orderStatusUpper === 'CANCELLED' || orderStatusUpper === 'CANCELED';
  const isRefunded = paymentStatusUpper === 'REFUNDED' || Boolean(timelineObj.refundStatus && timelineObj.refundStatus !== 'NONE');
  const isPaid = paymentStatusUpper === 'PAID' || orderStatusUpper === 'PAID';

  let paymentStatusBadge = 'PENDING';
  let badgeClass = 'badge-pending';

  if (isCancelled) {
    if (isRefunded) {
      paymentStatusBadge = 'CANCELLED · REFUNDED';
      badgeClass = 'badge-cancelled';
    } else {
      paymentStatusBadge = 'CANCELLED';
      badgeClass = 'badge-cancelled';
    }
  } else if (isRefunded) {
    paymentStatusBadge = 'REFUNDED';
    badgeClass = 'badge-refunded';
  } else if (isPaid) {
    paymentStatusBadge = 'PAID';
    badgeClass = 'badge-paid';
  } else if (isCod) {
    paymentStatusBadge = 'PAY ON DELIVERY';
    badgeClass = 'badge-pending';
  } else {
    paymentStatusBadge = order.paymentStatus || 'PENDING';
    badgeClass = 'badge-pending';
  }

  // Transaction reference (Razorpay payment ID, Razorpay order ID, or gateway reference)
  const transactionRef = order.razorpay_payment_id || order.razorpayPaymentId || order.razorpay_order_id || order.razorpayOrderId || order.paymentGatewayRef || (isCod ? 'COD-ORDER' : `order_${String(order.id || orderNum).replace(/[^a-zA-Z0-9]/g, '').slice(0, 14)}`);

  // Items processing
  const items = order.items || order.OrderItems || [];
  let subtotalCalc = 0;

  const processedItems = items.map((item, idx) => {
    const qty = Number(item.quantity || item.qty || 1);
    const unitPrice = Number(item.unitPrice || item.price || 0);
    const lineTotal = unitPrice * qty;
    subtotalCalc += lineTotal;

    const variantText = formatVariantAttributes(item.selectedVariant || item.variant);
    
    // Resolve item thumbnail image
    let rawImg = item.image || item.product?.images?.[0] || item.Product?.images?.[0] || item.product?.image || item.variant?.image;
    let imgUrl = '';
    if (rawImg) {
      imgUrl = getImageUrl(rawImg);
      if (imgUrl && imgUrl.startsWith('/') && origin) {
        imgUrl = `${origin}${imgUrl}`;
      }
    } else {
      imgUrl = getPlaceholderSvg(item.productName || item.name || 'Product');
    }

    return {
      index: idx + 1,
      name: item.productName || item.name || item.product?.title || 'Luxury Product',
      variantText,
      imgUrl,
      qty,
      unitPrice,
      lineTotal
    };
  });

  const subtotal = Number(order.subtotal || subtotalCalc);
  const discountAmount = Number(order.discountAmount || order.discount || 0);
  const couponDiscount = Number(order.couponDiscount || 0);
  const loyaltyDiscount = Number(order.loyaltyDiscount || 0);

  let resolvedCoupon = couponDiscount;
  let resolvedLoyalty = loyaltyDiscount;

  if (resolvedCoupon === 0 && resolvedLoyalty === 0 && discountAmount > 0) {
    if (order.couponId || order.coupon) {
      resolvedCoupon = discountAmount;
    } else {
      resolvedLoyalty = discountAmount;
    }
  }

  const shippingAmount = Number(order.shippingAmount || 0);
  const explicitGw = Number(order.giftWrapFee || order.giftWrapPrice || 0);
  const calculatedGwDiff = Math.round(Number(order.totalAmount || 0) - (subtotal + shippingAmount - discountAmount));
  const giftWrapFee = explicitGw > 0 ? explicitGw : (calculatedGwDiff > 0 ? calculatedGwDiff : 0);
  const grandTotal = Number(order.totalAmount || (subtotal + shippingAmount + giftWrapFee - discountAmount));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <base href="${origin}/" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoiceNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      background-color: #f8fafc;
      padding: 28px 20px;
      font-size: 12px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* Screen Action Bar */
    .no-print-bar {
      max-width: 820px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }

    .btn-print {
      background: #c58837;
      color: #ffffff;
      border: none;
      padding: 9px 20px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .btn-print:hover { background: #ad742b; }

    /* Invoice Container */
    .invoice-wrapper {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 36px 40px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }

    /* Header */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 22px;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .brand-logo-img {
      width: 56px;
      height: 56px;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      padding: 2px;
    }

    .brand-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 26px;
      font-weight: 800;
      color: #111827;
      letter-spacing: 2px;
      line-height: 1.1;
      text-transform: uppercase;
    }

    .brand-tagline {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      color: #c58837;
      font-weight: 700;
      margin-top: 4px;
    }

    .brand-support {
      font-size: 11px;
      color: #64748b;
      margin-top: 6px;
    }

    .invoice-meta-section {
      text-align: right;
    }

    .invoice-heading {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 22px;
      font-weight: 800;
      color: #c58837;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .meta-line {
      font-size: 11.5px;
      color: #4b5563;
      margin-bottom: 3px;
    }
    .meta-line strong {
      color: #111827;
    }

    .badge-status {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 12px;
      border-radius: 12px;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .badge-paid {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .badge-pending {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .badge-cancelled {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fca5a5;
    }
    .badge-refunded {
      background: #f3e8ff;
      color: #6b21a8;
      border: 1px solid #d8b4fe;
    }

    /* Watermark for Cancelled / Refunded */
    .watermark-cancelled {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-28deg);
      font-size: 58px;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.12);
      border: 5px solid rgba(220, 38, 38, 0.18);
      padding: 8px 36px;
      border-radius: 10px;
      letter-spacing: 6px;
      pointer-events: none;
      text-transform: uppercase;
      z-index: 5;
    }

    /* Cancellation & Refund Alert Banner */
    .cancellation-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #ef4444;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 22px;
    }

    /* Gold Divider */
    .divider-gold {
      height: 2px;
      background: #c58837;
      margin-bottom: 24px;
      opacity: 0.85;
    }

    /* 2-Column Info Cards */
    .info-cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }

    .info-card {
      background: #fafbfc;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
      padding: 16px 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .card-header-title {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #64748b;
      margin-bottom: 10px;
    }

    .card-customer-name {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }

    .card-address-text {
      font-size: 11.5px;
      color: #4b5563;
      line-height: 1.5;
    }

    .card-contact-text {
      margin-top: 8px;
      font-size: 11px;
      color: #64748b;
    }

    .summary-item-line {
      display: flex;
      margin-bottom: 6px;
      font-size: 11.5px;
      line-height: 1.4;
    }
    .summary-item-label {
      color: #111827;
      font-weight: 700;
      min-width: 130px;
    }
    .summary-item-value {
      color: #4b5563;
      flex: 1;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .items-table thead tr {
      background: #111827;
      color: #ffffff;
    }

    .items-table th {
      padding: 10px 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      text-align: left;
    }

    .items-table th.col-center, .items-table td.col-center {
      text-align: center;
    }
    .items-table th.col-right, .items-table td.col-right {
      text-align: right;
    }

    .items-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }

    .items-table td {
      padding: 14px 12px;
      vertical-align: middle;
      color: #1e293b;
      font-size: 12px;
    }

    .item-desc-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .product-thumbnail {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      flex-shrink: 0;
    }

    .item-title {
      font-weight: 600;
      color: #111827;
      font-size: 12.5px;
    }

    .item-variants {
      font-size: 10.5px;
      color: #c58837;
      font-weight: 600;
      margin-top: 2px;
    }

    /* Financial Summary (Bottom Right) */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }

    .totals-box {
      width: 320px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 12px;
      color: #4b5563;
    }

    .totals-row.discount {
      color: #16a34a;
      font-weight: 600;
    }

    .totals-row.grand-total {
      border-top: 2px solid #c58837;
      border-bottom: 2px solid #c58837;
      padding: 10px 0;
      margin-top: 6px;
      font-size: 15px;
      font-weight: 800;
      color: #c58837;
    }

    /* Footer */
    .invoice-footer {
      border-top: 1px solid #f1f5f9;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      color: #94a3b8;
    }

    /* Print Specific Rules */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        font-size: 11pt !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .invoice-wrapper {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .items-table thead tr {
        background: #111827 !important;
        color: #ffffff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .divider-gold, .totals-row.grand-total {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .badge-paid {
        background: #dcfce7 !important;
        color: #15803d !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .badge-cancelled {
        background: #fee2e2 !important;
        color: #b91c1c !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .badge-refunded {
        background: #f3e8ff !important;
        color: #6b21a8 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .watermark-cancelled {
        display: block !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .cancellation-banner {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
    }
  </style>
</head>
<body>

  <!-- Action Bar (Screen Only) -->
  <div class="no-print-bar">
    <div style="font-weight: 600; color: #1e293b; font-size: 13px;">
      ${isCancelled ? 'Cancelled Invoice Preview' : 'Tax Invoice Preview'} <span style="font-weight: normal; color: #64748b; font-size: 11.5px;">(#${orderNum})</span>
    </div>
    <button onclick="window.print()" class="btn-print">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <!-- Document Container -->
  <div class="invoice-wrapper" style="position: relative; overflow: hidden;">

    ${isCancelled ? `<div class="watermark-cancelled">${isRefunded ? 'CANCELLED' : 'CANCELLED'}</div>` : ''}

    <!-- Header Section -->
    <div class="invoice-header">
      <div class="brand-section">
        <img 
          src="${origin}/logo.png" 
          onerror="this.onerror=null; this.src='${origin}/logo.jpg';" 
          alt="Billu Bazaar" 
          class="brand-logo-img" 
        />
        <div>
          <div class="brand-title">BILLU BAZAAR</div>
          <div class="brand-tagline">LUXURY SHOPPING EXPERIENCE</div>
          <div class="brand-support">Support: ${seller.email} | ${seller.phone}</div>
        </div>
      </div>

      <div class="invoice-meta-section">
        <div class="invoice-heading" style="${isCancelled ? 'color: #dc2626;' : ''}">
          ${isCancelled ? 'CANCELLED INVOICE' : 'TAX INVOICE'}
        </div>
        <div class="meta-line">Invoice No: <strong>${invoiceNum}</strong></div>
        <div class="meta-line">Order Ref: <strong>#${orderNum}</strong></div>
        <div class="meta-line">Date: <strong>${invoiceDate}</strong></div>
        <div>
          <span class="badge-status ${badgeClass}">
            ${paymentStatusBadge}
          </span>
        </div>
      </div>
    </div>

    ${isCancelled ? `
    <!-- Cancellation & Refund Notice Banner -->
    <div class="cancellation-banner">
      <div style="font-weight: 700; font-size: 12px; color: #b91c1c; display: flex; align-items: center; gap: 6px;">
        ⚠️ ORDER CANCELLED ${isRefunded ? '· FULL REFUND PROCESSED' : ''}
      </div>
      <div style="font-size: 11px; color: #7f1d1d; margin-top: 4px; line-height: 1.4;">
        ${timelineObj.cancelReason ? `<strong>Reason:</strong> ${timelineObj.cancelReason} &nbsp;·&nbsp; ` : ''}
        ${timelineObj.refundNote || (isRefunded ? '100% refund has been processed to the original payment method.' : 'Order has been cancelled. No payment was collected.')}
      </div>
    </div>
    ` : ''}

    <!-- Accent Divider -->
    <div class="divider-gold"></div>

    <!-- 2 Column Address & Summary Section -->
    <div class="info-cards-grid">
      
      <!-- Billed & Shipped To Address Card -->
      <div class="info-card">
        <div class="card-header-title">
          ${isSameAddress ? 'BILLED & SHIPPED TO' : 'BILLED TO'}
        </div>
        <div class="card-customer-name">${buyerName}</div>
        <div class="card-address-text">
          ${billingAddrFormatted.line1}<br/>
          ${billingAddrFormatted.line2 ? `${billingAddrFormatted.line2}<br/>` : ''}
          ${billingAddrFormatted.cityStatePin}<br/>
          <strong>${billingAddrFormatted.country}</strong>
        </div>
        <div class="card-contact-text">
          ${buyerPhone ? `Phone: +91${buyerPhone.replace(/^\+?91/, '')}` : ''}
          ${buyerPhone && buyerEmail ? ' | ' : ''}
          ${buyerEmail ? `Email: ${buyerEmail}` : ''}
        </div>
        
        ${!isSameAddress ? `
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e2e8f0;">
            <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Shipped To:</div>
            <div style="font-size: 11px; color: #475569;">
              ${shippingAddrFormatted.line1}, ${shippingAddrFormatted.cityStatePin}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Payment & Shipping Summary Card -->
      <div class="info-card">
        <div class="card-header-title">PAYMENT & SHIPPING SUMMARY</div>
        
        <div class="summary-item-line">
          <div class="summary-item-label">Payment Method:</div>
          <div class="summary-item-value">${rawPaymentMethod}</div>
        </div>

        <div class="summary-item-line">
          <div class="summary-item-label">Transaction Ref:</div>
          <div class="summary-item-value" style="font-family: monospace; font-size: 11px; word-break: break-all;">
            ${transactionRef}
          </div>
        </div>

        <div class="summary-item-line">
          <div class="summary-item-label">Order Date:</div>
          <div class="summary-item-value">${orderDate}</div>
        </div>

        ${order.trackingNumber ? `
          <div class="summary-item-line">
            <div class="summary-item-label">Tracking Number:</div>
            <div class="summary-item-value" style="font-family: monospace;">${order.trackingNumber}</div>
          </div>
        ` : ''}

        ${order.deliveryPartner ? `
          <div class="summary-item-line">
            <div class="summary-item-label">Courier:</div>
            <div class="summary-item-value">${order.deliveryPartner}</div>
          </div>
        ` : ''}
      </div>

    </div>

    <!-- Product Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 35px;" class="col-center">#</th>
          <th>ITEM DESCRIPTION</th>
          <th style="width: 60px;" class="col-center">QTY</th>
          <th style="width: 110px;" class="col-right">UNIT PRICE</th>
          <th style="width: 110px;" class="col-right">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${processedItems.map(item => `
          <tr>
            <td class="col-center" style="font-weight: 600; color: #64748b;">${item.index}</td>
            <td>
              <div class="item-desc-cell">
                <img src="${item.imgUrl}" alt="${item.name}" class="product-thumbnail" />
                <div>
                  <div class="item-title">${item.name}</div>
                  ${item.variantText ? `<div class="item-variants">${item.variantText}</div>` : ''}
                </div>
              </div>
            </td>
            <td class="col-center" style="font-weight: 700;">${item.qty}</td>
            <td class="col-right">${fmt(item.unitPrice)}</td>
            <td class="col-right" style="font-weight: 700;">${fmt(item.lineTotal)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Financial Breakdown Section -->
    <div class="totals-wrapper">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span style="font-weight: 600; color: #111827;">${fmt(subtotal)}</span>
        </div>

        ${resolvedCoupon > 0 ? `
          <div class="totals-row discount">
            <span>Coupon Discount${order.coupon?.code ? ` (${order.coupon.code})` : ''}</span>
            <span>-${fmt(resolvedCoupon)}</span>
          </div>
        ` : ''}

        ${resolvedLoyalty > 0 ? `
          <div class="totals-row discount">
            <span>Loyalty Points Redeemed${order.redeemedPoints ? ` (${order.redeemedPoints} pts)` : ''}</span>
            <span>-${fmt(resolvedLoyalty)}</span>
          </div>
        ` : ''}

        ${giftWrapFee > 0 ? `
          <div class="totals-row">
            <span>Gift Wrapping Fee</span>
            <span>${fmt(giftWrapFee)}</span>
          </div>
        ` : ''}

        <div class="totals-row">
          <span>Shipping Fee</span>
          <span style="font-weight: 600; color: #111827;">
            ${shippingAmount === 0 ? 'FREE' : fmt(shippingAmount)}
          </span>
        </div>

        <div class="totals-row grand-total">
          <span>Grand Total</span>
          <span>${fmt(grandTotal)}</span>
        </div>
      </div>
    </div>

    <!-- Footer Note -->
    <div class="invoice-footer">
      <div>This is a computer-generated tax invoice and requires no physical signature.</div>
      <div>Thank you for shopping with <strong>Billu Bazaar</strong>.</div>
    </div>

  </div>

</body>
</html>
  `;
};

/**
 * Trigger print dialog with the generated invoice HTML
 */
export const printInvoice = (order) => {
  if (!order) return;
  const html = generateInvoiceHTML(order);
  const printWindow = window.open('', '_blank', 'width=950,height=850');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
};
