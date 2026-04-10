const { findMany, updateById, findById, updateMany } = require('../db');

/**
 * Release all seats whose reservation has expired back to available.
 * Called every 60s from index.js and inline before reserve/confirm.
 */
const releaseExpiredReservations = () => {
  const now = new Date();
  const expired = findMany(
    'seats',
    (s) => s.status === 'reserved' && s.reservationExpiry && new Date(s.reservationExpiry) <= now
  );

  if (expired.length === 0) return;

  // Count how many seats to restore per event
  const eventCounts = {};
  expired.forEach((s) => {
    eventCounts[s.event] = (eventCounts[s.event] || 0) + 1;
  });

  // Reset each expired seat
  expired.forEach((s) => {
    updateById('seats', s._id, {
      status: 'available',
      reservedBy: null,
      reservedAt: null,
      reservationExpiry: null,
    });
  });

  // Restore availableSeats counter on each event
  Object.entries(eventCounts).forEach(([eventId, count]) => {
    const event = findById('events', eventId);
    if (event) {
      updateById('events', eventId, { availableSeats: event.availableSeats + count });
    }
  });

  console.log(`Released ${expired.length} expired reservation(s)`);
};

module.exports = { releaseExpiredReservations };
