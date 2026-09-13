const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, index: true },
    caption: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    publicId: { type: String, default: '' }, // cloudinary public_id, or local file path - used for deletion
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
