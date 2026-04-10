import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Transaction } from '../types';
import { useAuth } from '../context/AuthContext';

const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

const PRESETS = [50000, 100000, 500000, 1000000]; // paise: ₹500, ₹1000, ₹5000, ₹10000

const Wallet: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTx = async (p = 1) => {
    setTxLoading(true);
    try {
      const res = await api.get(`/wallet/transactions?page=${p}&limit=10`);
      setTransactions(res.data.transactions);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => { fetchTx(page); }, [page]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const paise = Math.round(parseFloat(amount) * 100);
    if (!paise || paise <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      await api.post('/wallet/add', { amount: paise });
      setSuccess(`₹${(paise / 100).toFixed(2)} added to wallet`);
      setAmount('');
      await refreshUser();
      await fetchTx(1);
      setPage(1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add money');
    } finally {
      setLoading(false);
    }
  };

  const typeBadge = (type: string) => {
    if (type === 'credit') return <span className="badge badge-success">Credit</span>;
    if (type === 'refund') return <span className="badge badge-info">Refund</span>;
    return <span className="badge badge-danger">Debit</span>;
  };

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Wallet</h1>

        <div className="two-col">
          {/* Balance + Add money */}
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                Available Balance
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                {fmt(user?.walletBalance ?? 0)}
              </div>
            </div>

            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 14 }}>Add Money</div>
              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}
              <form onSubmit={handleAdd}>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setAmount((p / 100).toString())}
                    >
                      +{fmt(p)}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Adding…' : 'Add Money'}
                </button>
              </form>
            </div>
          </div>

          {/* Transaction history */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 14 }}>
              Transaction History ({total})
            </div>
            {txLoading ? (
              <div className="spinner">Loading…</div>
            ) : transactions.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">💳</div>
                No transactions yet
              </div>
            ) : (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Balance</th>
                        <th>Description</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx._id}>
                          <td>{typeBadge(tx.type)}</td>
                          <td style={{ color: tx.type === 'debit' ? 'var(--danger)' : 'var(--success)' }}>
                            {tx.type === 'debit' ? '-' : '+'}{fmt(tx.amount)}
                          </td>
                          <td>{fmt(tx.balanceAfter)}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                            {tx.description}
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="pagination">
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {page} / {totalPages}
                    </span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
