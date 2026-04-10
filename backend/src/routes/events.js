const router = require('express').Router();
const { findMany, findById } = require('../db');
const { authenticate } = require('../middleware/auth');
const { releaseExpiredReservations } = require('../utils/reservation');

// GET /api/events
router.get('/', (req, res) => {
  const events = findMany('events', (e) => e.isActive)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json({ events });
});

// GET /api/events/:id
router.get('/:id', (req, res) => {
  const event = findById('events', req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json({ event });
});

// GET /api/events/:id/seats
router.get('/:id/seats', authenticate, (req, res) => {
  const event = findById('events', req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // Release expired reservations first so seat states are accurate
  releaseExpiredReservations();

  const seats = findMany('seats', (s) => s.event === req.params.id)
    .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }))
    .map((seat) => ({
      _id: seat._id,
      seatNumber: seat.seatNumber,
      status: seat.status,
      isYours: seat.status === 'reserved' && seat.reservedBy === req.user._id,
    }));

  res.json({ seats });
});

module.exports = router;
