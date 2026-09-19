const mongoose = require('mongoose');

// One line item within an order. Name/price are a snapshot taken at order
// time (not a live reference), so an order's history stays accurate even if
// the product is later edited, renamed, repriced, or deleted.
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true }, // rupees, sum of price*quantity across items

    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: '' },
    address: { type: String, required: true },
    note: { type: String, default: '' },

    // 'razorpay' when paid through Razorpay Checkout, 'upi' when the buyer
    // was shown the UPI tap-to-pay/QR fallback (used whenever Razorpay isn't
    // configured), 'manual' for an order the admin recorded by hand.
    method: { type: String, enum: ['razorpay', 'upi', 'manual'], default: 'upi' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
    fulfillment: { type: String, enum: ['pending', 'packed', 'shipped', 'delivered'], default: 'pending' },

    razorpayOrderId: { type: String, default: '', index: true },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
  },
  { timestamps: true }
);

orderSchema.statics.getTotals = async function () {
  const result = await this.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
  ]);
  return result.length ? { total: result[0].total, count: result[0].count } : { total: 0, count: 0 };
};

module.exports = mongoose.model('Order', orderSchema);
