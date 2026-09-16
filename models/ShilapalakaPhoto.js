const mongoose = require('mongoose');

// Photos of the temple's shilapalakas - the inscribed stone plaques honoring
// donors who gave land, materials, or funds during construction. The names
// and amounts are already engraved on the stone itself, so this just stores
// photos of the plaques (with an optional caption) rather than re-typing
// every name into the database.
const shilapalakaPhotoSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    publicId: { type: String, default: '' },
    caption: { type: String, default: '' }, // e.g. "Land & Material Donors"
    order: { type: Number, default: 0 }, // lower numbers first
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShilapalakaPhoto', shilapalakaPhotoSchema);
