import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Transaction, User } from '../../types';

const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

const AdminTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');

  const fetch = async (p = page, type = typeFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ page: p.toString(), limit: '15' });
    if (type) params.set('type', type);
    const res = await api.get(`/admin/transactions?${params}`);
    setTransactions(res.data.transactions);
    setTotal(res.data.total);
    setTotalPages(res.data.totalPages);
    setLoading(false);
  };

  useEffect(() => { fetch(page, typeFilter); }, [page]); // eslint-disable-line

  const typeBadge = (type: string) => {
    if (type === 'credit') return <span className="badge badge-success">Credit</span>;
    if (type === 'refund') return <span className="badge badge-info">Refund</span>;
    return <span className="badge badge-danger">Debit</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Transactions ({total})</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'credit', 'debit', 'refund'].map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setTypeFilter(t); setPage(1); fetch(1, t); }}
            >
              {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner">Loading…</div>
        ) : transactions.length === 0 ? (
          <div className="empty"><div className="empty-icon">💳</div>No transactions</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const u = tx.user as User;
                  return (
                    <tr key={tx._id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{u?.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u?.email}</div>
                      </td>
                      <td>{typeBadge(tx.type)}</td>
                      <td style={{ fontWeight: 600, color: tx.type === 'debit' ? 'var(--danger)' : 'var(--success)' }}>
                        {tx.type === 'debit' ? '-' : '+'}{fmt(tx.amount)}
                      </td>
                      <td>{fmt(tx.balanceAfter)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{tx.description}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {new Date(tx.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTransactions;
