const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const Admin = require('../models/Admin');
const Settings = require('../models/Settings');
const GalleryImage = require('../models/GalleryImage');
const History = require('../models/History');
const CommitteeMember = require('../models/CommitteeMember');
const Donation = require('../models/Donation');
const ContactMessage = require('../models/ContactMessage');
const Program = require('../models/Program');
const Announcement = require('../models/Announcement');
const Donor = require('../models/Donor');

const { requireAdminAuth, redirectIfLoggedIn } = require('../middleware/auth');
const { upload, saveImage, deleteImage } = require('../utils/imageUpload');
const settingsCache = require('../utils/settingsCache');
const { fromISTDatetimeLocal, toISTDatetimeLocal } = require('../utils/dates');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please wait 15 minutes and try again.',
});

function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// ===================== Auth =====================

router.get('/login', redirectIfLoggedIn, (req, res) => {
  res.render('admin/login', { pageTitle: 'Admin Login', layoutNav: false });
});

router.post(
  '/login',
  loginLimiter,
  wrap(async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username: (username || '').toLowerCase().trim() });
    const valid = admin && (await admin.checkPassword(password || ''));
    if (!valid) {
      req.flash('error', 'Incorrect username or password.');
      return res.redirect('/admin/login');
    }
    req.session.regenerate((err) => {
      if (err) {
        req.flash('error', 'Login failed, please try again.');
        return res.redirect('/admin/login');
      }
      req.session.adminId = admin._id.toString();
      req.session.adminUsername = admin.username;
      res.redirect('/admin');
    });
  })
);

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Everything below this line requires a logged-in admin.
router.use(requireAdminAuth);

// ===================== Dashboard =====================

router.get(
  '/',
  wrap(async (req, res) => {
    const [totals, recentDonations, unreadMessages, galleryCount, committeeCount] = await Promise.all([
      Donation.getTotalRaised(),
      Donation.find().sort({ createdAt: -1 }).limit(6).lean(),
      ContactMessage.countDocuments({ status: 'new' }),
      GalleryImage.countDocuments(),
      CommitteeMember.countDocuments(),
    ]);
    const settings = await settingsCache.getSettings();
    const target = settings.donationTargetAmount || 0;
    const percent = target > 0 ? Math.min(100, Math.round((totals.total / target) * 100)) : 0;

    res.render('admin/dashboard', {
      pageTitle: 'Dashboard',
      activeAdminNav: 'dashboard',
      totals,
      percent,
      recentDonations,
      unreadMessages,
      galleryCount,
      committeeCount,
    });
  })
);

// ===================== Settings =====================

router.get('/settings', (req, res) => {
  res.render('admin/settings', { pageTitle: 'Temple Settings', activeAdminNav: 'settings', settings: res.locals.settings });
});

router.post(
  '/settings',
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'heroImage', maxCount: 1 },
    { name: 'upiQrImage', maxCount: 1 },
  ]),
  wrap(async (req, res) => {
    const settings = await Settings.getSiteSettings();
    const b = req.body;

    settings.templeName = b.templeName?.trim() || settings.templeName;
    settings.deityName = b.deityName?.trim() || '';
    settings.tagline = b.tagline?.trim() || '';
    settings.aboutShort = b.aboutShort?.trim() || '';
    settings.address = b.address?.trim() || '';
    settings.phone = b.phone?.trim() || '';
    settings.email = b.email?.trim() || '';
    settings.whatsappNumber = (b.whatsappNumber || '').replace(/\D/g, '');
    settings.mapEmbedUrl = b.mapEmbedUrl?.trim() || '';
    settings.donationTargetAmount = Math.max(0, Number(b.donationTargetAmount) || 0);
    settings.upiId = b.upiId?.trim() || '';
    settings.taxInfo = b.taxInfo?.trim() || '';
    settings.locationShort = b.locationShort?.trim() || '';

    settings.bankDetails = {
      accountName: b.accountName?.trim() || '',
      accountNumber: b.accountNumber?.trim() || '',
      ifsc: b.ifsc?.trim() || '',
      bankName: b.bankName?.trim() || '',
      branch: b.branch?.trim() || '',
    };

    settings.festival = {
      name: b.festivalName?.trim() || 'Upcoming Festival',
      dateTime: b.festivalDateTime ? fromISTDatetimeLocal(b.festivalDateTime) : settings.festival.dateTime,
      enabled: b.festivalEnabled === 'on',
    };

    settings.socialLinks = {
      facebook: b.facebook?.trim() || '',
      instagram: b.instagram?.trim() || '',
      youtube: b.youtube?.trim() || '',
    };

    // File uploads (each optional - only replace if a new file was sent)
    if (req.files?.logo?.[0]) {
      await deleteImage(settings.logoPublicId);
      const result = await saveImage(req.files.logo[0], 'branding');
      settings.logoUrl = result.url;
      settings.logoPublicId = result.publicId;
    }
    if (req.files?.heroImage?.[0]) {
      await deleteImage(settings.heroImagePublicId);
      const result = await saveImage(req.files.heroImage[0], 'branding');
      settings.heroImageUrl = result.url;
      settings.heroImagePublicId = result.publicId;
    }
    if (req.files?.upiQrImage?.[0]) {
      await deleteImage(settings.upiQrPublicId);
      const result = await saveImage(req.files.upiQrImage[0], 'branding');
      settings.upiQrImageUrl = result.url;
      settings.upiQrPublicId = result.publicId;
    }

    await settings.save();
    settingsCache.invalidate();
    req.flash('success', 'Settings updated.');
    res.redirect('/admin/settings');
  })
);

