const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Anonymous Devotee', trim: true },
    amount: { type: Number, required: true }, // stored in rupees, not paise
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    message: { type: String, default: '' },
    isAnonymous: { type: Boolean, default: false },

    method: { type: String, enum: ['razorpay', 'manual'], default: 'razorpay' },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },

    razorpayOrderId: { type: String, default: '', index: true },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },

    visibleOnLeaderboard: { type: Boolean, default: true },
    note: { type: String, default: '' }, // internal admin note, e.g. "cash handed at temple office"
  },
  { timestamps: true }
);

donationSchema.statics.getTotalRaised = async function () {
  const result = await this.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  return result.length ? { total: result[0].total, count: result[0].count } : { total: 0, count: 0 };
};

donationSchema.statics.getLeaderboard = async function (limit = 10) {
  return this.find({ status: 'paid', visibleOnLeaderboard: true })
    .sort({ amount: -1, createdAt: 1 })
    .limit(limit)
    .select('name amount isAnonymous createdAt')
    .lean();
};

module.exports = mongoose.model('Donation', donationSchema);
