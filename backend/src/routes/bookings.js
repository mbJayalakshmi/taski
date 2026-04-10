const router = require('express').Router();
const { db, findById, findMany, findOne, insert, updateById, updateMany, newId } = require('../db');
const { authenticate } = require('../middleware/auth');
const { releaseExpiredReservations } = require('../utils/reservation');

const RESERVATION_MINUTES = 5;

// ─── POST /api/bookings/reserve ───────────────────────────────────────────────
router.post('/reserve', authenticate, (req, res, next) => {
  try {
    const { eventId, seatIds } = req.body;
    if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0)
      return res.status(400).json({ error: 'eventId and seatIds[] are required' });
    if (seatIds.length > 10)
      return res.status(400).json({ error: 'Cannot reserve more than 10 seats at once' });

    releaseExpiredReservations();

    const event = findById('events', eventId);
    if (!event || !event.isActive)
      return res.status(404).json({ error: 'Event not found or inactive' });

    const now = new Date();
    const expiry = new Date(now.getTime() + RESERVATION_MINUTES * 60 * 1000);
    const userId = req.user._id;

    // Atomically check all requested seats are available before touching any.
    // This prevents partial reservations — all-or-nothing.
    const requestedSeats = seatIds.map((id) => findById('seats', id));

    const unavailable = requestedSeats.filter(
      (s) => !s || s.event !== eventId || s.status !== 'available'
    );

    if (unavailable.length > 0) {
      return res.status(409).json({
        error: 'One or more seats are no longer available. Please refresh and try again.',
      });
    }

    // All seats are available — reserve them
    requestedSeats.forEach((seat) => {
      updateById('seats', seat._id, {
        status: 'reserved',
        reservedBy: userId,
        reservedAt: now.toISOString(),
        reservationExpiry: expiry.toISOString(),
      });
    });

    updateById('events', eventId, {
      availableSeats: event.availableSeats - seatIds.length,
    });

    res.json({
      message: 'Seats reserved successfully',
      expiresAt: expiry,
      reservedSeats: seatIds,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/bookings/confirm ───────────────────────────────────────────────
router.post('/confirm', authenticate, (req, res, next) => {
  try {
    const { eventId, seatIds, idempotencyKey } = req.body;
    if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0)
      return res.status(400).json({ error: 'eventId and seatIds[] are required' });

    // Idempotency: same key = return existing booking
    if (idempotencyKey) {
      const existing = findOne('bookings', (b) => b.idempotencyKey === idempotencyKey);
      if (existing) {
        return res.json({ booking: existing, duplicate: true });
      }
    }

    releaseExpiredReservations();

    const userId = req.user._id;
    const now = new Date();

    // Verify all seats are still reserved by this user and not expired
    const seats = seatIds.map((id) => findById('seats', id));
    const invalid = seats.filter(
      (s) =>
        !s ||
        s.event !== eventId ||
        s.status !== 'reserved' ||
        s.reservedBy !== userId ||
        new Date(s.reservationExpiry) <= now
    );

    if (invalid.length > 0) {
      return res.status(409).json({
        error: 'Reservation expired or seats not reserved by you. Please start over.',
      });
    }

    const event = findById('events', eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const totalAmount = event.pricePerSeat * seats.length;

    // Atomic wallet debit — re-read user fresh and check balance
    const user = findById('users', userId);
    if (user.walletBalance < totalAmount) {
      return res.status(402).json({ error: 'Insufficient wallet balance' });
    }

    // Deduct wallet
    const newBalance = user.walletBalance - totalAmount;
    updateById('users', userId, { walletBalance: newBalance });

    // Create booking
    const booking = insert('bookings', {
      user: userId,
      event: eventId,
      seats: seatIds,
      seatNumbers: seats.map((s) => s.seatNumber),
      totalAmount,
      status: 'confirmed',
      idempotencyKey: idempotencyKey || null,
      transactionId: null,
      cancelledAt: null,
      cancellationReason: null,
    });

    // Record transaction
    const tx = insert('transactions', {
      user: userId,
      type: 'debit',
      amount: totalAmount,
      balanceAfter: newBalance,
      description: `Booking for ${event.name}`,
      reference: booking._id,
    });

    // Link transaction to booking
    updateById('bookings', booking._id, { transactionId: tx._id });

    // Mark all seats as booked
    seats.forEach((seat) => {
      updateById('seats', seat._id, {
        status: 'booked',
        bookedBy: userId,
        bookingId: booking._id,
        reservedBy: null,
        reservedAt: null,
        reservationExpiry: null,
      });
    });

    res.status(201).json({
      booking: findById('bookings', booking._id),
      transaction: tx,
      walletBalance: newBalance,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/bookings ────────────────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  const bookings = findMany('bookings', (b) => b.user === req.user._id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((b) => ({
      ...b,
      event: findById('events', b.event),
    }));
  res.json({ bookings });
});

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
  const booking = findById('bookings', req.params.id);
  if (!booking || booking.user !== req.user._id)
    return res.status(404).json({ error: 'Booking not found' });
  res.json({ booking: { ...booking, event: findById('events', booking.event) } });
});


module.exports = router;