// ===================== Gallery =====================

router.get(
  '/gallery',
  wrap(async (req, res) => {
    const images = await GalleryImage.find().sort({ year: -1, order: 1, createdAt: 1 }).lean();
    const byYear = {};
    images.forEach((img) => {
      byYear[img.year] = byYear[img.year] || [];
      byYear[img.year].push(img);
    });
    const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
    res.render('admin/gallery', { pageTitle: 'Gallery', activeAdminNav: 'gallery', byYear, years });
  })
);

router.post(
  '/gallery/add',
  upload.single('image'),
  wrap(async (req, res) => {
    const year = parseInt(req.body.year, 10);
    if (!year || !req.file) {
      req.flash('error', 'Please choose a year and an image file.');
      return res.redirect('/admin/gallery');
    }
    const result = await saveImage(req.file, `gallery/${year}`);
    await GalleryImage.create({
      year,
      caption: (req.body.caption || '').trim(),
      imageUrl: result.url,
      publicId: result.publicId,
    });
    req.flash('success', `Photo added to ${year}.`);
    res.redirect('/admin/gallery');
  })
);

router.post(
  '/gallery/:id/edit',
  upload.single('image'),
  wrap(async (req, res) => {
    const img = await GalleryImage.findById(req.params.id);
    if (!img) {
      req.flash('error', 'Photo not found.');
      return res.redirect('/admin/gallery');
    }
    const year = parseInt(req.body.year, 10);
    if (!year) {
      req.flash('error', 'Please choose a valid year.');
      return res.redirect('/admin/gallery');
    }
    img.year = year;
    img.caption = (req.body.caption || '').trim();

    if (req.file) {
      const oldPublicId = img.publicId;
      const result = await saveImage(req.file, `gallery/${year}`);
      img.imageUrl = result.url;
      img.publicId = result.publicId;
      await deleteImage(oldPublicId);
    }

    await img.save();
    req.flash('success', 'Photo updated.');
    res.redirect('/admin/gallery');
  })
);

router.post(
  '/gallery/:id/delete',
  wrap(async (req, res) => {
    const img = await GalleryImage.findById(req.params.id);
    if (img) {
      await deleteImage(img.publicId);
      await img.deleteOne();
      req.flash('success', 'Photo deleted.');
    }
    res.redirect('/admin/gallery');
  })
);

// ===================== History =====================

router.get(
  '/history',
  wrap(async (req, res) => {
    const history = await History.getHistory();
    res.render('admin/history', { pageTitle: 'Temple History', activeAdminNav: 'history', history });
  })
);

router.post(
  '/history',
  wrap(async (req, res) => {
    const history = await History.getHistory();
    history.intro = (req.body.intro || '').trim();
    await history.save();
    req.flash('success', 'History updated.');
    res.redirect('/admin/history');
  })
);

router.post(
  '/history/milestones/add',
  upload.single('image'),
  wrap(async (req, res) => {
    const year = parseInt(req.body.year, 10);
    const description = (req.body.description || '').trim();
    if (!year || !description) {
      req.flash('error', 'Please provide both a year and a description.');
      return res.redirect('/admin/history');
    }
    let imageUrl = '';
    let publicId = '';
    if (req.file) {
      const result = await saveImage(req.file, 'history');
      imageUrl = result.url;
      publicId = result.publicId;
    }
    const history = await History.getHistory();
    history.milestones.push({ year, description, imageUrl, publicId });
    await history.save();
    req.flash('success', 'Milestone added.');
    res.redirect('/admin/history');
  })
);

