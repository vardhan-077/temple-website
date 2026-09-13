const mongoose = require('mongoose');

// Short, timely notices ("Special pooja this Friday", "Temple closed for
// renovation") shown in a "Latest Announcements" strip on the homepage.
// Separate from Program (which is a dated event) - an announcement has no
// required date and just stays visible until the admin hides or deletes it.
const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, default: '' },
    isActive: { type: Boolean, default: true }, // lets admin hide without deleting
    order: { type: Number, default: 0 }, // lower numbers pinned first
  },
  { timestamps: true }
);

// Active announcements, pinned order first, then newest first.
announcementSchema.statics.getActive = async function (limit = 20) {
  return this.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('Announcement', announcementSchema);
