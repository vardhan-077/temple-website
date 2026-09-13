const crypto = require('crypto');
const Razorpay = require('razorpay');

const isConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

let client = null;
function getClient() {
  if (!isConfigured) {
    throw new Error(
      'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file ' +
        '(get test keys free from https://dashboard.razorpay.com/app/keys).'
    );
  }
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
}

/**
 * Creates a Razorpay order for the given amount (in whole rupees).
 * Razorpay's API works in the smallest currency unit (paise for INR), so we
 * multiply by 100 here - nowhere else in the app should do this conversion.
 */
async function createOrder({ amountInRupees, receipt, notes }) {
  const rzp = getClient();
  return rzp.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: 'INR',
    receipt,
    notes,
  });
}

/**
 * Verifies the signature Razorpay Checkout returns to the browser after a
 * successful payment. Per Razorpay docs: HMAC-SHA256 of
 * "<order_id>|<payment_id>" using your key secret must equal the signature.
 */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  } catch {
    return false; // signature was missing/malformed length
  }
}

/**
 * Verifies the X-Razorpay-Signature header on incoming webhook requests.
 * Needs the RAW request body (a Buffer/string), not a parsed JSON object.
 */
function verifyWebhookSignature({ rawBody, signature }) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  } catch {
    return false;
  }
}

module.exports = { isConfigured, getClient, createOrder, verifyPaymentSignature, verifyWebhookSignature };