router.post(
  '/history/milestones/:milestoneId/edit',
  upload.single('image'),
  wrap(async (req, res) => {
    const history = await History.getHistory();
    const milestone = history.milestones.id(req.params.milestoneId);
    if (!milestone) {
      req.flash('error', 'Milestone not found.');
      return res.redirect('/admin/history');
    }
    const year = parseInt(req.body.year, 10);
    const description = (req.body.description || '').trim();
    if (!year || !description) {
      req.flash('error', 'Please provide both a year and a description.');
      return res.redirect('/admin/history');
    }
    milestone.year = year;
    milestone.description = description;
    if (req.file) {
      await deleteImage(milestone.publicId);
      const result = await saveImage(req.file, 'history');
      milestone.imageUrl = result.url;
      milestone.publicId = result.publicId;
    }
    await history.save();
    req.flash('success', 'Milestone updated.');
    res.redirect('/admin/history');
  })
);

router.post(
  '/history/milestones/:milestoneId/remove-photo',
  wrap(async (req, res) => {
    const history = await History.getHistory();
    const milestone = history.milestones.id(req.params.milestoneId);
    if (milestone) {
      await deleteImage(milestone.publicId);
      milestone.imageUrl = '';
      milestone.publicId = '';
      await history.save();
      req.flash('success', 'Photo removed.');
    }
    res.redirect('/admin/history');
  })
);

router.post(
  '/history/milestones/:milestoneId/delete',
  wrap(async (req, res) => {
    const history = await History.getHistory();
    const milestone = history.milestones.id(req.params.milestoneId);
    if (milestone) {
      await deleteImage(milestone.publicId);
      milestone.deleteOne();
      await history.save();
      req.flash('success', 'Milestone removed.');
    }
    res.redirect('/admin/history');
  })
);

// ===================== Committee =====================

router.get(
  '/committee',
  wrap(async (req, res) => {
    const members = await CommitteeMember.find().sort({ order: 1, createdAt: 1 }).lean();
    res.render('admin/committee', { pageTitle: 'Committee', activeAdminNav: 'committee', members });
  })
);

router.post(
  '/committee/add',
  upload.single('photo'),
  wrap(async (req, res) => {
    const name = (req.body.name || '').trim();
    if (!name) {
      req.flash('error', 'Please enter a name.');
      return res.redirect('/admin/committee');
    }
    let photoUrl = '/images/placeholders/avatar-placeholder.svg';
    let publicId = '';
    if (req.file) {
      const result = await saveImage(req.file, 'committee');
      photoUrl = result.url;
      publicId = result.publicId;
    }
    await CommitteeMember.create({
      name,
      role: (req.body.role || 'Committee Member').trim(),
      phone: (req.body.phone || '').trim(),
      order: Number(req.body.order) || 0,
      photoUrl,
      publicId,
    });
    req.flash('success', 'Committee member added.');
    res.redirect('/admin/committee');
  })
);

router.post(
  '/committee/:id/edit',
  upload.single('photo'),
  wrap(async (req, res) => {
    const member = await CommitteeMember.findById(req.params.id);
    if (!member) {
      req.flash('error', 'Member not found.');
      return res.redirect('/admin/committee');
    }
    member.name = (req.body.name || member.name).trim();
    member.role = (req.body.role || member.role).trim();
    member.phone = (req.body.phone || '').trim();
    member.order = Number(req.body.order) || 0;
    if (req.file) {
      await deleteImage(member.publicId);
      const result = await saveImage(req.file, 'committee');
      member.photoUrl = result.url;
      member.publicId = result.publicId;
    }
    await member.save();
    req.flash('success', 'Committee member updated.');
    res.redirect('/admin/committee');
  })
);

router.post(
  '/committee/:id/delete',
  wrap(async (req, res) => {
    const member = await CommitteeMember.findById(req.params.id);
    if (member) {
      await deleteImage(member.publicId);
      await member.deleteOne();
      req.flash('success', 'Committee member removed.');
    }
    res.redirect('/admin/committee');
  })
);

// ===================== Programs =====================

router.get(
  '/programs',
  wrap(async (req, res) => {
    const programs = await Program.find().sort({ dateTime: 1 }).lean();
    res.render('admin/programs', {
      pageTitle: 'Programs',
      activeAdminNav: 'programs',
      programs,
      toISTDatetimeLocal,
    });
  })
);

