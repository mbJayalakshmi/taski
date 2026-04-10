const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    seats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Seat' }],
    seatNumbers: [String], // denormalized for easy display
    totalAmount: { type: Number, required: true }, // in paise
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    // Idempotency key — client sends this to prevent duplicate bookings on retry
    idempotencyKey: { type: String, unique: true, sparse: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ event: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
