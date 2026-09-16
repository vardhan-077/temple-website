const mongoose = require('mongoose');

// A festival/event with a start date and an optional end date (for multi-day
// celebrations). The homepage groups these into "Ongoing" (started, not yet
// ended) and "Upcoming" (not started yet) - anything already finished simply
// stops showing up on the public site, but stays visible to the admin so it
// can be edited or removed.
const festivalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date }, // optional - leave blank for a single-moment festival
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Splits all festivals into { ongoing, upcoming }, each sorted soonest first.
// A festival with no endDate is treated as ending the same instant it starts.
festivalSchema.statics.getGrouped = async function () {
  const now = new Date();
  const all = await this.find().sort({ startDate: 1, order: 1 }).lean();

  const ongoing = [];
  const upcoming = [];

  const daysBetween = (a, b) => Math.max(0, Math.ceil((a.getTime() - b.getTime()) / 86400000));

  all.forEach((f) => {
    const end = f.endDate || f.startDate;
    if (f.startDate <= now && now <= end) {
      f.daysToGo = daysBetween(end, now); // days left until this one ends
      ongoing.push(f);
    } else if (f.startDate > now) {
      f.daysToGo = daysBetween(f.startDate, now); // days left until this one starts
      upcoming.push(f);
    }
    // past festivals (end < now) are intentionally left out of the public view
  });

  return { ongoing, upcoming };
};

module.exports = mongoose.model('Festival', festivalSchema);
