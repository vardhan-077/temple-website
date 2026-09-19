const mongoose = require('mongoose');

// A single item in the temple shop - pooja items, temple merchandise,
// religious books, clothing or jewellery replicas, etc. Kept deliberately
// simple (no stock counts): the admin just toggles isActive off when
// something is sold out and back on when restocked, the same way
// Program.js handles "hide from site" already.
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true }, // rupees, whole item price
    category: { type: String, required: true, default: 'Pooja Items & Temple Merchandise' },
    imageUrl: { type: String, default: '' },
    publicId: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }, // lower numbers first, within AND across categories
  },
  { timestamps: true }
);

/**
 * Returns active products grouped by category, as an array of
 * { category, products } groups - same shape/ordering convention as
 * Donor.getGrouped(), so the public catalog page can render section by
 * section the same way the donor honor roll does.
 */
productSchema.statics.getActiveGrouped = async function () {
  const products = await this.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
  const groups = [];
  const indexByCategory = {};
  products.forEach((p) => {
    if (!(p.category in indexByCategory)) {
      indexByCategory[p.category] = groups.length;
      groups.push({ category: p.category, products: [] });
    }
    groups[indexByCategory[p.category]].products.push(p);
  });
  return groups;
};

module.exports = mongoose.model('Product', productSchema);
