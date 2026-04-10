require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { seedData } = require('./db');

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const { releaseExpiredReservations } = require('./utils/reservation');

const app = express();

// CORS — open in dev, locked to CLIENT_URL in production
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : true; // true = allow ALL origins (local dev)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

seedData();
app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log('Accounts ready:');
  console.log('  admin@taski.com  /  Admin@123');
  console.log('  joy@dev.com      /  password123\n');
});

setInterval(releaseExpiredReservations, 60 * 1000);

module.exports = app;
