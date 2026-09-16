const mongoose = require('mongoose');

// The temple's daily schedule of poojas/rituals. "time" is kept as free text
// (e.g. "6:00 AM" or "6:00 AM - 6:30 AM") rather than a Date, since temple
// schedules are usually written and read that way rather than as exact
// timestamps.
const poojaTimingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Suprabhatam"
    time: { type: String, required: true }, // e.g. "6:00 AM"
    description: { type: String, default: '' }, // e.g. "Daily except Mondays"
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PoojaTiming', poojaTimingSchema);
