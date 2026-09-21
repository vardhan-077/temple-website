const Order = require('../models/Order');
const Donation = require('../models/Donation');
const razorpayUtil = require('../utils/razorpay');

/**
 * Handles Razorpay webhook events. This is the reliable backstop for
 * confirming payments - unlike the browser-side /api/orders/verify or
 * /api/donations/verify calls, it doesn't depend on the buyer's browser
 * staying open. Mounted in server.js with express.raw() so req.body is the
 * exact bytes Razorpay signed (required for signature verification).
 *
 * A single Razorpay account is used for both the shop and donations, so a
 * given razorpayOrderId could belong to either an Order or a Donation - we
 * check both collections rather than assuming one.
 *
 * Set this up in Razorpay Dashboard -> Settings -> Webhooks, pointing at
 * https://<your-domain>/api/razorpay/webhook, and put the secret you choose
 * there into RAZORPAY_WEBHOOK_SECRET in your .env file.
 */
async function handleRazorpayWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body; // Buffer, thanks to express.raw()

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn('[webhook] RAZORPAY_WEBHOOK_SECRET is not set - ignoring webhook call.');
    return res.status(503).send('Webhook secret not configured');
  }

  const valid = razorpayUtil.verifyWebhookSignature({ rawBody, signature });
  if (!valid) {
    console.warn('[webhook] Invalid signature on incoming webhook request.');
    return res.status(400).send('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  try {
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload && event.payload.payment && event.payload.payment.entity;
      const orderId = payment ? payment.order_id : event.payload.order.entity.id;
      const paymentId = payment ? payment.id : undefined;

      const order = await Order.findOne({ razorpayOrderId: orderId });
      if (order && order.status !== 'paid') {
        order.status = 'paid';
        if (paymentId) order.razorpayPaymentId = paymentId;
        await order.save();
        console.log(`[webhook] Marked order ${order._id} as paid via webhook (${event.event}).`);
      } else if (!order) {
        const donation = await Donation.findOne({ razorpayOrderId: orderId });
        if (donation && donation.status !== 'paid') {
          donation.status = 'paid';
          if (paymentId) donation.razorpayPaymentId = paymentId;
          await donation.save();
          console.log(`[webhook] Marked donation ${donation._id} as paid via webhook (${event.event}).`);
        }
      }
    }
    // Other event types (payment.failed, etc.) are safe to ignore - we
    // simply leave those orders in "pending" status.
    res.status(200).send('ok');
  } catch (err) {
    console.error('[webhook] Error processing webhook event:', err);
    // Still 200 so Razorpay doesn't hammer us with retries for a bug on our
    // side that a retry won't fix; the error is logged for us to check.
    res.status(200).send('logged');
  }
}

module.exports = { handleRazorpayWebhook };
