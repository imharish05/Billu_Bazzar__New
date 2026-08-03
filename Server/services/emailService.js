'use strict';
const nodemailer = require('nodemailer');

/**
 * Gmail SMTP transporter using app password from .env
 * EMAIL_USER = stsmail2025@gmail.com
 * EMAIL_PASS = Gmail App Password (16-char)
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const SANS_SERIF_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Helper to safely parse JSON object or return plain object.
 */
const parseAddressObj = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch (e) {
      return { plainAddress: raw };
    }
  }
  if (typeof raw === 'object' && raw !== null) return raw;
  return {};
};

/**
 * Formats full address string handling flatHouse, areaStreet, landmark, line1, line2, etc.
 */
const formatAddressString = (rawAddr) => {
  const addr = parseAddressObj(rawAddr);
  if (addr.plainAddress) return addr.plainAddress;

  const line1 = addr.flatHouse || addr.addressLine1 || addr.line1 || addr.address || addr.street || addr.streetAddress || '';
  const line2 = addr.areaStreet || addr.addressLine2 || addr.line2 || addr.street2 || '';
  const landmark = addr.landmark ? `(near ${addr.landmark})` : '';
  const city = addr.city || addr.town || '';
  const state = addr.state || addr.province || addr.region || '';
  const pincode = addr.pincode || addr.postalCode || addr.zip || addr.zipCode || '';
  const country = addr.country || '';

  const parts = [line1, line2, landmark, city, state, pincode, country].filter(Boolean);
  return parts.join(', ');
};

/**
 * Sends a 6-digit OTP email for password reset.
 */
