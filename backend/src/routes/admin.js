const router = require('express').Router();
const {
  findById, findMany, findOne, insert, updateById, updateMany, db
} = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

// ── Events ────────────────────────────────────────────────────────────────────

router.get('/events', (req, res) => {
  const events = [...db.events].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ events });
});

router.post('/events', (req, res, next) => {
  try {
    const { name, description, venue, date, totalSeats, pricePerSeat } = req.body;
    if (!name || !venue || !date || !totalSeats || !pricePerSeat)
      return res.status(400).json({ error: 'name, venue, date, totalSeats, pricePerSeat required' });

    const event = insert('events', {
      name,
      description: description || '',
      venue,
      date: new Date(date).toISOString(),
      totalSeats: parseInt(totalSeats),
      availableSeats: parseInt(totalSeats),
      pricePerSeat: parseInt(pricePerSeat),
      isActive: true,
    });
    res.status(201).json({ event });
  } catch (err) { next(err); }
});

router.put('/events/:id', (req, res, next) => {
  try {
    const allowed = ['name', 'description', 'venue', 'date', 'pricePerSeat', 'isActive'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const event = updateById('events', req.params.id, updates);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ event });
  } catch (err) { next(err); }
});

router.delete('/events/:id', (req, res, next) => {
  try {
    const event = updateById('events', req.params.id, { isActive: false });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deactivated', event });
  } catch (err) { next(err); }
});

// ── Seats ─────────────────────────────────────────────────────────────────────

router.post('/events/:id/seats/bulk', (req, res, next) => {
  try {
    const { rows, seatsPerRow } = req.body;
    if (!rows || !seatsPerRow)
      return res.status(400).json({ error: 'rows[] and seatsPerRow required' });

    const event = findById('events', req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const created = [];
    rows.forEach((row) => {
      for (let n = 1; n <= parseInt(seatsPerRow); n++) {
        const seatNumber = `${row}${n}`;
        const exists = findOne('seats', (s) => s.event === event._id && s.seatNumber === seatNumber);
        if (!exists) {
          created.push(insert('seats', {
            event: event._id,
            seatNumber,
            status: 'available',
            reservedBy: null,
            reservedAt: null,
            reservationExpiry: null,
            bookedBy: null,
            bookingId: null,
          }));
        }
      }
    });

    res.status(201).json({ created: created.length, seats: created });
  } catch (err) { next(err); }
});

router.get('/events/:id/seats', (req, res) => {
  const seats = findMany('seats', (s) => s.event === req.params.id)
    .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber))
    .map((s) => ({
      ...s,
      reservedBy: s.reservedBy ? findById('users', s.reservedBy) : null,
      bookedBy: s.bookedBy ? findById('users', s.bookedBy) : null,
    }));
  res.json({ seats });
});

// ── Bookings ──────────────────────────────────────────────────────────────────

router.get('/bookings', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { userId, eventId, status } = req.query;

  let bookings = findMany('bookings', (b) => {
    if (userId && b.user !== userId) return false;
    if (eventId && b.event !== eventId) return false;
    if (status && b.status !== status) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = bookings.length;
  bookings = bookings.slice((page - 1) * limit, page * limit).map((b) => ({
    ...b,
    user: findById('users', b.user),
    event: findById('events', b.event),
  }));

  res.json({ bookings, total, page, totalPages: Math.ceil(total / limit) || 1 });
});

router.post('/bookings/:id/cancel', (req, res, next) => {
  try {
    const booking = findById('bookings', req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'cancelled')
      return res.status(400).json({ error: 'Booking already cancelled' });

    // Refund wallet
    const user = findById('users', booking.user);
    const newBalance = user.walletBalance + booking.totalAmount;
    updateById('users', booking.user, { walletBalance: newBalance });

    // Record refund transaction
    insert('transactions', {
      user: booking.user,
      type: 'refund',
      amount: booking.totalAmount,
      balanceAfter: newBalance,
      description: 'Refund for cancelled booking',
      reference: booking._id,
    });

    // Release seats
    booking.seats.forEach((seatId) => {
      updateById('seats', seatId, {
        status: 'available',
        bookedBy: null,
        bookingId: null,
      });
    });

    // Restore event available count
    const event = findById('events', booking.event);
    if (event) {
      updateById('events', booking.event, {
        availableSeats: event.availableSeats + booking.seats.length,
      });
    }

    // Mark booking cancelled
    const updated = updateById('bookings', booking._id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: req.body.reason || 'Cancelled by admin',
    });

    res.json({ message: 'Booking cancelled and refund issued', booking: updated });
  } catch (err) { next(err); }
});

// ── Transactions ──────────────────────────────────────────────────────────────

router.get('/transactions', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { userId, type } = req.query;

  let txs = findMany('transactions', (t) => {
    if (userId && t.user !== userId) return false;
    if (type && t.type !== type) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = txs.length;
  txs = txs.slice((page - 1) * limit, page * limit).map((t) => ({
    ...t,
    user: findById('users', t.user),
  }));

  res.json({ transactions: txs, total, page, totalPages: Math.ceil(total / limit) || 1 });
});

// ── Users ─────────────────────────────────────────────────────────────────────

router.get('/users', (req, res) => {
  const users = findMany('users', (u) => u.role === 'user')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(({ password, ...u }) => u);
  res.json({ users });
});

module.exports = router;
