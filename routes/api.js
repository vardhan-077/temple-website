const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const Donation = require('../models/Donation');
const razorpayUtil = require('../utils/razorpay');
const settingsCache = require('../utils/settingsCache');

const MIN_DONATION = 1;
const MAX_DONATION = 500000; // sanity cap against typos, not a Razorpay limit

// Limits how many donation attempts / leaderboard polls one IP can make, so
// the site can't easily be hammered or used to spam fake orders.
const donationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

// GET /api/settings/public - everything the homepage/donate page's JS needs,
// re-fetched every so often to keep the progress bar and countdown current.
router.get('/settings/public', async (req, res, next) => {
  try {
    const settings = await settingsCache.getSettings();
    const { total, count } = await Donation.getTotalRaised();
    const target = settings.donationTargetAmount || 0;

    res.json({
      templeName: settings.templeName,
      deityName: settings.deityName,
      tagline: settings.tagline,
      aboutShort: settings.aboutShort,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      whatsappNumber: settings.whatsappNumber,
      logoUrl: settings.logoUrl,
      heroImageUrl: settings.heroImageUrl,
      bankDetails: settings.bankDetails,
      upiId: settings.upiId,
      upiQrImageUrl: settings.upiQrImageUrl,
      taxInfo: settings.taxInfo,
      festival: settings.festival,
      socialLinks: settings.socialLinks,
      razorpayEnabled: razorpayUtil.isConfigured,
      donation: {
        target,
        raised: total,
        donorCount: count,
        percent: target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/leaderboard - top donors, respecting each donor's anonymity choice
// and the admin's per-entry visibility toggle.
router.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const donors = await Donation.getLeaderboard(limit);
    res.json(
      donors.map((d) => ({
        name: d.isAnonymous ? 'Anonymous Devotee' : d.name || 'Anonymous Devotee',
        amount: d.amount,
        date: d.createdAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/donations/create-order
router.post('/donations/create-order', donationLimiter, async (req, res, next) => {
  try {
    if (!razorpayUtil.isConfigured) {
      return res
        .status(503)
        .json({ error: 'Online payments are not set up yet. Please use the bank/UPI details on this page instead.' });
    }

    const { name, amount, email, phone, isAnonymous, message } = req.body;
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < MIN_DONATION || amountNum > MAX_DONATION) {
      return res.status(400).json({
        error: `Please enter an amount between ₹${MIN_DONATION} and ₹${MAX_DONATION.toLocaleString('en-IN')}.`,
      });
    }

    const donation = await Donation.create({
      name: (name || '').trim().slice(0, 100) || 'Anonymous Devotee',
      amount: amountNum,
      email: (email || '').trim().slice(0, 200),
      phone: (phone || '').trim().slice(0, 30),
      message: (message || '').trim().slice(0, 500),
      isAnonymous: Boolean(isAnonymous),
      method: 'razorpay',
      status: 'created',
    });

    const order = await razorpayUtil.createOrder({
      amountInRupees: amountNum,
      receipt: `donation_${donation._id}`,
      notes: { donationId: donation._id.toString() },
    });

    donation.razorpayOrderId = order.id;
    await donation.save();

    const settings = await settingsCache.getSettings();

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      donationId: donation._id,
      templeName: settings.templeName,
      donorName: donation.name,
      donorEmail: donation.email,
      donorPhone: donation.phone,
    });
  } catch (err) {
    console.error('[api] create-order failed:', err);
    res.status(500).json({ error: 'Could not start payment right now. Please try again in a moment.' });
  }
});

// POST /api/donations/verify - confirms the signature Razorpay Checkout
// handed back to the browser. The webhook (routes/webhook.js) is the more
// trustworthy source of truth and will also mark the donation paid even if
// the visitor closes the tab right after paying before this call fires.
router.post('/donations/verify', donationLimiter, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, donationId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !donationId) {
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

    const donation = await Donation.findOne({ _id: donationId, razorpayOrderId: razorpay_order_id });
    if (!donation) return res.status(404).json({ error: 'Donation record not found.' });

    if (donation.status !== 'paid') {
      donation.status = 'paid';
      donation.razorpayPaymentId = razorpay_payment_id;
      donation.razorpaySignature = razorpay_signature;
      await donation.save();
    }

    res.json({ success: true, amount: donation.amount, name: donation.name });
  } catch (err) {
    console.error('[api] verify failed:', err);
    res.status(500).json({ error: 'Could not verify payment.' });
  }
});

module.exports = router;
