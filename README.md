# taski — Ticket Booking + Wallet + Admin System

Full stack assessment submission.  
**Stack:** Node.js + Express · React 18 + TypeScript · MongoDB Atlas · JWT

---

## Project Structure

```
taski/
├── backend/
│   ├── src/
│   │   ├── index.js            — Express app entry point
│   │   ├── middleware/
│   │   │   └── auth.js         — JWT authentication + admin role guard
│   │   ├── models/
│   │   │   ├── User.js         — user + wallet balance (paise)
│   │   │   ├── Event.js        — event with available seat counter
│   │   │   ├── Seat.js         — individual seat with status + reservation expiry
│   │   │   ├── Booking.js      — booking with idempotency key
│   │   │   └── Transaction.js  — wallet ledger (credit / debit / refund)
│   │   ├── routes/
│   │   │   ├── auth.js         — register / login / me
│   │   │   ├── wallet.js       — balance / add money / history
│   │   │   ├── events.js       — list events / seat map
│   │   │   ├── bookings.js     — reserve + confirm (core concurrency logic)
│   │   │   └── admin.js        — event CRUD, seat bulk create, booking mgmt, refunds
│   │   └── utils/
│   │       └── reservation.js  — release expired reservations (runs every 60s)
│   ├── seed-admin.js           — creates admin user on first run
│   ├── vercel.json
│   └── .env.example
└── frontend/
    └── src/
        ├── api/client.ts       — Axios instance with JWT interceptor
        ├── context/AuthContext.tsx
        ├── types/index.ts
        ├── components/         — Navbar, ProtectedRoute
        └── pages/
            ├── Login, Register, Events, SeatSelection, Wallet, BookingHistory
            └── admin/          — AdminEvents, AdminBookings, AdminTransactions, AdminUsers
```

---

## Prerequisites

- Node.js >= 18
- A **MongoDB Atlas** account (free tier is fine) — local MongoDB will NOT work because
  multi-document transactions require a replica set, which Atlas provides automatically.

---

## Step 1 — MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com and create a free account
2. Create a free **M0 cluster** (any region)
3. **Database Access** → Add Database User → pick a username + password → note them
4. **Network Access** → Add IP Address → type `0.0.0.0/0` → Confirm
   (this allows connections from Render/Vercel — you can restrict later)
5. **Connect** → Drivers → copy the connection string, it looks like:
   ```
   mongodb+srv://joy:yourpassword@cluster0.abc12.mongodb.net/taski?retryWrites=true&w=majority
   ```

---

## Step 2 — Run Backend Locally

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in:
```
MONGO_URI=mongodb+srv://joy:yourpassword@cluster0.abc12.mongodb.net/taski?retryWrites=true&w=majority
JWT_SECRET=any_long_random_string_min_32_chars_change_this
CLIENT_URL=http://localhost:3000
```

```bash
npm install
node seed-admin.js        # creates admin@taski.com / Admin@123
npm run dev               # starts on http://localhost:5000
```

Verify: open http://localhost:5000/api/health — should return `{"status":"ok"}`

Admin credentials after seeding:
- Email: admin@taski.com
- Password: Admin@123

---

## Step 3 — Run Frontend Locally

```bash
cd frontend
npm install --legacy-peer-deps
npm start                 # starts on http://localhost:3000
```

No `.env` file needed for local dev — `package.json` has `"proxy": "http://localhost:5000"`
which automatically forwards all `/api` requests to the backend.

---

## Step 4 — Deploy Backend to Render

Render is recommended over Vercel for Express because it runs as a persistent server
(no cold start issues with MongoDB connection pooling).

1. Push this repo to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | MONGO_URI | your Atlas connection string |
   | JWT_SECRET | a long random secret |
   | JWT_EXPIRES_IN | 7d |
   | NODE_ENV | production |
   | CLIENT_URL | https://your-app.vercel.app (fill after step 5) |
6. Deploy → copy the URL e.g. `https://taski-backend.onrender.com`

After deploy, run the seed script once:
```bash
cd backend
MONGO_URI="your-atlas-uri" node seed-admin.js
```

---

## Step 5 — Deploy Frontend to Vercel

1. Go to https://vercel.com → New Project → import your GitHub repo
2. Framework Preset: **Create React App**
3. Root Directory: `frontend`
4. Add Environment Variable:
   | Key | Value |
   |-----|-------|
   | REACT_APP_API_URL | https://taski-backend.onrender.com/api |
