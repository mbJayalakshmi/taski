const router = require('express').Router();
const { findById, updateById, insert, findMany } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/wallet
router.get('/', authenticate, (req, res) => {
  const user = findById('users', req.user._id);
  res.json({ balance: user.walletBalance });
});

// POST /api/wallet/add  { amount: number in paise }
router.post('/add', authenticate, (req, res, next) => {
  try {
    const amount = parseInt(req.body.amount, 10);
    if (!amount || amount <= 0)
      return res.status(400).json({ error: 'amount must be a positive integer (in paise)' });

    const user = findById('users', req.user._id);
    const newBalance = user.walletBalance + amount;
    updateById('users', req.user._id, { walletBalance: newBalance });

    const tx = insert('transactions', {
      user: req.user._id,
      type: 'credit',
      amount,
      balanceAfter: newBalance,
      description: 'Wallet top-up',
      reference: null,
    });

    res.json({ balance: newBalance, transaction: tx });
  } catch (err) {
    next(err);
  }
});

// GET /api/wallet/transactions
router.get('/transactions', authenticate, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const all = findMany('transactions', (t) => t.user === req.user._id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = all.length;
  const transactions = all.slice((page - 1) * limit, page * limit);

  res.json({ transactions, total, page, totalPages: Math.ceil(total / limit) || 1 });
});

module.exports = router;
