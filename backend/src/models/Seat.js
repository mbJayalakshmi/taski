const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    seatNumber: { type: String, required: true }, // e.g. "A1", "B12"
    status: {
      type: String,
      enum: ['available', 'reserved', 'booked'],
      default: 'available',
    },
    // Set when reserved; cleared on booking or expiry
    reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reservedAt: { type: Date, default: null },
    reservationExpiry: { type: Date, default: null },
    // Set permanently on booking
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  },
  { timestamps: true }
);

seatSchema.index({ event: 1, status: 1 });
seatSchema.index({ event: 1, seatNumber: 1 }, { unique: true });
// TTL-style query support — we do manual cleanup, not TTL index,
// because TTL on non-root fields is not supported cleanly.

module.exports = mongoose.model('Seat', seatSchema);
