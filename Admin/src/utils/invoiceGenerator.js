/**
 * Professional GST Tax Invoice Generator for Billu Bazaar
 * Features: Complete Indian GST Compliance, UAE VAT Compatibility, Logo Header,
 * HSN/SAC Codes, Intra-State (CGST+SGST) vs Inter-State (IGST) Auto-Detection,
 * Reverse Charge Indicator, Amount in Words, and Print-Optimized Layout.
 */

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
 * Generate Complete Professional GST Tax Invoice HTML
 */
export const generateInvoiceHTML = (order) => {
  const seller = getSellerGstConfig();
  const currency = order.currency === 'AED' ? 'AED' : 'INR';
  const currencySymbol = currency === 'AED' ? 'AED ' : '₹';

  const fmt = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const orderNum = order.orderNumber || `BB${order.id}`;
  const invoiceNum = `INV-${orderNum}`;
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
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

  // Recipient details
  const buyerName = billing.fullName || billing.name || shipping.fullName || shipping.name || order.customer?.name || 'Customer';
  const buyerPhone = billing.phone || billing.mobile || shipping.phone || shipping.mobile || order.customer?.phone || '—';
  const buyerEmail = billing.email || shipping.email || order.customer?.email || '—';
  const buyerGstin = billing.gstin || shipping.gstin || order.customer?.gstin || '';

  // Determine buyer state & code
  const rawState = (shipping.state || billing.state || seller.state || '').trim();
  const normalizedState = rawState.toUpperCase();
  const buyerStateCode = STATE_CODE_MAP[normalizedState] || billing.stateCode || shipping.stateCode || seller.stateCode;
  const isIntraState = currency === 'INR' && (buyerStateCode === seller.stateCode || normalizedState === seller.state.toUpperCase());

  // Determine Payment Details
  const rawPaymentMethod = order.paymentMethod || 'Online Payment';
  const isCod = rawPaymentMethod === 'COD' || rawPaymentMethod?.includes('Cash on Delivery');
  const isPaid = order.paymentStatus === 'PAID' || order.status === 'PAID' || (!isCod && order.paymentStatus !== 'FAILED' && order.paymentStatus !== 'PENDING');
  const paymentStatusText = isPaid ? 'PAID' : (isCod ? 'PAY ON DELIVERY' : (order.paymentStatus || 'PENDING'));
  const transactionRef = order.razorpay_payment_id || order.paymentGatewayRef || (isCod ? 'COD-ORDER' : 'N/A');

  // Items processing with GST breakdowns
  const items = order.items || order.OrderItems || [];
  let totalTaxableValue = 0;
  let totalCgstAmount = 0;
  let totalSgstAmount = 0;
  let totalIgstAmount = 0;

  const defaultFallbackRate = (order.taxRate !== undefined && order.taxRate !== null && !isNaN(Number(order.taxRate)) && Number(order.taxRate) >= 0)
    ? Number(order.taxRate)
    : (currency === 'AED' ? 5 : 18);

  const processedItems = items.map((item, idx) => {
    const qty = Number(item.quantity || item.qty || 1);
    const lineGrossPrice = Number(item.unitPrice || item.price || 0) * qty;
    const rawRate = item.gstRate ?? item.taxRate ?? item.variant?.gstRate ?? item.product?.gstRate ?? item.selectedVariant?.gstRate ?? order.taxRate ?? defaultFallbackRate;
    const parsedRate = typeof rawRate === 'number' ? rawRate : parseFloat(String(rawRate).replace(/[^0-9.]/g, ''));
    const gstRate = !isNaN(parsedRate) ? parsedRate : defaultFallbackRate;
    const hsnCode = item.hsn || item.hsnCode || item.product?.hsn || (item.variant?.sku ? '8517' : '6109');

    // Backward-calculate Taxable Value from Gross (Inclusive Pricing Model)
    const taxableValue = lineGrossPrice / (1 + (gstRate / 100));
    const taxAmount = lineGrossPrice - taxableValue;
    const unitRate = taxableValue / qty;

    totalTaxableValue += taxableValue;

    let cgstRate = 0, cgstAmt = 0;
    let sgstRate = 0, sgstAmt = 0;
    let igstRate = 0, igstAmt = 0;

    if (currency === 'INR') {
      if (isIntraState) {
        cgstRate = gstRate / 2;
        sgstRate = gstRate / 2;
        cgstAmt = taxAmount / 2;
        sgstAmt = taxAmount / 2;
        totalCgstAmount += cgstAmt;
        totalSgstAmount += sgstAmt;
      } else {
        igstRate = gstRate;
        igstAmt = taxAmount;
        totalIgstAmount += igstAmt;
      }
    } else {
      // VAT for UAE
      igstRate = gstRate;
      igstAmt = taxAmount;
      totalIgstAmount += igstAmt;
    }

    const variantText = formatVariantAttributes(item.selectedVariant || item.variant);
    const sku = item.variant?.sku || item.sku || '';

    return {
      index: idx + 1,
      name: item.productName || item.name || 'Luxury Product',
      variantText,
      sku,
      hsnCode,
      qty,
      unitRate,
      taxableValue,
      gstRate,
      cgstRate,
      cgstAmt,
      sgstRate,
      sgstAmt,
      igstRate,
      igstAmt,
      lineGrossPrice
    };
  });

  const subtotal = Number(order.subtotal || totalTaxableValue);
  const discountAmount = Number(order.discountAmount || 0);
  const shippingAmount = Number(order.shippingAmount || 0);
  const giftWrapFee = Number(order.giftWrapFee || order.giftWrapPrice || 0);
  const grandTotal = Number(order.totalAmount || (subtotal + shippingAmount + giftWrapFee - discountAmount));

  const totalWords = numberToWords(grandTotal, currency);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GST Tax Invoice - ${invoiceNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      background-color: #f3f4f6;
      padding: 24px;
      font-size: 11.5px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }

    .no-print-bar {
      max-width: 860px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
      border: 1px solid #e5e7eb;
    }

    .btn-print {
      background: #c58837;
      color: #ffffff;
      border: none;
      padding: 9px 22px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .btn-print:hover { background: #ab722a; }

    .invoice-wrapper {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 28px 32px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }

    /* Header Section */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #c58837;
      padding-bottom: 18px;
      margin-bottom: 18px;
    }

    .brand-block {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .brand-logo {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #c58837;
      background: #1a1a1a;
    }

    .brand-name {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 24px;
      font-weight: 800;
      color: #1a1a1a;
      letter-spacing: 1.5px;
      line-height: 1.1;
    }
    .brand-name span { color: #c58837; }

    .brand-tagline {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #c58837;
      font-weight: 700;
      margin-top: 2px;
    }

    .seller-contact-meta {
      font-size: 10px;
      color: #4b5563;
      margin-top: 4px;
      line-height: 1.4;
      max-width: 360px;
    }

    .invoice-title-block {
      text-align: right;
    }

    .invoice-title-block h1 {
      font-family: 'Cinzel', serif;
      font-size: 20px;
      font-weight: 800;
      color: #c58837;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .invoice-subtitle {
      font-size: 9.5px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }

    .badge-paid {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 10px;
      display: inline-block;
      letter-spacing: 0.5px;
    }

    .badge-pending {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 10px;
      display: inline-block;
      letter-spacing: 0.5px;
    }

    /* Meta Details Bar */
    .meta-bar-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
      gap: 12px;
      margin-bottom: 18px;
    }

    .meta-col label {
      display: block;
      font-size: 9.5px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .meta-col p {
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Parties Section (Seller vs Buyer) */
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 18px;
    }

    .party-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      background: #fafafa;
    }

    .party-header {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 1px;
      color: #c58837;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      margin-bottom: 8px;
    }

    .party-name {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 3px;
    }

    .party-address {
      font-size: 11px;
      color: #475569;
      line-height: 1.45;
    }

    .party-tax-ids {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #e2e8f0;
      font-size: 10.5px;
      color: #334155;
    }

    /* GST Itemized Table */
    .gst-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 11px;
    }

    .gst-table th {
      background-color: #1a1a1a;
      color: #ffffff;
      padding: 9px 8px;
      text-align: left;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      border: 1px solid #1a1a1a;
    }

    .gst-table td {
      padding: 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    .gst-table tr:nth-child(even) {
      background-color: #fbfbfb;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }

    /* Summary & Total Section */
    .summary-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 16px;
      margin-bottom: 18px;
      align-items: start;
    }

    .words-and-notes {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
      background: #f8fafc;
    }

    .amount-words-title {
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }

    .amount-words-text {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      font-style: italic;
    }

    .summary-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 11px;
      color: #475569;
    }
    .summary-row span:last-child {
      font-weight: 600;
      color: #1e293b;
    }

    .summary-row.discount {
      color: #16a34a;
    }
    .summary-row.discount span:last-child {
      color: #16a34a;
    }

    .summary-grand-total {
      display: flex;
      justify-content: space-between;
      padding: 10px 12px;
      background: #1a1a1a;
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
    }
    .summary-grand-total span:last-child {
      color: #c58837;
      font-size: 14px;
    }

    /* Footer / Authorized Signatory */
    .invoice-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 10px;
    }

    .declaration-text {
      font-size: 9.5px;
      color: #64748b;
      max-width: 480px;
      line-height: 1.4;
    }

    .signatory-box {
      text-align: right;
      min-width: 220px;
    }

    .signatory-company {
      font-size: 10.5px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 36px;
    }

    .signatory-line {
      border-top: 1px solid #64748b;
      padding-top: 4px;
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Print Styles */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        font-size: 10.5pt !important;
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
      .gst-table th {
        background-color: #1a1a1a !important;
        color: #ffffff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .summary-grand-total {
        background-color: #1a1a1a !important;
        color: #ffffff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
    }
  </style>
</head>
<body>

  <!-- Screen-only Action Toolbar -->
  <div class="no-print-bar">
    <div>
      <strong style="color: #1e293b; font-size: 13px;">Tax Invoice Preview</strong>
      <span style="color: #64748b; font-size: 11px; margin-left: 8px;">(Order: ${orderNum})</span>
    </div>
    <button onclick="window.print()" class="btn-print">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <!-- Document Body -->
  <div class="invoice-wrapper">

    <!-- Header -->
    <div class="invoice-header">
      <div class="brand-block">
        <img src="/logo.png" onerror="this.src='/logo.jpg'; this.onerror=null;" alt="Billu Bazaar" class="brand-logo" />
        <div>
          <div class="brand-name">BILLU <span>BAZAAR</span></div>
          <div class="brand-tagline">Luxury Shopping Experience</div>
          <div class="seller-contact-meta">
            ${seller.companyName}<br/>
            ${seller.address}<br/>
            Email: ${seller.email} | Helpline: ${seller.phone} | ${seller.website}
          </div>
        </div>
      </div>

      <div class="invoice-title-block">
        <h1>TAX INVOICE</h1>
        <div class="invoice-subtitle">Original for Recipient</div>
        <div>
          <span class="${isPaid ? 'badge-paid' : 'badge-pending'}">
            ${paymentStatusText}
          </span>
        </div>
      </div>
    </div>

    <!-- Meta Details Bar -->
    <div class="meta-bar-grid">
      <div class="meta-col">
        <label>Invoice Number</label>
        <p>${invoiceNum}</p>
      </div>
      <div class="meta-col">
        <label>Invoice Date</label>
        <p>${invoiceDate}</p>
      </div>
      <div class="meta-col">
        <label>Order ID & Date</label>
        <p>${orderNum} <span style="font-size: 9.5px; font-weight: normal; color: #64748b;">(${orderDate})</span></p>
      </div>
      <div class="meta-col">
        <label>Place of Supply</label>
        <p>${rawState || seller.state} <span style="font-size: 9.5px; color: #64748b;">(Code: ${buyerStateCode})</span></p>
      </div>
    </div>

    <!-- Parties Grid -->
    <div class="parties-grid">
      <!-- Seller Box -->
      <div class="party-box">
        <div class="party-header">Details of Seller (Supplier)</div>
        <div class="party-name">${seller.companyName}</div>
        <div class="party-address">
          ${seller.address}<br/>
          State: <strong>${seller.state}</strong> (State Code: <strong>${seller.stateCode}</strong>)
        </div>
        <div class="party-tax-ids">
          <strong>GSTIN:</strong> ${seller.gstin} &nbsp;|&nbsp; <strong>PAN:</strong> ${seller.pan}<br/>
          <strong>Reverse Charge:</strong> No
        </div>
      </div>

      <!-- Buyer Box -->
      <div class="party-box">
        <div class="party-header">Details of Buyer (Billed & Shipped To)</div>
        <div class="party-name">${buyerName}</div>
        <div class="party-address">
          ${shipping.flatHouse || shipping.line1 || billing.flatHouse || billing.line1 || ''} 
          ${shipping.areaStreet || shipping.line2 || billing.areaStreet || billing.line2 || ''}<br/>
          ${shipping.landmark ? `Near ${shipping.landmark}, ` : ''}
          ${shipping.city || billing.city || ''}${shipping.state || billing.state ? `, ${shipping.state || billing.state}` : ''} - ${shipping.pincode || shipping.zipCode || billing.pincode || ''}<br/>
          Phone: <strong>${buyerPhone}</strong> &nbsp;|&nbsp; Email: ${buyerEmail}
        </div>
        <div class="party-tax-ids">
          <strong>Place of Supply:</strong> ${rawState || seller.state} (Code: ${buyerStateCode})
          ${buyerGstin ? `<br/><strong>Buyer GSTIN:</strong> ${buyerGstin}` : ''}
        </div>
      </div>
    </div>

    <!-- Itemized GST Table -->
    <table class="gst-table">
      <thead>
        <tr>
          <th style="width: 25px;" class="text-center">#</th>
          <th>Description of Goods</th>
          <th style="width: 55px;" class="text-center">HSN</th>
          <th style="width: 35px;" class="text-center">Qty</th>
          <th style="width: 75px;" class="text-right">Unit Rate</th>
          <th style="width: 80px;" class="text-right">Taxable Val</th>
          ${currency === 'INR' && isIntraState ? `
            <th style="width: 65px;" class="text-right">CGST</th>
            <th style="width: 65px;" class="text-right">SGST</th>
          ` : `
            <th style="width: 75px;" class="text-right">${currency === 'AED' ? 'VAT (5%)' : 'IGST'}</th>
          `}
          <th style="width: 90px;" class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${processedItems.map(item => `
          <tr>
            <td class="text-center">${item.index}</td>
            <td>
              <strong style="color: #0f172a;">${item.name}</strong>
              ${item.sku ? `<span style="font-size: 9.5px; color: #64748b; font-family: monospace; display: block;">SKU: ${item.sku}</span>` : ''}
              ${item.variantText ? `<span style="font-size: 9.5px; color: #c58837; display: block;">${item.variantText}</span>` : ''}
            </td>
            <td class="text-center font-mono" style="font-size: 10px;">${item.hsnCode}</td>
            <td class="text-center font-bold">${item.qty}</td>
            <td class="text-right">${fmt(item.unitRate)}</td>
            <td class="text-right font-bold">${fmt(item.taxableValue)}</td>
            ${currency === 'INR' && isIntraState ? `
              <td class="text-right" style="font-size: 10px;">
                <span style="color: #64748b;">${item.cgstRate}%</span><br/>${fmt(item.cgstAmt)}
              </td>
              <td class="text-right" style="font-size: 10px;">
                <span style="color: #64748b;">${item.sgstRate}%</span><br/>${fmt(item.sgstAmt)}
              </td>
            ` : `
              <td class="text-right" style="font-size: 10px;">
                <span style="color: #64748b;">${item.igstRate}%</span><br/>${fmt(item.igstAmt)}
              </td>
            `}
            <td class="text-right font-bold">${fmt(item.lineGrossPrice)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Summary & Words Section -->
    <div class="summary-grid">
      <!-- Left: Amount in words & Payment Details -->
      <div class="words-and-notes">
        <div class="amount-words-title">Invoice Amount in Words</div>
        <div class="amount-words-text">${totalWords}</div>

        <div style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 10px; color: #475569;">
          <p><strong>Payment Mode:</strong> ${rawPaymentMethod}</p>
          <p><strong>Transaction Ref:</strong> <span style="font-family: monospace;">${transactionRef}</span></p>
          ${order.trackingNumber ? `<p><strong>AWB Tracking ID:</strong> ${order.trackingNumber}</p>` : ''}
        </div>
      </div>

      <!-- Right: Financial Breakdown -->
      <div class="summary-box">
        <div class="summary-row">
          <span>Total Taxable Amount</span>
          <span>${fmt(totalTaxableValue)}</span>
        </div>
        ${currency === 'INR' && isIntraState ? `
          <div class="summary-row">
            <span>Total CGST</span>
            <span>${fmt(totalCgstAmount)}</span>
          </div>
          <div class="summary-row">
            <span>Total SGST</span>
            <span>${fmt(totalSgstAmount)}</span>
          </div>
        ` : `
          <div class="summary-row">
            <span>Total ${currency === 'AED' ? 'VAT (5%)' : 'IGST'}</span>
            <span>${fmt(totalIgstAmount)}</span>
          </div>
        `}
        ${giftWrapFee > 0 ? `
          <div class="summary-row">
            <span>Gift Wrapping Fee</span>
            <span>${fmt(giftWrapFee)}</span>
          </div>
        ` : ''}
        <div class="summary-row">
          <span>Shipping & Handling</span>
          <span>${shippingAmount === 0 ? 'FREE' : fmt(shippingAmount)}</span>
        </div>
        ${discountAmount > 0 ? `
          <div class="summary-row discount">
            <span>Discounts & Coupon</span>
            <span>-${fmt(discountAmount)}</span>
          </div>
        ` : ''}
        <div class="summary-grand-total">
          <span>Grand Total</span>
          <span>${fmt(grandTotal)}</span>
        </div>
      </div>
    </div>

    <!-- Footer & Signatory -->
    <div class="invoice-footer">
      <div class="declaration-text">
        <strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.<br/>
        <em>This is a computer-generated tax invoice and requires no signature.</em>
      </div>

      <div class="signatory-box">
        <div class="signatory-company">For <strong>${seller.companyName}</strong></div>
        <div class="signatory-line">Authorized Signatory</div>
      </div>
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
  const printWindow = window.open('', '_blank', 'width=950,height=800');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
};
