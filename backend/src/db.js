/**
 * db.js — in-memory store, replaces MongoDB entirely.
 * Data lives in plain JS arrays/objects. Resets on server restart.
 * All IDs are random hex strings (like MongoDB ObjectIds).
 */

const { randomBytes } = require('crypto');

const newId = () => randomBytes(12).toString('hex');

const now = () => new Date().toISOString();

// ── Tables ────────────────────────────────────────────────────────────────────
const db = {
  users: [],
  events: [],
  seats: [],
  bookings: [],
  transactions: [],
};

// ── Generic helpers ───────────────────────────────────────────────────────────

function findById(table, id) {
  return db[table].find((r) => r._id === id) || null;
}

function findOne(table, predicate) {
  return db[table].find(predicate) || null;
}

function findMany(table, predicate) {
  if (!predicate) return [...db[table]];
  return db[table].filter(predicate);
}

function insert(table, data) {
  const record = { _id: newId(), createdAt: now(), updatedAt: now(), ...data };
  db[table].push(record);
  return record;
}

function updateById(table, id, changes) {
  const idx = db[table].findIndex((r) => r._id === id);
  if (idx === -1) return null;
  db[table][idx] = { ...db[table][idx], ...changes, updatedAt: now() };
  return db[table][idx];
}

function updateMany(table, predicate, changes) {
  let count = 0;
  db[table] = db[table].map((r) => {
    if (predicate(r)) {
      count++;
      return { ...r, ...changes, updatedAt: now() };
    }
    return r;
  });
  return count;
}

function deleteById(table, id) {
  const before = db[table].length;
  db[table] = db[table].filter((r) => r._id !== id);
  return db[table].length < before;
}

// ── Seed data — pre-loaded so the app is usable immediately ──────────────────
function seedData() {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('Admin@123', 10);

  // Admin user
  const admin = insert('users', {
    name: 'Admin',
    email: 'admin@taski.com',
    password: hash,
    role: 'admin',
    walletBalance: 0,
  });

  // Demo user
  const user = insert('users', {
    name: 'Joy Dev',
    email: 'joy@dev.com',
    password: bcrypt.hashSync('password123', 10),
    role: 'user',
    walletBalance: 500000, // ₹5000 starting balance
  });

  // Events
  const e1 = insert('events', {
    name: 'Bangalore Tech Fest',
    description: 'Annual developer conference',
    venue: 'KTPO, Whitefield',
    date: new Date('2026-05-15T10:00:00Z').toISOString(),
    totalSeats: 40,
    availableSeats: 40,
    pricePerSeat: 49900, // ₹499
    isActive: true,
  });

  const e2 = insert('events', {
    name: 'Startup Summit 2026',
    description: 'Connect with founders and investors',
    venue: 'IISc Campus, Bengaluru',
    date: new Date('2026-06-03T09:00:00Z').toISOString(),
    totalSeats: 60,
    availableSeats: 60,
    pricePerSeat: 29900, // ₹299
    isActive: true,
  });

  const e3 = insert('events', {
    name: 'React India 2026',
    description: 'India\'s biggest React conference',
    venue: 'Nimhans Convention Centre',
    date: new Date('2026-07-20T09:30:00Z').toISOString(),
    totalSeats: 50,
    availableSeats: 50,
    pricePerSeat: 79900, // ₹799
    isActive: true,
  });

  // Bulk create seats for each event
  const rows = ['A', 'B', 'C', 'D', 'E'];
  [e1, e2, e3].forEach((ev, ei) => {
    const seatsPerRow = ei === 0 ? 8 : ei === 1 ? 12 : 10;
    rows.forEach((row) => {
      for (let n = 1; n <= seatsPerRow; n++) {
        insert('seats', {
          event: ev._id,
          seatNumber: `${row}${n}`,
          status: 'available',
          reservedBy: null,
          reservedAt: null,
          reservationExpiry: null,
          bookedBy: null,
          bookingId: null,
        });
      }
    });
  });

  console.log('Seed complete:');
  console.log('  Admin  → admin@taski.com / Admin@123');
  console.log('  User   → joy@dev.com / password123 (wallet: ₹5000)');
  console.log('  Events →', db.events.length, 'events,', db.seats.length, 'seats');
}

module.exports = {
  db,
  newId,
  now,
  findById,
  findOne,
  findMany,
  insert,
  updateById,
  updateMany,
  deleteById,
  seedData,
};