5. Deploy → copy URL e.g. `https://taski.vercel.app`
6. Go back to Render → Environment → update `CLIENT_URL` to `https://taski.vercel.app` → Manual Deploy

---

## API Reference

### Auth
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | /api/auth/register | — | `{ name, email, password }` |
| POST | /api/auth/login | — | `{ email, password }` |
| GET | /api/auth/me | User | — |

### Wallet
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| GET | /api/wallet | User | — |
| POST | /api/wallet/add | User | `{ amount }` (in paise) |
| GET | /api/wallet/transactions | User | `?page=1&limit=20` |

### Events
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | /api/events | — | lists active events |
| GET | /api/events/:id | — | single event |
| GET | /api/events/:id/seats | User | seat map with status |

### Bookings
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | /api/bookings/reserve | User | `{ eventId, seatIds[] }` |
| POST | /api/bookings/confirm | User | `{ eventId, seatIds[], idempotencyKey }` |
| GET | /api/bookings | User | user's booking history |
| GET | /api/bookings/:id | User | single booking |

### Admin
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | /api/admin/events | Admin | all events |
| POST | /api/admin/events | Admin | create event |
| PUT | /api/admin/events/:id | Admin | update event |
| DELETE | /api/admin/events/:id | Admin | soft deactivate |
| POST | /api/admin/events/:id/seats/bulk | Admin | `{ rows[], seatsPerRow }` |
| GET | /api/admin/events/:id/seats | Admin | all seats with state |
| GET | /api/admin/bookings | Admin | `?status=&userId=&eventId=` |
| POST | /api/admin/bookings/:id/cancel | Admin | cancel + refund |
| GET | /api/admin/transactions | Admin | all transactions |
| GET | /api/admin/users | Admin | all users |

---

## Design Decisions

### 1. No Double Booking — Atomic Seat Reservation

The reserve endpoint uses a single `updateMany` with `status: 'available'` in the filter:

```js
const result = await Seat.updateMany(
  { _id: { $in: seatIds }, event: eventId, status: 'available' },
  { $set: { status: 'reserved', reservedBy: userId, reservationExpiry: expiry } }
);

if (result.modifiedCount !== seatIds.length) {
  // partial claim happened — roll back what we took
  await Seat.updateMany(
    { _id: { $in: seatIds }, reservedBy: userId, status: 'reserved' },
    { $set: { status: 'available', reservedBy: null, reservationExpiry: null } }
  );
  return res.status(409).json({ error: '...' });
}
```

MongoDB applies each document update atomically. Two concurrent requests for the same seat
both pass the filter check, but only one modifies the document (the other finds it already
`reserved`). The modifiedCount check catches the loser and rolls back.

### 2. No Double Spending — Conditional Wallet Debit

```js
const updatedUser = await User.findOneAndUpdate(
  { _id: userId, walletBalance: { $gte: totalAmount } },
  { $inc: { walletBalance: -totalAmount } },
  { new: true, session }
);
if (!updatedUser) return res.status(402).json({ error: 'Insufficient wallet balance' });
```

The condition `walletBalance: { $gte: totalAmount }` is evaluated atomically with the update.
Two concurrent payment requests cannot both deduct from the same balance.

### 3. Full Atomicity — Mongoose Session Transactions

The confirm flow (wallet debit + booking creation + seat state + transaction log) all run inside
a single MongoDB session. Any failure rolls everything back together.
Requires MongoDB Atlas (replica set).

### 4. Idempotency

Each confirm request accepts an `idempotencyKey` (UUID generated client-side).
If a network timeout causes the client to retry, the server detects the duplicate key
and returns the original booking instead of creating a second one.

### 5. Reservation Expiry

Seats are locked for 5 minutes. A background job (`setInterval`) runs every 60 seconds
to release expired reservations atomically. The reserve and confirm endpoints also run
cleanup inline before processing, so expiry is never stale by more than the request timing.

### 6. Money as Integer (Paise)

All monetary values are stored and transmitted as integers in paise (₹1 = 100 paise).
The frontend converts for display only. This avoids all floating-point precision issues.

---

## Assumptions

1. Payment is wallet-only — no external payment gateway.
2. Admin users are created via `seed-admin.js` — no public admin registration endpoint.
3. Seats are bulk-created via admin API after event creation.
4. Maximum 10 seats per booking.
5. Cancelled bookings are refunded in full.
6. Events are soft-deleted (isActive flag) to preserve booking history integrity.
7. Wallet top-up has no external payment source — admin or user can add directly (simulated).
