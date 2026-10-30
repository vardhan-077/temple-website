// Admin "Export Data": spreadsheet (CSV) downloads of donations, shop orders and
// the donor honor roll, plus a small totals summary for a chosen date range.
// Mounted at /admin/export by routes/admin.js, after the admin login check.
const express = require('express');
const router = express.Router();

const Donation = require('../models/Donation');
const Order = require('../models/Order');
const Donor = require('../models/Donor');

const { requireAdminAuth } = require('../middleware/auth');
const { buildCsv, asText, formatIST, oneLine, parseDateRange, rangeLabel } = require('../utils/csv');

// routes/admin.js already requires a login before reaching this router; it is
// checked again here so this file stays safe even if it is mounted elsewhere.
router.use(requireAdminAuth);

function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

function rupees(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function sendCsv(res, filename, csv) {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    // These files contain donors' phone numbers and e-mail addresses.
    'Cache-Control': 'no-store',
  });
  res.send(csv);
}

async function paidTotals(Model, amountField, dateFilter) {
  const result = await Model.aggregate([
    { $match: { ...dateFilter, status: 'paid' } },
    { $group: { _id: null, total: { $sum: `$${amountField}` }, count: { $sum: 1 } } },
  ]);
  return result.length ? { total: result[0].total, count: result[0].count } : { total: 0, count: 0 };
}

function describeRange(range) {
  const pretty = (isoDate) =>
    new Date(`${isoDate}T00:00:00+05:30`).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  if (range.from && range.to) return `${pretty(range.from)} to ${pretty(range.to)}`;
  if (range.from) return `${pretty(range.from)} onwards`;
  if (range.to) return `up to ${pretty(range.to)}`;
  return 'all time';
}

// ---------- Export page ----------

router.get(
  '/',
  wrap(async (req, res) => {
    const range = parseDateRange(req.query);
    const dateFilter = range.createdAtFilter ? { createdAt: range.createdAtFilter } : {};
    // The form always sends `from` and `to` (even when empty), so their
    // presence tells us the page is being re-shown after the admin pressed a
    // button - keep their checkbox choices instead of resetting to defaults.
    const submitted = 'from' in req.query || 'to' in req.query;

    const [donationTotals, orderTotals, donationRecords, orderRecords, donorCount] = await Promise.all([
      paidTotals(Donation, 'amount', dateFilter),
      paidTotals(Order, 'totalAmount', dateFilter),
      Donation.countDocuments(dateFilter),
      Order.countDocuments(dateFilter),
      Donor.countDocuments(),
    ]);

    res.render('admin/export', {
      pageTitle: 'Export Data',
      activeAdminNav: 'export',
      range,
      rangeText: describeRange(range),
      donationTotals,
      orderTotals,
      donationRecords,
      orderRecords,
      donorCount,
      donationsPaidOnly: submitted ? req.query.donationsPaidOnly === '1' : true,
      ordersPaidOnly: submitted ? req.query.ordersPaidOnly === '1' : false,
    });
  })
);

// ---------- Donations ----------

router.get(
  '/donations.csv',
  wrap(async (req, res) => {
    const range = parseDateRange(req.query);
    const paidOnly = req.query.donationsPaidOnly === '1';
    const filter = {};
    if (range.createdAtFilter) filter.createdAt = range.createdAtFilter;
    if (paidOnly) filter.status = 'paid';

    const donations = await Donation.find(filter).sort({ createdAt: 1, _id: 1 }).lean();

    const headers = [
      'S.No',
      'Date & Time (IST)',
      'Donor Name',
      'Amount (₹)',
      'Status',
      'Method',
      'Hidden as Anonymous on Website',
      'Shown on Public Leaderboard',
      'Phone',
      'Email',
      'Message from Donor',
      'Internal Note',
      'Razorpay Payment ID',
      'Razorpay Order ID',
    ];
    const rows = donations.map((d, i) => [
      i + 1,
      formatIST(d.createdAt),
      d.name,
      rupees(d.amount),
      d.status,
      d.method,
      d.isAnonymous ? 'Yes' : 'No',
      d.visibleOnLeaderboard === false ? 'No' : 'Yes',
      asText(d.phone),
      d.email,
      oneLine(d.message),
      oneLine(d.note),
      d.razorpayPaymentId,
      d.razorpayOrderId,
    ]);

    sendCsv(
      res,
      `ramalayam-donations_${rangeLabel(range)}${paidOnly ? '_paid-only' : ''}.csv`,
      buildCsv(headers, rows)
    );
  })
);

// ---------- Shop orders ----------

router.get(
  '/orders.csv',
  wrap(async (req, res) => {
    const range = parseDateRange(req.query);
    const paidOnly = req.query.ordersPaidOnly === '1';
    const filter = {};
    if (range.createdAtFilter) filter.createdAt = range.createdAtFilter;
    if (paidOnly) filter.status = 'paid';

    const orders = await Order.find(filter).sort({ createdAt: 1, _id: 1 }).lean();

    const headers = [
      'S.No',
      'Order Date & Time (IST)',
      'Customer Name',
      'Phone',
      'Email',
      'Delivery Address',
      'Items',
      'Total (₹)',
      'Payment Status',
      'Payment Method',
      'Delivery Status',
      'Customer Note',
      'Razorpay Payment ID',
      'Razorpay Order ID',
    ];
    const rows = orders.map((o, i) => [
      i + 1,
      formatIST(o.createdAt),
      o.customerName,
      asText(o.phone),
      o.email,
      oneLine(o.address, ', '),
      (o.items || []).map((it) => `${oneLine(it.name)} x ${it.quantity}`).join('; '),
      rupees(o.totalAmount),
      o.status,
      o.method,
      o.fulfillment,
      oneLine(o.note),
      o.razorpayPaymentId,
      o.razorpayOrderId,
    ]);

    sendCsv(
      res,
      `ramalayam-shop-orders_${rangeLabel(range)}${paidOnly ? '_paid-only' : ''}.csv`,
      buildCsv(headers, rows)
    );
  })
);

// ---------- Donor honor roll (the public "Donors" page) ----------

router.get(
  '/donors.csv',
  wrap(async (req, res) => {
    const donors = await Donor.find().sort({ order: 1, createdAt: 1 }).lean();

    const headers = ['S.No', 'Name', 'Category', 'Year', 'Note', 'Display Order', 'Added On (IST)'];
    const rows = donors.map((d, i) => [
      i + 1,
      d.name,
      d.category,
      d.year,
      oneLine(d.note),
      d.order,
      formatIST(d.createdAt),
    ]);

    sendCsv(res, `ramalayam-donor-honor-roll_${rangeLabel({})}.csv`, buildCsv(headers, rows));
  })
);

module.exports = router;
