const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit', 'refund'], required: true },
    amount: { type: Number, required: true }, // in paise
    balanceAfter: { type: Number, required: true }, // snapshot in paise
    description: { type: String, required: true },
    reference: { type: String }, // bookingId or external reference
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