router.post(
  '/programs/add',
  upload.single('image'),
  wrap(async (req, res) => {
    const title = (req.body.title || '').trim();
    if (!title || !req.body.dateTime) {
      req.flash('error', 'Please provide a title and date/time.');
      return res.redirect('/admin/programs');
    }
    let imageUrl = '';
    let publicId = '';
    if (req.file) {
      const result = await saveImage(req.file, 'programs');
      imageUrl = result.url;
      publicId = result.publicId;
    }
    await Program.create({
      title,
      description: (req.body.description || '').trim(),
      dateTime: fromISTDatetimeLocal(req.body.dateTime),
      location: (req.body.location || '').trim(),
      imageUrl,
      publicId,
      order: Number(req.body.order) || 0,
    });
    req.flash('success', 'Program added.');
    res.redirect('/admin/programs');
  })
);

router.post(
  '/programs/:id/edit',
  upload.single('image'),
  wrap(async (req, res) => {
    const program = await Program.findById(req.params.id);
    if (!program) {
      req.flash('error', 'Program not found.');
      return res.redirect('/admin/programs');
    }
    program.title = (req.body.title || program.title).trim();
    program.description = (req.body.description || '').trim();
    program.location = (req.body.location || '').trim();
    program.order = Number(req.body.order) || 0;
    if (req.body.dateTime) {
      program.dateTime = fromISTDatetimeLocal(req.body.dateTime);
    }
    if (req.file) {
      await deleteImage(program.publicId);
      const result = await saveImage(req.file, 'programs');
      program.imageUrl = result.url;
      program.publicId = result.publicId;
    }
    await program.save();
    req.flash('success', 'Program updated.');
    res.redirect('/admin/programs');
  })
);

router.post(
  '/programs/:id/toggle-active',
  wrap(async (req, res) => {
    const program = await Program.findById(req.params.id);
    if (program) {
      program.isActive = !program.isActive;
      await program.save();
    }
    res.redirect('/admin/programs');
  })
);

router.post(
  '/programs/:id/delete',
  wrap(async (req, res) => {
    const program = await Program.findById(req.params.id);
    if (program) {
      await deleteImage(program.publicId);
      await program.deleteOne();
      req.flash('success', 'Program deleted.');
    }
    res.redirect('/admin/programs');
  })
);

// ===================== Announcements =====================

router.get(
  '/announcements',
  wrap(async (req, res) => {
    const announcements = await Announcement.find().sort({ order: 1, createdAt: -1 }).lean();
    res.render('admin/announcements', {
      pageTitle: 'Announcements',
      activeAdminNav: 'announcements',
      announcements,
    });
  })
);

router.post(
  '/announcements/add',
  wrap(async (req, res) => {
    const title = (req.body.title || '').trim();
    if (!title) {
      req.flash('error', 'Please enter a title.');
      return res.redirect('/admin/announcements');
    }
    await Announcement.create({
      title,
      message: (req.body.message || '').trim(),
      order: Number(req.body.order) || 0,
    });
    req.flash('success', 'Announcement added.');
    res.redirect('/admin/announcements');
  })
);

router.post(
  '/announcements/:id/edit',
  wrap(async (req, res) => {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      req.flash('error', 'Announcement not found.');
      return res.redirect('/admin/announcements');
    }
    announcement.title = (req.body.title || announcement.title).trim();
    announcement.message = (req.body.message || '').trim();
    announcement.order = Number(req.body.order) || 0;
    await announcement.save();
    req.flash('success', 'Announcement updated.');
    res.redirect('/admin/announcements');
  })
);

router.post(
  '/announcements/:id/toggle-active',
  wrap(async (req, res) => {
    const announcement = await Announcement.findById(req.params.id);
    if (announcement) {
      announcement.isActive = !announcement.isActive;
      await announcement.save();
    }
    res.redirect('/admin/announcements');
  })
);

router.post(
  '/announcements/:id/delete',
  wrap(async (req, res) => {
    const announcement = await Announcement.findById(req.params.id);
    if (announcement) {
      await announcement.deleteOne();
      req.flash('success', 'Announcement deleted.');
    }
    res.redirect('/admin/announcements');
  })
);

// ===================== Donors (honor roll) =====================

router.get(
  '/donors',
  wrap(async (req, res) => {
    const donors = await Donor.find().sort({ order: 1, createdAt: 1 }).lean();
    const categories = [...new Set(donors.map((d) => d.category))];
    res.render('admin/donors', {
      pageTitle: 'Donors',
      activeAdminNav: 'donors',
      donors,
      categories,
    });
  })
);

