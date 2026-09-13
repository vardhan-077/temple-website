/**
 * Populates the database with sensible placeholder content so the site
 * looks complete immediately after install. Safe to re-run - it only fills
 * in things that don't already exist, and never overwrites content you've
 * already edited from the admin panel.
 *
 * Run with: npm run seed
 */
require('dotenv').config();
const connectDB = require('../config/db');
const Settings = require('../models/Settings');
const History = require('../models/History');
const CommitteeMember = require('../models/CommitteeMember');
const GalleryImage = require('../models/GalleryImage');
const Program = require('../models/Program');
const Announcement = require('../models/Announcement');
const Admin = require('../models/Admin');

const PLACEHOLDER_BASE = '/images/placeholders';

async function seed() {
  await connectDB();

  // --- Settings (creates the singleton with schema defaults if missing) ---
  const settingsCount = await Settings.countDocuments();
  if (settingsCount === 0) {
    const nextFestival = new Date();
    nextFestival.setDate(nextFestival.getDate() + 45);
    await Settings.create({
      templeName: 'Sri Venkateswara Temple',
      deityName: 'Lord Venkateswara',
      tagline: 'A place of peace, devotion and community service',
      aboutShort:
        'Sample description — this is placeholder text. Replace it with your own temple’s story from Admin → Settings. Tell visitors about your deity, your daily rituals, and what makes your temple special.',
      address: '123 Temple Street, Your City, Your State - 000000, India',
      phone: '+91 90000 00000',
      email: 'contact@yourtemple.org',
      whatsappNumber: '919000000000',
      logoUrl: `${PLACEHOLDER_BASE}/logo-placeholder.svg`,
      heroImageUrl: '',
      donationTargetAmount: 1000000,
      bankDetails: {
        accountName: 'Sri Venkateswara Temple Trust',
        accountNumber: '000000000000',
        ifsc: 'ABCD0123456',
        bankName: 'Your Bank Name',
        branch: 'Main Branch',
      },
      upiId: 'yourtemple@upi',
      upiQrImageUrl: `${PLACEHOLDER_BASE}/upi-qr-placeholder.svg`,
      taxInfo:
        'Sample text: Donations to Sri Venkateswara Temple Trust are eligible for tax exemption under Section 80G. PAN: AAAAA0000A. Replace this from Admin → Settings with your trust’s real registration and tax details.',
      festival: { name: 'Annual Brahmotsavam', dateTime: nextFestival, enabled: true },
      socialLinks: { facebook: '', instagram: '', youtube: '' },
    });
    console.log('[seed] Created placeholder Settings');
  } else {
    console.log('[seed] Settings already exist - skipped');
  }

  // --- History ---
  const historyCount = await History.countDocuments();
  if (historyCount === 0) {
    const thisYear = new Date().getFullYear();
    await History.create({
      intro:
        'Sample history — replace this from Admin → History. Describe when and how your temple was founded, the legend or significance of the deity, and the community around it. A couple of paragraphs works well here.',
      milestones: [
        { year: thisYear - 40, description: 'Temple founded by local devotees on land donated by the community.' },
        { year: thisYear - 25, description: 'Main sanctum (garbhagriha) construction completed and first kumbhabhishekam performed.' },
        { year: thisYear - 12, description: 'Community hall and annadanam (free meal) facility added.' },
        { year: thisYear - 3, description: 'Temple renovated; second kumbhabhishekam performed.' },
        { year: thisYear, description: 'Continuing daily rituals, annual festivals, and community service.' },
      ],
    });
    console.log('[seed] Created placeholder History');
  } else {
    console.log('[seed] History already exists - skipped');
  }

  // --- Committee ---
  const committeeCount = await CommitteeMember.countDocuments();
  if (committeeCount === 0) {
    const avatar = `${PLACEHOLDER_BASE}/avatar-placeholder.svg`;
    await CommitteeMember.insertMany([
      { name: 'Add President Name', role: 'President', photoUrl: avatar, order: 1 },
      { name: 'Add Secretary Name', role: 'Secretary', photoUrl: avatar, order: 2 },
      { name: 'Add Treasurer Name', role: 'Treasurer', photoUrl: avatar, order: 3 },
      { name: 'Add Member Name', role: 'Committee Member', photoUrl: avatar, order: 4 },
    ]);
    console.log('[seed] Created placeholder committee members');
  } else {
    console.log('[seed] Committee members already exist - skipped');
  }

  // --- Gallery (a couple of sample years) ---
  const galleryCount = await GalleryImage.countDocuments();
  if (galleryCount === 0) {
    const thisYear = new Date().getFullYear();
    const variants = ['gallery-om', 'gallery-temple', 'gallery-diya', 'gallery-lotus', 'gallery-bell', 'gallery-conch'];
    const docs = [];
    [thisYear, thisYear - 1].forEach((year, yi) => {
      variants.forEach((name, i) => {
        docs.push({
          year,
          caption: 'Sample photo — replace from Admin → Gallery',
          imageUrl: `${PLACEHOLDER_BASE}/${name}.svg`,
          order: yi * variants.length + i,
        });
      });
    });
    await GalleryImage.insertMany(docs);
    console.log(`[seed] Created ${docs.length} placeholder gallery photos across ${thisYear - 1} and ${thisYear}`);
  } else {
    console.log('[seed] Gallery already has photos - skipped');
  }

  // --- Programs (a couple of sample upcoming events) ---
  const programCount = await Program.countDocuments();
  if (programCount === 0) {
    const inDays = (n, hour) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      d.setHours(hour, 0, 0, 0);
      return d;
    };
    await Program.insertMany([
      {
        title: 'Weekly Abhishekam',
        description: 'Sample program — replace or delete this from Admin → Programs. Regular weekly ritual open to all devotees.',
        dateTime: inDays(5, 7),
        location: 'Main Sanctum',
        order: 1,
      },
      {
        title: 'Monthly Satyanarayana Vratam',
        description: 'Sample program — replace or delete this from Admin → Programs. Followed by prasadam distribution.',
        dateTime: inDays(9, 18),
        location: 'Community Hall',
        order: 2,
      },
    ]);
    console.log('[seed] Created placeholder programs');
  } else {
    console.log('[seed] Programs already exist - skipped');
  }

  // --- Announcements ---
  const announcementCount = await Announcement.countDocuments();
  if (announcementCount === 0) {
    await Announcement.insertMany([
      {
        title: 'Sample announcement — replace or delete from Admin → Announcements',
        message:
          'This is a placeholder announcement with a longer message so you can see how the "Read more" expand link looks on the homepage. Replace this text with any real notice for your devotees, or delete it entirely.',
        order: 1,
      },
      {
        title: 'Short announcements work too',
        message: '',
        order: 2,
      },
    ]);
    console.log('[seed] Created placeholder announcements');
  } else {
    console.log('[seed] Announcements already exist - skipped');
  }

  // --- Admin account ---
  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';
  const existingAdmin = await Admin.findOne({ username: adminUsername });
  if (!existingAdmin) {
    const passwordHash = await Admin.hashPassword(adminPassword);
    await Admin.create({ username: adminUsername, passwordHash });
    console.log(`[seed] Created admin account "${adminUsername}" - log in at /admin/login`);
    console.log('[seed] IMPORTANT: change this password from Admin -> Account after your first login.');
  } else {
    console.log(`[seed] Admin account "${adminUsername}" already exists - skipped`);
  }

  console.log('[seed] Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