const sendOtpEmail = async (toEmail, name, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Billu Bazaar" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} is your Billu Bazaar password reset OTP`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Password Reset OTP</title>
      </head>
      <body style="margin:0;padding:0;background:#F9F9F8;font-family:${SANS_SERIF_FONT};">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F9F8;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #EAEAEA;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
                <!-- Header -->
                <tr>
                  <td style="background:#1A1A1A;padding:24px 40px;text-align:center;">
                    <p style="margin:0;font-family:${SANS_SERIF_FONT};font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:0.12em;">
                      BILLU <span style="color:#C9A24B;">BAZAAR</span>
                    </p>
                    <p style="margin:4px 0 0;font-size:11px;color:#A1A1A1;letter-spacing:0.15em;text-transform:uppercase;">
                      Password Reset
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    <h1 style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#1A1A1A;">
                      Password Reset Request
                    </h1>
                    <p style="margin:0 0 12px;font-size:14px;color:#4B5563;line-height:1.6;">
                      Hi <strong style="color:#1A1A1A;">${name}</strong>,
                    </p>
                    <p style="margin:0 0 28px;font-size:14px;color:#4B5563;line-height:1.6;">
                      We received a request to reset your Billu Bazaar account password. Use the OTP below to proceed. This code expires in <strong style="color:#1A1A1A;">10 minutes</strong>.
                    </p>

                    <!-- OTP Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td align="center">
                          <div style="background:#FFFDF8;border:2px dashed #C9A24B;border-radius:10px;padding:22px 36px;display:inline-block;">
                            <p style="margin:0 0 6px;font-size:11px;color:#8A6714;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Your Reset OTP</p>
                            <p style="margin:0;font-size:38px;font-weight:bold;color:#1A1A1A;letter-spacing:0.3em;">${otp}</p>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 12px;font-size:14px;color:#4B5563;line-height:1.6;">
                      Enter this OTP on the password reset screen. Do <strong>not</strong> share it with anyone.
                    </p>
                    <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
                      If you didn't request a password reset, you can safely ignore this email — your account remains secure.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#FAF9F6;padding:20px 40px;border-top:1px solid #EAEAEA;text-align:center;">
                    <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">
                      © ${new Date().getFullYear()} Billu Bazaar. All rights reserved.<br/>
                      This is an automated email — please do not reply directly.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Reset OTP email sent to ${toEmail} — MessageID: ${info.messageId}`);
  return info;
};

/**
 * Sends a 6-digit OTP email for Order Security Verification.
 */
const sendFraudOtpEmail = async (toEmail, name, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Billu Bazaar Security" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} is your Billu Bazaar Order Verification Code`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Order Security Verification</title>
      </head>
      <body style="margin:0;padding:0;background:#F9F9F8;font-family:${SANS_SERIF_FONT};">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F9F8;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #EAEAEA;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
                <!-- Header -->
                <tr>
                  <td style="background:#1A1A1A;padding:24px 40px;text-align:center;">
                    <p style="margin:0;font-family:${SANS_SERIF_FONT};font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:0.12em;">
                      BILLU <span style="color:#C9A24B;">BAZAAR</span>
                    </p>
                    <p style="margin:4px 0 0;font-size:11px;color:#A1A1A1;letter-spacing:0.15em;text-transform:uppercase;">
                      Security Concierge
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    <h1 style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#1A1A1A;">
                      🔒 Order Security Verification
                    </h1>
                    <p style="margin:0 0 12px;font-size:14px;color:#4B5563;line-height:1.6;">
                      Hi <strong style="color:#1A1A1A;">${name || 'Valued Customer'}</strong>,
                    </p>
                    <p style="margin:0 0 28px;font-size:14px;color:#4B5563;line-height:1.6;">
                      For your protection, high-value orders and Cash on Delivery purchases require a quick verification code. Use the 6-digit OTP below on your checkout screen to authorize and complete your order. This code expires in <strong style="color:#1A1A1A;">10 minutes</strong>.
                    </p>

                    <!-- OTP Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td align="center">
                          <div style="background:#FFFDF8;border:2px dashed #C9A24B;border-radius:10px;padding:22px 36px;display:inline-block;">
                            <p style="margin:0 0 6px;font-size:11px;color:#8A6714;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Verification Code</p>
                            <p style="margin:0;font-size:38px;font-weight:bold;color:#1A1A1A;letter-spacing:0.3em;">${otp}</p>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 12px;font-size:14px;color:#4B5563;line-height:1.6;">
                      Enter this code on your checkout screen. If you did not initiate this order, please contact our support team immediately.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#FAF9F6;padding:20px 40px;border-top:1px solid #EAEAEA;text-align:center;">
                    <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">
                      © ${new Date().getFullYear()} Billu Bazaar Security Concierge. All rights reserved.<br/>
                      This is an automated security email — please do not reply.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Order verification OTP email sent to ${toEmail} — MessageID: ${info.messageId}`);
  return info;
};

/**
 * Sends order status lifecycle emails (Placed, Confirmed, Packing, Dispatched, Out for Delivery, Delivered, Cancelled, Refunded).
 * Design structured strictly after Kamali Gifts reference layout, utilizing Billu Bazaar's Black & Gold brand palette.
 */
const sendOrderStatusNotification = async (order, statusTypeOverride = null) => {
  try {
    const transporter = createTransporter();

    // Determine target recipient email & name
    const toEmail = (
      order.customer?.email ||
      order.shippingAddress?.email ||
      order.billingAddress?.email ||
      ''
    ).trim();

    if (!toEmail) {
      console.warn(`[emailService] Cannot send status email for Order #${order.orderNumber} - no recipient email found.`);
      return null;
    }

    const customerName = (
      order.customer?.name ||
      order.shippingAddress?.name ||
      order.shippingAddress?.fullName ||
      order.billingAddress?.name ||
      'Valued Customer'
    ).trim();

    const currentStatus = (statusTypeOverride || order.status || 'CONFIRMED').toUpperCase();

    // Configuration per order status (icons, titles, pill badges, messages)
    const statusConfig = {
      PAID: {
        heading: 'Your Order Has Been Confirmed',
        subject: `Your Billu Bazaar Order #${order.orderNumber} is Confirmed!`,
        badgeText: 'Confirmed',
        icon: '🎉',
        message: 'Thank you for your purchase! We have successfully received your payment and your team is preparing it for shipment.',
      },
      CONFIRMED: {
        heading: 'Your Order Has Been Confirmed',
        subject: `Your Billu Bazaar Order #${order.orderNumber} is Confirmed!`,
        badgeText: 'Confirmed',
        icon: '🎉',
        message: 'Thank you for your purchase! We have successfully received your order and our team is preparing it for shipment.',
      },
      PENDING: {
        heading: 'Your Order Has Been Received',
        subject: `Order Received #${order.orderNumber} - Billu Bazaar`,
        badgeText: 'Pending',
        icon: '⏳',
        message: 'Thank you for your order! We have received your order details and are waiting for confirmation.',
      },
      PROCESSING: {
        heading: 'Your Order is Being Packed',
        subject: `Your Order #${order.orderNumber} is Being Packed!`,
        badgeText: 'Processing',
        icon: '📦',
        message: 'Great news! Our warehouse team is currently packing your items with care.',
      },
      SHIPPED: {
        heading: 'Your Order Has Been Dispatched',
        subject: `Your Order #${order.orderNumber} Has Been Dispatched!`,
        badgeText: 'Dispatched',
        icon: '🚚',
        message: 'Your package is on its way! You can track your shipment using the tracking details below.',
      },
      OUT_FOR_DELIVERY: {
        heading: 'Your Order is Out for Delivery',
        subject: `Your Order #${order.orderNumber} is Out for Delivery!`,
        badgeText: 'Out for Delivery',
        icon: '🚀',
        message: 'Get ready! Your package is out for delivery today and will reach your address soon.',
      },
      DELIVERED: {
        heading: 'Your Order Has Been Delivered',
        subject: `Your Order #${order.orderNumber} Has Been Delivered!`,
        badgeText: 'Delivered',
        icon: '🎁',
        message: 'Your order has been successfully delivered. We hope you love your purchase!',
      },
      CANCELLED: {
        heading: 'Your Order Has Been Cancelled',
        subject: `Your Order #${order.orderNumber} Has Been Cancelled`,
        badgeText: 'Cancelled',
        icon: '❌',
        message: 'Your order has been cancelled. If you have any questions or require assistance, please contact support.',
      },
      REFUNDED: {
        heading: 'Refund Has Been Processed',
        subject: `Refund Processed for Order #${order.orderNumber}`,
        badgeText: 'Refunded',
        icon: '💳',
        message: 'Your refund has been successfully processed to your original payment method.',
      },
    };

    const config = statusConfig[currentStatus] || {
      heading: `Order Status Updated: ${currentStatus}`,
      subject: `Update on your Billu Bazaar Order #${order.orderNumber}`,
      badgeText: currentStatus,
      icon: '🔔',
      message: `Your order status has been updated to ${currentStatus}.`,
    };

    // Currency symbol formatting
    const currencySymbol = order.currency === 'AED' ? 'AED ' : '₹';

    // Format items HTML table rows
    let itemsHtml = '';
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      itemsHtml = order.items.map(item => {
        let parsedVariant = {};
        if (item.selectedVariant) {
          if (typeof item.selectedVariant === 'string') {
            try {
              parsedVariant = JSON.parse(item.selectedVariant);
              if (typeof parsedVariant === 'string') parsedVariant = JSON.parse(parsedVariant);
            } catch (e) {
              parsedVariant = {};
            }
          } else if (typeof item.selectedVariant === 'object') {
            parsedVariant = item.selectedVariant;
          }
        }

        const variantText = (parsedVariant && typeof parsedVariant === 'object')
          ? Object.entries(parsedVariant).map(([k, v]) => `${k}: ${v}`).join(' · ')
          : '';

        const itemUnitPrice = parseFloat(item.unitPrice || item.totalPrice || 0);

        return `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #F3F4F6; vertical-align: top;">
              <p style="margin: 0 0 4px; font-weight: 600; font-size: 13px; color: #1F2937;">${item.productName}</p>
              ${variantText ? `<p style="margin: 0; font-size: 11px; color: #6B7280;">${variantText}</p>` : ''}
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #F3F4F6; text-align: center; font-size: 13px; color: #4B5563; vertical-align: top;">
              ${item.quantity}
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #F3F4F6; text-align: right; font-size: 13px; font-weight: 700; color: #1F2937; vertical-align: top;">
              ${currencySymbol}${itemUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        `;
      }).join('');
    } else {
      itemsHtml = `<tr><td colspan="3" style="padding: 16px; text-align: center; color: #6B7280; font-size: 13px;">Order item details attached</td></tr>`;
    }

    // Shipping address & recipient details
    const rawShipping = order.shippingAddress || order.billingAddress || {};
    const addrObj = parseAddressObj(rawShipping);
    const addrName = addrObj.fullName || addrObj.name || `${addrObj.firstName || ''} ${addrObj.lastName || ''}`.trim() || customerName;
    const addrPhone = addrObj.phone || addrObj.mobile || addrObj.phoneNumber || '';
    const addrString = formatAddressString(rawShipping);

    // Payment details
    const rawPaymentMethod = order.paymentMethod || 'Online Payment';
    const isCod = rawPaymentMethod === 'COD' || rawPaymentMethod?.includes('Cash on Delivery');
    const displayPaymentMethod = isCod ? 'Cash on Delivery (COD)' : (rawPaymentMethod.includes('Razorpay') ? 'Online Payment (Razorpay)' : rawPaymentMethod);
    const paymentStatusBadgeText = (order.paymentStatus === 'PAID' || currentStatus === 'PAID' || currentStatus === 'CONFIRMED' && !isCod) ? 'Paid' : (isCod ? 'Pay on Delivery' : (order.paymentStatus || 'Pending'));

    // Tracking info block
    let trackingHtml = '';
    if (order.trackingNumber || order.trackingUrl) {
      trackingHtml = `
        <div style="background: #FFFDF8; border: 1px solid #F3E8C9; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #8A6714; letter-spacing: 0.08em; font-weight: 700;">Shipment Tracking</p>
          ${order.trackingNumber ? `<p style="margin: 0 0 4px; font-size: 13px; color: #1F2937;"><strong>Tracking ID:</strong> ${order.trackingNumber}</p>` : ''}
          ${order.trackingUrl ? `<p style="margin: 4px 0 0; font-size: 13px;"><a href="${order.trackingUrl}" target="_blank" style="color: #C9A24B; text-decoration: underline; font-weight: bold;">Track Package Live →</a></p>` : ''}
        </div>
      `;
    }

    // Totals calculations
    const subtotal = parseFloat(order.subtotal || 0);
    const shipping = parseFloat(order.shippingAmount || 0);
    const tax = parseFloat(order.taxAmount || 0);
    const discount = parseFloat(order.discountAmount || 0);
    const grandTotal = parseFloat(order.totalAmount || (subtotal + shipping - discount));

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>${config.heading}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#F9F9F8;font-family:${SANS_SERIF_FONT};-webkit-font-smoothing:antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9F9F8;padding:30px 12px;">
          <tr>
            <td align="center">
              <table width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
                
                <!-- Brand Header (Black & Gold) -->
                <tr>
                  <td style="background-color:#1A1A1A;padding:22px 30px;text-align:center;">
                    <p style="margin:0;font-family:${SANS_SERIF_FONT};font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.12em;">
                      BILLU <span style="color:#C9A24B;">BAZAAR</span>
                    </p>
                    <p style="margin:3px 0 0;font-size:10px;color:#9CA3AF;letter-spacing:0.18em;text-transform:uppercase;">
                      Order Confirmation
                    </p>
                  </td>
                </tr>

                <!-- Hero Section (Centered Icon, Title, Message, Pill Badges) -->
                <tr>
                  <td style="padding:32px 32px 24px;text-align:center;">
                    <!-- Emoji / Celebration Icon -->
                    <div style="font-size:42px;line-height:1;margin-bottom:14px;">${config.icon}</div>
                    
                    <h1 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">
                      ${config.heading}
                    </h1>
                    <p style="margin:0 auto 20px;font-size:13px;color:#6B7280;line-height:1.6;max-width:440px;">
                      ${config.message}
                    </p>

                    <!-- Pill Badges Row -->
                    <table align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="padding-right:8px;">
                          <span style="background-color:#FFF8E7;color:#8A6714;border:1px solid #E6C265;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;display:inline-block;letter-spacing:0.02em;">
                            ${config.badgeText}
                          </span>
                        </td>
                        <td>
                          <span style="background-color:#1A1A1A;color:#FFFFFF;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;display:inline-block;letter-spacing:0.02em;">
                            Order ID: <span style="color:#C9A24B;">#${order.orderNumber}</span>
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Optional Tracking Block -->
                <tr>
                  <td style="padding:0 32px;">
                    ${trackingHtml}
                  </td>
                </tr>

                <!-- Section 1: Items Ordered -->
                <tr>
                  <td style="padding:10px 32px 20px;">
                    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111827;display:flex;align-items:center;">
                      📦 <span style="margin-left:6px;">Items Ordered</span>
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #F3F4F6;border-radius:6px;overflow:hidden;">
                      <thead>
                        <tr style="background-color:#F9FAFB;border-bottom:1px solid #E5E7EB;">
                          <th style="padding:8px 16px;text-align:left;font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Product</th>
                          <th style="padding:8px 16px;text-align:center;font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;width:50px;">Qty</th>
                          <th style="padding:8px 16px;text-align:right;font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;width:100px;">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>
                  </td>
                </tr>

                <!-- Section 2: Price Breakdown -->
                <tr>
                  <td style="padding:10px 32px 20px;">
                    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111827;">
                      📄 Price Breakdown
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA;border:1px solid #F3F4F6;border-radius:6px;padding:12px 16px;">
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6B7280;">Subtotal</td>
                        <td style="padding:4px 0;font-size:13px;color:#1F2937;text-align:right;">${currencySymbol}${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      ${discount > 0 ? `
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#8A6714;">Discount Applied</td>
                        <td style="padding:4px 0;font-size:13px;color:#8A6714;text-align:right;">-${currencySymbol}${discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6B7280;">Shipping Charges</td>
                        <td style="padding:4px 0;font-size:13px;color:#1F2937;text-align:right;">${shipping > 0 ? `${currencySymbol}${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'FREE'}</td>
                      </tr>
                      ${tax > 0 ? `
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#6B7280;">GST (${order.taxRate ? `${Number(order.taxRate)}% Included` : 'Included'})</td>
                        <td style="padding:4px 0;font-size:13px;color:#1F2937;text-align:right;">${currencySymbol}${tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>` : ''}
                      <tr>
                        <td colspan="2" style="padding:6px 0;">
                          <div style="border-top:1px dashed #D1D5DB;"></div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0 0;font-size:14px;font-weight:700;color:#111827;">Grand Total</td>
                        <td style="padding:4px 0 0;font-size:15px;font-weight:800;color:#C9A24B;text-align:right;">${currencySymbol}${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Section 3: Delivery Details -->
                <tr>
                  <td style="padding:10px 32px 20px;">
                    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111827;">
                      🏠 Delivery Details
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
                      <tr>
                        <td width="28%" style="padding:10px 14px;background-color:#FAFAFA;border-bottom:1px solid #E5E7EB;border-right:1px solid #E5E7EB;font-size:12px;color:#6B7280;font-weight:600;">Name</td>
                        <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;font-size:12px;color:#1F2937;">${addrName}</td>
                      </tr>
                      ${addrPhone ? `
                      <tr>
                        <td style="padding:10px 14px;background-color:#FAFAFA;border-bottom:1px solid #E5E7EB;border-right:1px solid #E5E7EB;font-size:12px;color:#6B7280;font-weight:600;">Phone</td>
                        <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;font-size:12px;color:#1F2937;">${addrPhone}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:10px 14px;background-color:#FAFAFA;border-right:1px solid #E5E7EB;font-size:12px;color:#6B7280;font-weight:600;vertical-align:top;">Address</td>
                        <td style="padding:10px 14px;font-size:12px;color:#1F2937;line-height:1.5;">${addrString || 'As provided at checkout'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Section 4: Payment Details -->
                <tr>
                  <td style="padding:10px 32px 28px;">
                    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111827;">
                      💳 Payment
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
                      <tr>
                        <td width="28%" style="padding:10px 14px;background-color:#FAFAFA;border-bottom:1px solid #E5E7EB;border-right:1px solid #E5E7EB;font-size:12px;color:#6B7280;font-weight:600;">Method</td>
                        <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;font-size:12px;color:#1F2937;">${displayPaymentMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 14px;background-color:#FAFAFA;border-right:1px solid #E5E7EB;font-size:12px;color:#6B7280;font-weight:600;">Status</td>
                        <td style="padding:10px 14px;">
                          <span style="background-color:#FFF8E7;color:#8A6714;border:1px solid #E6C265;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;display:inline-block;">
                            ${paymentStatusBadgeText}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer Section -->
                <tr>
                  <td style="background-color:#FAF9F6;padding:20px 32px;border-top:1px solid #EAEAEA;text-align:center;">
                    <p style="margin:0 0 6px;font-size:12px;color:#6B7280;">
                      Need help? Contact us at <a href="mailto:support@billubazaar.com" style="color:#C9A24B;text-decoration:underline;font-weight:600;">support@billubazaar.com</a>
                    </p>
                    <p style="margin:0;font-size:11px;color:#9CA3AF;">
                      © ${new Date().getFullYear()} Billu Bazaar. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const adminEmail = (process.env.ADMIN_EMAIL || 'harish05082004@gmail.com').trim();
    const recipients = [toEmail, adminEmail].filter((val, idx, self) => val && self.indexOf(val) === idx);

    const mailOptions = {
      from: `"Billu Bazaar Orders" <${process.env.EMAIL_USER}>`,
      to: recipients.join(', '),
      subject: `${['CONFIRMED', 'PAID', 'PENDING'].includes(currentStatus) ? '🛒 [NEW ORDER ALERT] ' : ''}${config.subject}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Order status email [${currentStatus}] sent to [${recipients.join(', ')}] for Order #${order.orderNumber} — MsgID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send order status email for Order #${order.orderNumber}:`, err.message);
    return null;
  }
};

/**
 * Sends a Restock Alert notification email when an out-of-stock product is restocked or triggered by admin.
 */
const sendRestockAlertEmail = async (toEmail, productName, productSlug, image) => {
  try {
    const transporter = createTransporter();
    const productUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/products/${productSlug || ''}`;

    let resolvedImage = '';
    if (image && typeof image === 'string') {
      let trimmed = image.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) trimmed = String(parsed[0]).trim();
        } catch (e) {}
      }

      if (trimmed.startsWith('data:') || trimmed.startsWith('<svg') || trimmed.includes('.svg')) {
        resolvedImage = `https://placehold.co/300x300/111111/C9A24B/png?text=${encodeURIComponent((productName || 'Product').slice(0, 20))}`;
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        resolvedImage = trimmed;
      } else if (trimmed.length > 0) {
        const serverBase = (process.env.SERVER_URL || process.env.VITE_API_URL || process.env.CLIENT_URL || 'http://localhost:5000').replace(/\/$/, '');
        const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        resolvedImage = `${serverBase}${cleanPath}`;
      }
    }

    if (!resolvedImage) {
      resolvedImage = `https://placehold.co/300x300/111111/C9A24B/png?text=${encodeURIComponent((productName || 'Product').slice(0, 20))}`;
    }

    const mailOptions = {
      from: `"Billu Bazaar Concierge" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Great News! ${productName || 'Your Item'} is Back in Stock at Billu Bazaar! 🎉`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Back in Stock Alert | Billu Bazaar</title>
        </head>
        <body style="margin:0;padding:0;background-color:#F9F9F8;font-family:${SANS_SERIF_FONT};color:#111111;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9F9F8;padding:40px 15px;">
            <tr>
              <td align="center">
                <!-- Main Email Container -->
                <table width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
                  
                  <!-- Top Header -->
                  <tr>
                    <td style="background-color:#1A1A1A;padding:24px 40px;text-align:center;">
                      <p style="margin:0;font-family:${SANS_SERIF_FONT};font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.12em;">
                        BILLU <span style="color:#C9A24B;">BAZAAR</span>
                      </p>
                      <p style="margin:4px 0 0;font-size:10px;color:#A1A1A1;text-transform:uppercase;letter-spacing:0.2em;">
                        Shopping Concierge
                      </p>
                    </td>
                  </tr>

                  <!-- Gold Accent Bar -->
                  <tr>
                    <td style="background:#C9A24B;height:3px;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>

                  <!-- Hero Greeting & Announcement -->
                  <tr>
                    <td style="padding:36px 40px 20px;text-align:center;">
                      <span style="background-color:#FFF8E7;color:#8A6714;border:1px solid #E6C265;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:5px 14px;display:inline-block;border-radius:20px;margin-bottom:16px;">
                        🎉 Back In Stock Alert
                      </span>
                      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111111;line-height:1.3;">
                        It's Back & Ready For You!
                      </h1>
                      <p style="margin:0 auto;font-size:14px;color:#666666;line-height:1.6;max-width:440px;">
                        Great news! The item you requested, <strong style="color:#111111;">${productName}</strong>, is back in stock. Quantities are limited, so secure yours before it sells out again.
                      </p>
                    </td>
                  </tr>

                  <!-- Product Card Section -->
                  <tr>
                    <td style="padding:10px 40px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA;border:1px solid #EEEEEE;border-radius:10px;padding:24px 20px;text-align:center;">
                        ${resolvedImage ? `
                        <tr>
                          <td align="center" style="padding-bottom:16px;">
                            <a href="${productUrl}" target="_blank">
                              <img src="${resolvedImage}" alt="${productName}" style="max-width:220px;max-height:220px;width:auto;height:auto;object-fit:cover;border-radius:8px;border:1px solid #E5E7EB;box-shadow:0 4px 12px rgba(0,0,0,0.06);" />
                            </a>
                          </td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td align="center">
                            <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111111;">
                              ${productName}
                            </h2>
                            <div style="margin:8px 0 0;">
                              <a href="${productUrl}" target="_blank" style="background-color:#1A1A1A;color:#C9A24B;padding:14px 32px;text-decoration:none;font-weight:700;font-size:12px;border-radius:6px;display:inline-block;letter-spacing:0.1em;text-transform:uppercase;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                                Shop ${productName} Now →
                              </a>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Guarantees Bar -->
                  <tr>
                    <td style="padding:0 40px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #EAEAEA;border-bottom:1px solid #EAEAEA;padding:14px 0;">
                        <tr>
                          <td width="33%" style="text-align:center;font-size:11px;color:#555555;font-weight:600;">
                            ✨ Express Delivery
                          </td>
                          <td width="33%" style="text-align:center;font-size:11px;color:#555555;font-weight:600;">
                            🛡️ 100% Authentic
                          </td>
                          <td width="33%" style="text-align:center;font-size:11px;color:#555555;font-weight:600;">
                            🔒 Secure Checkout
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color:#FAF9F6;padding:24px 40px;text-align:center;color:#888888;font-size:11px;line-height:1.6;border-top:1px solid #EAEAEA;">
                      <p style="margin:0 0 4px;color:#C9A24B;font-weight:700;letter-spacing:0.1em;font-size:12px;">BILLU BAZAAR</p>
                      <p style="margin:0 0 8px;color:#888888;">You received this email because you requested restock notifications for this item.</p>
                      <p style="margin:0;color:#9CA3AF;">© ${new Date().getFullYear()} Billu Bazaar. All rights reserved.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Restock alert email sent to ${toEmail} for ${productName} — MsgID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send restock alert email to ${toEmail}:`, err.message);
    throw err;
  }
};

/**
 * Sends HTML Email Notification to Admin when a customer submits a Contact Inquiry.
 */
const sendContactEnquiryAdminNotification = async (enquiryData) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'harish05082004@gmail.com';
    const transporter = createTransporter();

    const { name, email, phone, subject, message, createdAt } = enquiryData;
    const dateFormatted = new Date(createdAt || Date.now()).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const mailOptions = {
      from: `"Billu Bazaar Concierge" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      replyTo: email,
      subject: `📩 New Contact Enquiry: ${subject || 'General Inquiry'} - ${name}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>New Contact Enquiry Alert</title>
        </head>
        <body style="margin:0;padding:0;background-color:#FAF9F6;font-family:${SANS_SERIF_FONT};-webkit-font-smoothing:antialiased;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F6;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #EAEAEA;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color:#111111;padding:30px 40px;text-align:center;">
                      <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.12em;">
                        BILLU <span style="color:#C9A24B;">BAZAAR</span>
                      </p>
                      <p style="margin:6px 0 0;font-size:11px;color:#A1A1A1;letter-spacing:0.18em;text-transform:uppercase;">
                        Concierge & Contact Enquiry Alert
                      </p>
                    </td>
                  </tr>

                  <!-- Alert Banner -->
                  <tr>
                    <td style="background-color:#FFFBEB;border-bottom:1px solid #FCD34D;padding:14px 40px;text-align:center;">
                      <p style="margin:0;font-size:13px;font-weight:600;color:#92400E;">
                        📩 You received a new inquiry from your website contact form.
                      </p>
                    </td>
                  </tr>

                  <!-- Content Body -->
                  <tr>
                    <td style="padding:36px 40px;">
                      
                      <h2 style="margin:0 0 20px;font-size:18px;font-weight:700;color:#111111;border-bottom:2px solid #C9A24B;padding-bottom:10px;display:inline-block;">
                        Customer Details
                      </h2>

                      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin-bottom:24px;">
                        <tr style="border-bottom:1px solid #F3F4F6;">
                          <td width="35%" style="color:#6B7280;font-weight:600;">Customer Name:</td>
                          <td style="color:#111111;font-weight:700;">${name}</td>
                        </tr>
                        <tr style="border-bottom:1px solid #F3F4F6;">
                          <td style="color:#6B7280;font-weight:600;">Email Address:</td>
                          <td style="color:#111111;"><a href="mailto:${email}" style="color:#C9A24B;text-decoration:none;font-weight:600;">${email}</a></td>
                        </tr>
                        <tr style="border-bottom:1px solid #F3F4F6;">
                          <td style="color:#6B7280;font-weight:600;">Phone Number:</td>
                          <td style="color:#111111;">${phone ? `<a href="tel:${phone}" style="color:#111111;text-decoration:none;">${phone}</a>` : '<em style="color:#9CA3AF;">Not provided</em>'}</td>
                        </tr>
                        <tr style="border-bottom:1px solid #F3F4F6;">
                          <td style="color:#6B7280;font-weight:600;">Inquiry Subject:</td>
                          <td style="color:#111111;"><span style="background-color:#F3F4F6;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;color:#374151;">${subject || 'General Inquiry'}</span></td>
                        </tr>
                        <tr>
                          <td style="color:#6B7280;font-weight:600;">Submitted At:</td>
                          <td style="color:#6B7280;font-size:13px;">${dateFormatted}</td>
                        </tr>
                      </table>

                      <h2 style="margin:20px 0 12px;font-size:16px;font-weight:700;color:#111111;">
                        Message Content:
                      </h2>

                      <div style="background-color:#F9FAFB;border-left:4px solid #C9A24B;padding:20px;border-radius:0 8px 8px 0;font-size:14px;color:#1F2937;line-height:1.7;white-space:pre-wrap;">${message}</div>

                      <!-- Action Button -->
                      <div style="margin-top:32px;text-align:center;">
                        <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || 'Inquiry Response')}" style="background-color:#C9A24B;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700;display:inline-block;letter-spacing:0.05em;text-transform:uppercase;">
                          Reply via Email
                        </a>
                      </div>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color:#FAF9F6;padding:20px 40px;text-align:center;color:#888888;font-size:11px;border-top:1px solid #EAEAEA;">
                      <p style="margin:0 0 4px;color:#C9A24B;font-weight:700;letter-spacing:0.1em;font-size:12px;">BILLU BAZAAR ADMIN CONCIERGE</p>
                      <p style="margin:0;color:#9CA3AF;">© ${new Date().getFullYear()} Billu Bazaar. All rights reserved.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Contact enquiry admin notification email sent to ${adminEmail} — MsgID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send contact enquiry admin email:`, err.message);
    // Don't re-throw so user form submission still succeeds
  }
};

module.exports = {
  sendOtpEmail,
  sendFraudOtpEmail,
  sendOrderStatusNotification,
  sendRestockAlertEmail,
  sendContactEnquiryAdminNotification,
};

