const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'read'], default: 'new' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
