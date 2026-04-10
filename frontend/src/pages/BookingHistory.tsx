import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Booking, Event } from '../types';

const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

const BookingHistory: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookings')
      .then((res) => setBookings(res.data.bookings))
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status: string) => {
    if (status === 'confirmed') return <span className="badge badge-success">Confirmed</span>;
    if (status === 'cancelled') return <span className="badge badge-danger">Cancelled</span>;
    return <span className="badge badge-warning">Pending</span>;
  };

  if (loading) return <div className="spinner">Loading…</div>;

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">My Bookings</h1>

        {bookings.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎟</div>
            No bookings yet. <a href="/events">Browse events →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bookings.map((b) => {
              const ev = b.event as Event;
              return (
                <div className="card" key={b._id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                        {ev?.name ?? 'Event'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 6 }}>
                        📍 {ev?.venue} &nbsp;·&nbsp; 📅{' '}
                        {ev?.date
                          ? new Date(ev.date).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })
                          : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        {b.seatNumbers.map((sn) => (
                          <span key={sn} className="badge badge-info">{sn}</span>
                        ))}
                      </div>
                      {b.cancelledAt && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Cancelled on {new Date(b.cancelledAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {statusBadge(b.status)}
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', marginTop: 8 }}>
                        {fmt(b.totalAmount)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {new Date(b.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingHistory;
