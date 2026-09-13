const mongoose = require('mongoose');

// This collection only ever holds ONE document - the temple's site-wide
// settings. We always look it up with findOne() and create it via the seed
// script if it doesn't exist yet.
const settingsSchema = new mongoose.Schema(
  {
    templeName: { type: String, required: true, default: 'Sri Temple Name' },
    deityName: { type: String, default: '' },
    tagline: { type: String, default: 'A place of peace, devotion and community' },
    aboutShort: {
      type: String,
      default:
        'Welcome to our temple. This text is a placeholder — update it any time from the admin panel under Settings.',
    },

    address: { type: String, default: '123 Temple Street, Your City, State - 000000' },
    locationShort: { type: String, default: '' }, // short "Village • District" line shown over the hero photo
    phone: { type: String, default: '+91 90000 00000' },
    email: { type: String, default: 'contact@yourtemple.org' },
    whatsappNumber: { type: String, default: '919000000000' },
    mapEmbedUrl: { type: String, default: '' },

    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    heroImageUrl: { type: String, default: '' },
    heroImagePublicId: { type: String, default: '' },

    donationTargetAmount: { type: Number, default: 500000 },

    bankDetails: {
      accountName: { type: String, default: 'Sri Temple Trust' },
      accountNumber: { type: String, default: '000000000000' },
      ifsc: { type: String, default: 'ABCD0123456' },
      bankName: { type: String, default: 'Your Bank Name' },
      branch: { type: String, default: 'Main Branch' },
    },
    upiId: { type: String, default: 'yourtemple@upi' },
    upiQrImageUrl: { type: String, default: '' },
    upiQrPublicId: { type: String, default: '' },

    taxInfo: {
      type: String,
      default: '',
    },

    festival: {
      name: { type: String, default: 'Annual Festival' },
      dateTime: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      enabled: { type: Boolean, default: true },
    },

    socialLinks: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

settingsSchema.statics.getSiteSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
