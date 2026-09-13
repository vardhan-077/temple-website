const mongoose = require('mongoose');

const committeeMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, required: true, default: 'Committee Member' },
    photoUrl: { type: String, default: '' },
    publicId: { type: String, default: '' },
    phone: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CommitteeMember', committeeMemberSchema);
