import { formatPrice } from './currency';

/**
 * generateInvoiceHTML — Generates a clean, professional, print-optimized Tax Invoice HTML document.
 * @param {Object} order - The order details object
 * @returns {string} HTML string ready for printing or downloading as PDF
 */
export const generateInvoiceHTML = (order) => {
  const currencyCode = order.currency || 'INR';
  const fmt = (amount) => formatPrice(amount, currencyCode, 1);

  const orderNum = order.orderNumber || `BB${order.id}`;
  const invoiceNum = `INV-${orderNum}`;
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const invoiceDate = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  let billing = order.shippingAddress || order.address || {};
  if (typeof billing === 'string') {
    try { billing = JSON.parse(billing); } catch (e) { billing = {}; }
  }
  const items = order.items || order.OrderItems || [];

  const subtotal = Number(order.subtotal) || items.reduce((acc, i) => acc + (Number(i.unitPrice || i.price) * Number(i.quantity || i.qty || 1)), 0);
  const discountAmount = Number(order.discountAmount) || 0;
  const shippingAmount = Number(order.shippingAmount) || 0;
  const taxAmount = Number(order.taxAmount) !== undefined && order.taxAmount !== null ? Number(order.taxAmount) : Math.round((Math.max(0, subtotal - discountAmount) * 5) / 105);
  const totalAmount = Number(order.totalAmount) || (subtotal - discountAmount + shippingAmount);

  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@billubazaar.com';
  const supportPhone = import.meta.env.VITE_SUPPORT_PHONE || '+91 98765 43210';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoiceNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #1a1a1a;
      background-color: #ffffff;
      padding: 30px;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      padding: 40px;
      border-radius: 8px;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #c5a059;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .brand-title {
      font-family: 'Cinzel', serif;
      font-size: 26px;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: 1px;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #c5a059;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-weight: 600;
      margin-top: 2px;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h1 {
      font-size: 20px;
      text-transform: uppercase;
      color: #c5a059;
      letter-spacing: 1px;
      font-weight: 700;
    }
    .invoice-meta {
      font-size: 12px;
      color: #4b5563;
      margin-top: 5px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 25px;
    }
    .section-box {
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      padding: 15px;
      border-radius: 6px;
    }
    .section-heading {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .bold-name {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .table th {
      background-color: #1a1a1a;
      color: #ffffff;
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    .table tr:nth-child(even) { background-color: #fafafa; }
    .product-img {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
      margin-right: 10px;
      vertical-align: middle;
    }
    .product-info {
      display: flex;
      align-items: center;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 700;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .badge-paid { background-color: #d1fae5; color: #065f46; }
    .badge-pending { background-color: #fef3c7; color: #92400e; }
    .summary-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 15px;
    }
    .notes-box {
      width: 55%;
      font-size: 11px;
      color: #6b7280;
    }
    .summary-table {
      width: 40%;
      font-size: 12px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .summary-total {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 15px;
      font-weight: 700;
      color: #c5a059;
      border-top: 2px solid #1a1a1a;
      border-bottom: 2px solid #1a1a1a;
      margin-top: 5px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    @media print {
      body { padding: 0; background: none; }
      .invoice-card { border: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto 15px auto; text-align: right;">
    <button onclick="window.print()" style="background: #c5a059; color: #fff; border: none; padding: 10px 20px; font-weight: 600; border-radius: 5px; cursor: pointer; font-size: 13px;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand-title">BILLU BAZAAR</div>
        <div class="brand-subtitle">Luxury Shopping Experience</div>
        <p style="margin-top: 6px; font-size: 11px; color: #6b7280;">Support: ${supportEmail} | ${supportPhone}</p>
      </div>
      <div class="invoice-title">
        <h1>TAX INVOICE</h1>
        <div class="invoice-meta">
          <p><strong>Invoice No:</strong> ${invoiceNum}</p>
          <p><strong>Order Ref:</strong> #${orderNum}</p>
          <p><strong>Date:</strong> ${invoiceDate}</p>
          <p style="margin-top: 4px;">
            <span class="badge ${order.paymentStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}">
              ${order.paymentStatus || 'PAID'}
            </span>
          </p>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="section-box">
        <div class="section-heading">Billed & Shipped To</div>
        <div class="bold-name">${billing.fullName || order.customer?.name || 'Customer'}</div>
        <p>${billing.flatHouse || billing.line1 || ''}</p>
        ${billing.landmark ? `<p>Near ${billing.landmark}</p>` : ''}
        <p>${billing.city || ''}${billing.state ? `, ${billing.state}` : ''} ${billing.pincode || ''}</p>
        <p><strong>${billing.country || 'India'}</strong></p>
        <p style="margin-top: 4px; font-size: 11px; color: #4b5563;">
          📞 ${billing.phone || order.customer?.phone || 'N/A'} | ✉️ ${billing.email || order.customer?.email || 'N/A'}
        </p>
      </div>
      <div class="section-box">
        <div class="section-heading">Payment & Shipping Summary</div>
        <p><strong>Payment Method:</strong> ${order.paymentMethod || 'Credit / Debit Card'}</p>
        <p><strong>Transaction Ref:</strong> ${order.paymentGatewayRef || order.razorpay_payment_id || 'N/A'}</p>
        <p><strong>Order Date:</strong> ${orderDate}</p>
        ${order.trackingNumber ? `<p><strong>AWB Tracking:</strong> ${order.trackingNumber}</p>` : ''}
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Item Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, idx) => {
          const unitPrice = Number(item.unitPrice || item.price || 0);
          const qty = Number(item.quantity || item.qty || 1);
          const totalItemPrice = unitPrice * qty;
          const variantStr = item.selectedVariant ? `${item.selectedVariant.size ? 'Size: ' + item.selectedVariant.size : ''} ${item.selectedVariant.color ? 'Color: ' + item.selectedVariant.color : ''}` : '';

          return `
            <tr>
              <td style="width: 30px; text-align: center;">${idx + 1}</td>
              <td>
                <div class="product-info">
                  ${item.productImage || item.image ? `<img src="${item.productImage || item.image}" alt="${item.productName || item.name}" class="product-img" />` : ''}
                  <div>
                    <strong style="color: #111827;">${item.productName || item.name || 'Product'}</strong>
                    ${variantStr ? `<br/><span style="font-size: 11px; color: #6b7280;">${variantStr}</span>` : ''}
                  </div>
                </div>
              </td>
              <td style="text-align: center; font-weight: 600;">${qty}</td>
              <td style="text-align: right;">${fmt(unitPrice)}</td>
              <td style="text-align: right; font-weight: 600;">${fmt(totalItemPrice)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="summary-container" style="justify-content: flex-end;">
      <div class="summary-table">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${fmt(subtotal)}</span>
        </div>
        ${discountAmount > 0 ? `
          <div class="summary-row" style="color: #16a34a;">
            <span>Discount & Rewards</span>
            <span>-${fmt(discountAmount)}</span>
          </div>
        ` : ''}
        <div class="summary-row">
          <span>Shipping Fee</span>
          <span>${shippingAmount === 0 ? 'FREE' : fmt(shippingAmount)}</span>
        </div>
        <div class="summary-total">
          <span>Grand Total</span>
          <span>${fmt(totalAmount)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for choosing <strong>Billu Bazaar</strong> — www.billubazaar.com</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * printInvoice — Opens a print dialog window for the specified order
 * @param {Object} order - The order object to generate an invoice for
 */
export const printInvoice = (order) => {
  if (!order) return;
  const html = generateInvoiceHTML(order);
  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
};