router.post(
  '/donors/add',
  wrap(async (req, res) => {
    const name = (req.body.name || '').trim();
    const category = (req.body.category || '').trim();
    if (!name || !category) {
      req.flash('error', 'Please enter both a name and a category.');
      return res.redirect('/admin/donors');
    }
    await Donor.create({
      name,
      category,
      note: (req.body.note || '').trim(),
      year: req.body.year ? Number(req.body.year) : undefined,
      order: Number(req.body.order) || 0,
    });
    req.flash('success', 'Donor added.');
    res.redirect('/admin/donors');
  })
);

router.post(
  '/donors/:id/edit',
  wrap(async (req, res) => {
    const donor = await Donor.findById(req.params.id);
    if (!donor) {
      req.flash('error', 'Donor not found.');
      return res.redirect('/admin/donors');
    }
    const name = (req.body.name || '').trim();
    const category = (req.body.category || '').trim();
    if (!name || !category) {
      req.flash('error', 'Please enter both a name and a category.');
      return res.redirect('/admin/donors');
    }
    donor.name = name;
    donor.category = category;
    donor.note = (req.body.note || '').trim();
    donor.year = req.body.year ? Number(req.body.year) : undefined;
    donor.order = Number(req.body.order) || 0;
    await donor.save();
    req.flash('success', 'Donor updated.');
    res.redirect('/admin/donors');
  })
);

router.post(
  '/donors/:id/delete',
  wrap(async (req, res) => {
    const donor = await Donor.findById(req.params.id);
    if (donor) {
      await donor.deleteOne();
      req.flash('success', 'Donor removed.');
    }
    res.redirect('/admin/donors');
  })
);

// ===================== Donations =====================

router.get(
  '/donations',
  wrap(async (req, res) => {
    const donations = await Donation.find().sort({ createdAt: -1 }).limit(200).lean();
    const totals = await Donation.getTotalRaised();
    res.render('admin/donations', { pageTitle: 'Donations', activeAdminNav: 'donations', donations, totals });
  })
);

router.post(
  '/donations/manual',
  wrap(async (req, res) => {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      req.flash('error', 'Please enter a valid amount.');
      return res.redirect('/admin/donations');
    }
    await Donation.create({
      name: (req.body.name || '').trim() || 'Anonymous Devotee',
      amount,
      isAnonymous: req.body.isAnonymous === 'on',
      method: 'manual',
      status: 'paid',
      note: (req.body.note || '').trim(),
    });
    req.flash('success', 'Manual donation recorded.');
    res.redirect('/admin/donations');
  })
);

router.post(
  '/donations/:id/toggle-visibility',
  wrap(async (req, res) => {
    const donation = await Donation.findById(req.params.id);
    if (donation) {
      donation.visibleOnLeaderboard = !donation.visibleOnLeaderboard;
      await donation.save();
    }
    res.redirect('/admin/donations');
  })
);

router.post(
  '/donations/:id/delete',
  wrap(async (req, res) => {
    await Donation.findByIdAndDelete(req.params.id);
    req.flash('success', 'Donation record deleted.');
    res.redirect('/admin/donations');
  })
);

// ===================== Contact messages =====================

router.get(
  '/messages',
  wrap(async (req, res) => {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).lean();
    res.render('admin/messages', { pageTitle: 'Messages', activeAdminNav: 'messages', messages });
  })
);

router.post(
  '/messages/:id/mark-read',
  wrap(async (req, res) => {
    await ContactMessage.findByIdAndUpdate(req.params.id, { status: 'read' });
    res.redirect('/admin/messages');
  })
);

router.post(
  '/messages/:id/delete',
  wrap(async (req, res) => {
    await ContactMessage.findByIdAndDelete(req.params.id);
    req.flash('success', 'Message deleted.');
    res.redirect('/admin/messages');
  })
);

// ===================== Account =====================

router.get('/account', (req, res) => {
  res.render('admin/account', { pageTitle: 'My Account', activeAdminNav: 'account' });
});

router.post(
  '/account/password',
  wrap(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const admin = await Admin.findById(req.session.adminId);
    const valid = admin && (await admin.checkPassword(currentPassword || ''));
    if (!valid) {
      req.flash('error', 'Current password is incorrect.');
      return res.redirect('/admin/account');
    }
    if (!newPassword || newPassword.length < 8) {
      req.flash('error', 'New password must be at least 8 characters.');
      return res.redirect('/admin/account');
    }
    if (newPassword !== confirmPassword) {
      req.flash('error', 'New password and confirmation do not match.');
      return res.redirect('/admin/account');
    }
    admin.passwordHash = await Admin.hashPassword(newPassword);
    await admin.save();
    req.flash('success', 'Password changed successfully.');
    res.redirect('/admin/account');
  })
);

module.exports = router;
