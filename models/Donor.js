const mongoose = require('mongoose');

// Honors donors and contributors to the temple - construction-era donors,
// major patrons, and special-purpose gifts (the idol itself, the idol's
// vastra/clothing, and so on). This is an admin-curated honor roll, separate
// from the live online-donation leaderboard in models/Donation.js.
const donorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Free text so the admin can label however fits - "Founding Donor",
    // "Idol Donor", "Idol Vastra Donor", "Major Contributor", etc. Donors
    // are grouped by this value on the public page.
    category: { type: String, required: true, default: 'Donor' },
    note: { type: String, default: '' }, // optional short description of the contribution
    year: { type: Number }, // optional - when they contributed
    order: { type: Number, default: 0 }, // lower numbers first, within AND across categories
  },
  { timestamps: true }
);

/**
 * Returns donors grouped by category, as an array of { category, donors }
 * groups. Categories appear in the order their first (lowest-order) donor
 * appears, so the admin controls category ordering simply by choosing order
 * numbers (e.g. 0-9 for "Founding Donor" entries, 10-19 for "Idol Donor").
 */
donorSchema.statics.getGrouped = async function () {
  const donors = await this.find().sort({ order: 1, createdAt: 1 }).lean();
  const groups = [];
  const indexByCategory = {};
  donors.forEach((d) => {
    if (!(d.category in indexByCategory)) {
      indexByCategory[d.category] = groups.length;
      groups.push({ category: d.category, donors: [] });
    }
    groups[indexByCategory[d.category]].donors.push(d);
  });
  return groups;
};

module.exports = mongoose.model('Donor', donorSchema);
