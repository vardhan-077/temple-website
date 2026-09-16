const express = require('express');
const router = express.Router();

const GalleryImage = require('../models/GalleryImage');
const History = require('../models/History');
const CommitteeMember = require('../models/CommitteeMember');
const Donation = require('../models/Donation');
const ContactMessage = require('../models/ContactMessage');
const Program = require('../models/Program');
const Announcement = require('../models/Announcement');
const Donor = require('../models/Donor');
const ShilapalakaPhoto = require('../models/ShilapalakaPhoto');
const Festival = require('../models/Festival');
const PoojaTiming = require('../models/PoojaTiming');
const razorpayUtil = require('../utils/razorpay');

// GET /
router.get('/', async (req, res, next) => {
  try {
    const { total, count } = await Donation.getTotalRaised();
    const leaderboard = await Donation.getLeaderboard(10);
    const target = res.locals.settings.donationTargetAmount || 0;
    const percent = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;

    const tenDaysOut = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const upcomingPrograms = await Program.find({ isActive: true, dateTime: { $gte: new Date(), $lte: tenDaysOut } })
      .sort({ dateTime: 1 })
      .limit(6)
      .lean();
    const announcements = await Announcement.getActive(10);
    const festivals = await Festival.getGrouped();

    res.render('public/home', {
      pageTitle: 'Home',
      activeNav: 'home',
      donation: { total, count, percent, target },
      leaderboard,
      upcomingPrograms,
      announcements,
      festivals,
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
    const shilapalakaPhotos = await ShilapalakaPhoto.find().sort({ order: 1, createdAt: 1 }).lean();
    res.render('public/donors', {
      pageTitle: 'Our Benefactors',
      activeNav: 'donors',
      donorGroups,
      shilapalakaPhotos,
    });
  } catch (err) {
    next(err);
  }
});

// GET /pooja-timings
router.get('/pooja-timings', async (req, res, next) => {
  try {
    const timings = await PoojaTiming.find().sort({ order: 1, createdAt: 1 }).lean();
    res.render('public/pooja-timings', {
      pageTitle: 'Pooja Timings',
      activeNav: 'pooja-timings',
      timings,
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

// GET /donate
router.get('/donate', async (req, res, next) => {
  try {
    const { total, count } = await Donation.getTotalRaised();
    const target = res.locals.settings.donationTargetAmount || 0;
    const percent = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;

    res.render('public/donate', {
      pageTitle: 'Donate',
      activeNav: 'donate',
      donation: { total, count, percent, target },
      razorpayEnabled: razorpayUtil.isConfigured,
      extraScript: '/js/donate.js',
    });
  } catch (err) {
    next(err);
  }
});

// GET /donate/thank-you
router.get('/donate/thank-you', (req, res) => {
  res.render('public/donate-thank-you', { pageTitle: 'Thank You', activeNav: 'donate' });
});

// --- Static-ish policy pages (required for Razorpay merchant compliance) ---
router.get('/privacy-policy', (req, res) => {
  res.render('public/privacy-policy', { pageTitle: 'Privacy Policy', activeNav: '' });
});
router.get('/terms', (req, res) => {
  res.render('public/terms', { pageTitle: 'Terms & Conditions', activeNav: '' });
});
router.get('/refund-policy', (req, res) => {
  res.render('public/refund-policy', { pageTitle: 'Refund & Cancellation Policy', activeNav: '' });
});

module.exports = router;
