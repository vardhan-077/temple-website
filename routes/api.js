const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const Product = require('../models/Product');
const Order = require('../models/Order');
const razorpayUtil = require('../utils/razorpay');
const settingsCache = require('../utils/settingsCache');

const MAX_QUANTITY_PER_ITEM = 50; // sanity cap against typos, not a business limit

// Limits how many checkout attempts one IP can make, so the site can't
// easily be hammered or used to spam fake orders.
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

// POST /api/orders/create
// The cart lives in the browser (localStorage), so the client sends the
// product ids + quantities it has - but prices are always re-looked-up from
// the database here, never trusted from the client, so nobody can tamper
// with what they're charged.
router.post('/orders/create', orderLimiter, async (req, res, next) => {
  try {
    const { items, customerName, phone, email, address, note } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Please enter your name.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Please enter a phone number.' });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ error: 'Please enter a delivery address.' });
    }

    const ids = items.map((i) => i.id).filter(Boolean);
    const products = await Product.find({ _id: { $in: ids }, isActive: true }).lean();
    const productById = {};
    products.forEach((p) => { productById[p._id.toString()] = p; });

    const orderItems = [];
    let totalAmount = 0;
    for (const raw of items) {
      const product = productById[raw.id];
      if (!product) continue; // skip anything removed/deactivated since it was added to the cart
      const quantity = Math.min(MAX_QUANTITY_PER_ITEM, Math.max(1, parseInt(raw.quantity, 10) || 1));
      orderItems.push({ product: product._id, name: product.name, price: product.price, quantity });
      totalAmount += product.price * quantity;
    }

    if (!orderItems.length) {
      return res.status(400).json({ error: 'The items in your cart are no longer available. Please refresh the shop page.' });
    }

    const order = await Order.create({
      items: orderItems,
      totalAmount,
      customerName: customerName.trim().slice(0, 100),
      phone: phone.trim().slice(0, 30),
      email: (email || '').trim().slice(0, 200),
      address: address.trim().slice(0, 500),
      note: (note || '').trim().slice(0, 500),
      method: razorpayUtil.isConfigured ? 'razorpay' : 'upi',
      status: 'pending',
    });

    if (!razorpayUtil.isConfigured) {
      const settings = await settingsCache.getSettings();
      return res.json({
        orderId: order._id,
        totalAmount,
        razorpayEnabled: false,
        upiId: settings.upiId,
        templeName: settings.templeName,
      });
    }

    const rzpOrder = await razorpayUtil.createOrder({
      amountInRupees: totalAmount,
      receipt: `order_${order._id}`,
      notes: { orderId: order._id.toString() },
    });
    order.razorpayOrderId = rzpOrder.id;
    await order.save();

    const settings = await settingsCache.getSettings();
    res.json({
      orderId: order._id,
      totalAmount,
      razorpayEnabled: true,
      rzpOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      templeName: settings.templeName,
      customerName: order.customerName,
      customerEmail: order.email,
      customerPhone: order.phone,
    });
  } catch (err) {
    console.error('[api] order create failed:', err);
    res.status(500).json({ error: 'Could not place your order right now. Please try again in a moment.' });
  }
});

// POST /api/orders/verify - confirms the signature Razorpay Checkout handed
// back to the browser. The webhook (routes/webhook.js) is the more
// trustworthy source of truth and will also mark the order paid even if the
// buyer closes the tab right after paying, before this call fires.
router.post('/orders/verify', orderLimiter, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({ error: 'Missing payment details.' });
    }

    const valid = razorpayUtil.verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) {
      return res.status(400).json({ error: 'Payment verification failed. If money was deducted, it will reflect shortly - please contact us with your payment ID.' });
    }

    const order = await Order.findOne({ _id: orderId, razorpayOrderId: razorpay_order_id });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.status !== 'paid') {
      order.status = 'paid';
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      await order.save();
    }

    res.json({ success: true, orderId: order._id });
  } catch (err) {
    console.error('[api] order verify failed:', err);
    res.status(500).json({ error: 'Could not verify payment.' });
  }
});

module.exports = router;
