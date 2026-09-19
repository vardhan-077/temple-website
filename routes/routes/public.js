const express = require('express');
const router = express.Router();

const GalleryImage = require('../models/GalleryImage');
const History = require('../models/History');
const CommitteeMember = require('../models/CommitteeMember');
const ContactMessage = require('../models/ContactMessage');
const Program = require('../models/Program');
const Announcement = require('../models/Announcement');
const Donor = require('../models/Donor');
const ShilapalakaPhoto = require('../models/ShilapalakaPhoto');
const Festival = require('../models/Festival');
const Product = require('../models/Product');
const Order = require('../models/Order');

// GET /
router.get('/', async (req, res, next) => {
  try {
    const tenDaysOut = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const upcomingPrograms = await Program.find({ isActive: true, dateTime: { $gte: new Date(), $lte: tenDaysOut } })
      .sort({ dateTime: 1 })
      .limit(6)
      .lean();
    const announcements = await Announcement.getActive(10);
    const festivals = await Festival.getGrouped();
    const featuredProducts = await Product.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).limit(4).lean();

    res.render('public/home', {
      pageTitle: 'Home',
      activeNav: 'home',
      upcomingPrograms,
      announcements,
      festivals,
      featuredProducts,
    });
  } catch (err) {
    next(err);
  }
});

// GET /programs
router.get('/programs', async (req, res, next) => {
  try {
    const programs = await Program.getUpcoming(100);
    res.render('public/programs', {
      pageTitle: 'Upcoming Programs',
      activeNav: 'programs',
      programs,
    });
  } catch (err) {
    next(err);
  }
});

// GET /gallery
router.get('/gallery', async (req, res, next) => {
  try {
    const years = (await GalleryImage.distinct('year')).sort((a, b) => b - a);
    const selectedYear = req.query.year ? parseInt(req.query.year, 10) : years[0];
    const images = selectedYear
      ? await GalleryImage.find({ year: selectedYear }).sort({ order: 1, createdAt: 1 }).lean()
      : [];

    res.render('public/gallery', {
      pageTitle: 'Gallery',
      activeNav: 'gallery',
      years,
      selectedYear,
      images,
    });
  } catch (err) {
    next(err);
  }
});

// GET /history
router.get('/history', async (req, res, next) => {
  try {
    const history = await History.getHistory();
    const milestones = [...history.milestones].sort((a, b) => a.year - b.year);
    res.render('public/history', {
      pageTitle: 'Temple History',
      activeNav: 'history',
      history,
      milestones,
    });
  } catch (err) {
    next(err);
  }
});

// GET /committee
router.get('/committee', async (req, res, next) => {
  try {
    const members = await CommitteeMember.find().sort({ order: 1, createdAt: 1 }).lean();
    res.render('public/committee', {
      pageTitle: 'Temple Committee',
      activeNav: 'committee',
      members,
    });
  } catch (err) {
    next(err);
  }
});

// GET /donors
router.get('/donors', async (req, res, next) => {
  try {
    const donorGroups = await Donor.getGrouped();
    res.render('public/donors', {
      pageTitle: 'Our Benefactors',
      activeNav: 'donors',
      donorGroups,
    });
  } catch (err) {
    next(err);
  }
});

// GET /shilapalaka
router.get('/shilapalaka', async (req, res, next) => {
  try {
    const photos = await ShilapalakaPhoto.find().sort({ order: 1, createdAt: 1 }).lean();
    res.render('public/shilapalaka', {
      pageTitle: 'Shilapalaka',
      activeNav: 'shilapalaka',
      photos,
    });
  } catch (err) {
    next(err);
  }
});

// GET /contact
router.get('/contact', (req, res) => {
  res.render('public/contact', { pageTitle: 'Contact Us', activeNav: 'contact' });
});

// POST /contact
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !message) {
      req.flash('error', 'Please fill in your name and message.');
      return res.redirect('/contact');
    }
    await ContactMessage.create({
      name: name.trim().slice(0, 100),
      email: (email || '').trim().slice(0, 200),
      phone: (phone || '').trim().slice(0, 30),
      message: message.trim().slice(0, 1000),
    });
    req.flash('success', 'Thank you! Your message has been received - we will get back to you soon.');
    res.redirect('/contact');
  } catch (err) {
    next(err);
  }
});

// GET /products - the temple shop catalog, grouped by category
router.get('/products', async (req, res, next) => {
  try {
    const productGroups = await Product.getActiveGrouped();
    res.render('public/products', {
      pageTitle: 'Shop',
      activeNav: 'products',
      productGroups,
      extraScript: '/js/shop.js',
    });
  } catch (err) {
    next(err);
  }
});

// GET /cart - the cart itself lives in the browser (localStorage); this
// page just renders the shell and js/shop.js fills it in on load.
router.get('/cart', (req, res) => {
  res.render('public/cart', { pageTitle: 'Your Cart', activeNav: 'products', extraScript: '/js/shop.js' });
});

// GET /checkout - same idea: the order summary + form is rendered here,
// js/shop.js reads the cart from localStorage to fill in the summary and
// wires up the "Place Order" submit.
router.get('/checkout', (req, res) => {
  res.render('public/checkout', { pageTitle: 'Checkout', activeNav: 'products', extraScript: '/js/shop.js' });
});

// GET /checkout/success?order=<id> - order confirmation. If the order was
// paid via Razorpay it's already marked 'paid' by the time the buyer lands
// here; otherwise this page shows the UPI tap-to-pay/QR options for the
// exact order total.
router.get('/checkout/success', async (req, res, next) => {
  try {
    const order = req.query.order ? await Order.findById(req.query.order).lean() : null;
    if (!order) {
      return res.redirect('/products');
    }
    res.render('public/checkout-success', {
      pageTitle: 'Order Placed',
      activeNav: 'products',
      order,
    });
  } catch (err) {
    next(err);
  }
});

// --- Static-ish policy pages (kept for payment-gateway/compliance reasons) ---
router.get('/privacy-policy', (req, res) => {
  res.render('public/privacy-policy', { pageTitle: 'Privacy Policy', activeNav: '' });
});
router.get('/terms', (req, res) => {
  res.render('public/terms', { pageTitle: 'Terms & Conditions', activeNav: '' });
});
router.get('/refund-policy', (req, res) => {
  res.render('public/refund-policy', { pageTitle: 'Refund & Return Policy', activeNav: '' });
});

module.exports = router;
