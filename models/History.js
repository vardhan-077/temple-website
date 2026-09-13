const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  { _id: true }
);

// Singleton, like Settings - one document holds the whole history page.
const historySchema = new mongoose.Schema(
  {
    intro: {
      type: String,
      default:
        'Write your temple’s story here from the admin panel — how and when it was founded, the deity, and what makes it special to your community.',
    },
    milestones: { type: [milestoneSchema], default: [] },
  },
  { timestamps: true }
);

historySchema.statics.getHistory = async function () {
  let history = await this.findOne();
  if (!history) {
    history = await this.create({
      milestones: [
        { year: new Date().getFullYear() - 25, description: 'The temple was founded by devotees of the local community.' },
        { year: new Date().getFullYear() - 10, description: 'Main sanctum renovated and expanded with community support.' },
        { year: new Date().getFullYear(), description: 'Continuing to serve devotees with daily rituals and annual festivals.' },
      ],
    });
  }
  return history;
};

module.exports = mongoose.model('History', historySchema);
