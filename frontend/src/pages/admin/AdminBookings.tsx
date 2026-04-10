import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Booking, Event, User } from '../../types';

const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

const AdminBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', userId: '', eventId: '' });
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetch = async (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: p.toString(), limit: '15' });
    if (filters.status) params.set('status', filters.status);
    if (filters.userId) params.set('userId', filters.userId);
    if (filters.eventId) params.set('eventId', filters.eventId);
    const res = await api.get(`/admin/bookings?${params}`);
    setBookings(res.data.bookings);
    setTotal(res.data.total);
    setTotalPages(res.data.totalPages);
    setLoading(false);
  };

  useEffect(() => { fetch(page); }, [page]); // eslint-disable-line

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetch(1);
  };

  const handleCancel = async (b: Booking) => {
    if (!window.confirm('Cancel this booking and refund the user?')) return;
    setCancelling(b._id);
    try {
      await api.post(`/admin/bookings/${b._id}/cancel`, { reason: 'Cancelled by admin' });
      await fetch(page);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Cancel failed');
    } finally {
      setCancelling(null);
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'confirmed') return <span className="badge badge-success">Confirmed</span>;
    if (s === 'cancelled') return <span className="badge badge-danger">Cancelled</span>;
    return <span className="badge badge-warning">Pending</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Bookings ({total})</h1>
      </div>

      {/* Filters */}
      <form className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }} onSubmit={handleFilter}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: 2, minWidth: 180 }}>
          <label>User ID</label>
          <input value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} placeholder="MongoDB ObjectId" />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 2, minWidth: 180 }}>
          <label>Event ID</label>
          <input value={filters.eventId} onChange={(e) => setFilters({ ...filters, eventId: e.target.value })} placeholder="MongoDB ObjectId" />
        </div>
        <button className="btn btn-primary" style={{ marginBottom: 0 }}>Filter</button>
        <button type="button" className="btn btn-outline" onClick={() => { setFilters({ status: '', userId: '', eventId: '' }); setPage(1); fetch(1); }}>
          Reset
        </button>
      </form>

      <div className="card">
        {loading ? (
          <div className="spinner">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="empty"><div className="empty-icon">📋</div>No bookings found</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Event</th>
                  <th>Seats</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const u = b.user as User;
                  const ev = b.event as Event;
                  return (
                    <tr key={b._id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{u?.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u?.email}</div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{ev?.name}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {b.seatNumbers.map((sn) => (
                            <span key={sn} className="badge badge-info">{sn}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{fmt(b.totalAmount)}</td>
                      <td>{statusBadge(b.status)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {new Date(b.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        {b.status === 'confirmed' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancel(b)}
                            disabled={cancelling === b._id}
                          >
                            {cancelling === b._id ? '…' : 'Cancel & Refund'}
                          </button>
                        )}
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

export default AdminBookings;
