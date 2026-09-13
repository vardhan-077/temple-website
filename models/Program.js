const mongoose = require('mongoose');

// Upcoming temple programs/events (pujas, festivals, community events, etc.)
// Separate from the one-off "festival countdown" in Settings - this is a
// running list so the admin can list several events at once (e.g. "the next
// 10 days"), each with its own date, location and optional photo/poster.
const programSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    dateTime: { type: Date, required: true },
    location: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    publicId: { type: String, default: '' },
    isActive: { type: Boolean, default: true }, // lets admin hide a program without deleting it
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Programs happening from `hoursGrace` in the past onward, soonest first.
// A small grace window keeps a same-day program visible for a few hours
// after its listed start time instead of disappearing the moment it begins.
programSchema.statics.getUpcoming = async function (limit = 50, hoursGrace = 6) {
  const cutoff = new Date(Date.now() - hoursGrace * 60 * 60 * 1000);
  return this.find({ isActive: true, dateTime: { $gte: cutoff } })
    .sort({ dateTime: 1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('Program', programSchema);
