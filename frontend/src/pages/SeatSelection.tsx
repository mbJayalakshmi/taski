import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import api from '../api/client';
import { Event, Seat } from '../types';
import { useAuth } from '../context/AuthContext';

const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

type Step = 'select' | 'confirm' | 'success';

const SeatSelection: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selected, setSelected] = useState<string[]>([]); // seat _ids
  const [step, setStep] = useState<Step>('select');
  const [reservedUntil, setReservedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');


  const fetchData = useCallback(async () => {
    try {
      const [evRes, seatsRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/events/${id}/seats`),
      ]);
      setEvent(evRes.data.event);
      setSeats(seatsRes.data.seats);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Countdown timer for reservation
  useEffect(() => {
    if (!reservedUntil) return;
    const interval = setInterval(() => {
      const diff = reservedUntil.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Expired');
        setStep('select');
        setSelected([]);
        fetchData();
        clearInterval(interval);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdown(`${m}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [reservedUntil, fetchData]);

  const toggleSeat = (seat: Seat) => {
    if (seat.status !== 'available') return;
    setSelected((prev) =>
      prev.includes(seat._id)
        ? prev.filter((id) => id !== seat._id)
        : [...prev, seat._id]
    );
  };

  const handleReserve = async () => {
    setError('');
    setActionLoading(true);
    try {
      const res = await api.post('/bookings/reserve', { eventId: id, seatIds: selected });
      setReservedUntil(new Date(res.data.expiresAt));
      setStep('confirm');
      // Refresh seat states
      const seatsRes = await api.get(`/events/${id}/seats`);
      setSeats(seatsRes.data.seats);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reservation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setActionLoading(true);
    try {
      const idempotencyKey = uuidv4();
      const res = await api.post('/bookings/confirm', {
        eventId: id,
        seatIds: selected,
        idempotencyKey,
      });
      setStep('success');
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Booking failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="spinner">Loading…</div>;
  if (!event) return <div className="container"><p>Event not found.</p></div>;

  const selectedSeats = seats.filter((s) => selected.includes(s._id));
  const total = event.pricePerSeat * selected.length;
  const canAfford = (user?.walletBalance ?? 0) >= total;

  if (step === 'success') {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 520 }}>
          <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
            <h2 style={{ marginBottom: 8 }}>Booking Confirmed!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              Seats: {selectedSeats.map(s => s.seatNumber).join(', ')}<br />
              Total paid: {fmt(total)}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('/bookings')}>
                View Bookings
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/events')}>
                Browse Events
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <button className="btn btn-outline btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate('/events')}>
          ← Back
        </button>

        <div style={{ marginBottom: 20 }}>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{event.name}</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            📍 {event.venue} &nbsp;·&nbsp; 📅 {new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            &nbsp;·&nbsp; {fmt(event.pricePerSeat)} per seat
          </div>
        </div>

        <div className="two-col" style={{ alignItems: 'start' }}>
          {/* Seat grid */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Select Seats</div>
            <div className="seat-legend">
              <div className="seat-legend-item">
                <div className="seat-legend-dot" style={{ background: 'rgba(34,197,94,0.2)', border: '2px solid rgba(34,197,94,0.4)', borderRadius: 3 }} />
                Available
              </div>
              <div className="seat-legend-item">
                <div className="seat-legend-dot" style={{ background: 'var(--primary)', borderRadius: 3 }} />
                Selected
              </div>
              <div className="seat-legend-item">
                <div className="seat-legend-dot" style={{ background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.4)', borderRadius: 3 }} />
                Reserved
              </div>
              <div className="seat-legend-item">
                <div className="seat-legend-dot" style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.2)', borderRadius: 3 }} />
                Booked
              </div>
            </div>
            <div className="seat-grid">
              {seats.map((seat) => {
                const isSelected = selected.includes(seat._id);

                // Determine visual class with clear priority order
                let cls = 'seat ';
                if (seat.status === 'booked') {
                  // Permanently booked — red, no interaction
                  cls += 'seat-booked';
                } else if (seat.status === 'reserved' && !seat.isYours) {
                  // Reserved by someone else — yellow, no interaction
                  cls += 'seat-reserved';
                } else if (isSelected || (seat.status === 'reserved' && seat.isYours)) {
                  // Selected by current user OR reserved by current user — highlighted
                  cls += 'seat-selected';
                } else {
                  // Fully available — green
                  cls += 'seat-available';
                }

                const isClickable = step === 'select' && seat.status === 'available';

                return (
                  <div
                    key={seat._id}
                    className={cls}
                    title={seat.seatNumber}
                    style={{ cursor: isClickable ? 'pointer' : 'not-allowed' }}
                    onClick={() => isClickable && toggleSeat(seat)}
                  >
                    {seat.seatNumber}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary panel */}
          <div className="card">
            {step === 'confirm' && (
              <div style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.85rem' }}>⏳ Reservation expires in</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{countdown}</span>
              </div>
            )}

            <div style={{ fontWeight: 600, marginBottom: 14 }}>
              {step === 'select' ? 'Booking Summary' : 'Confirm Booking'}
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {selected.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No seats selected yet
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Selected seats
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedSeats.map((s) => (
                      <span key={s._id} className="badge badge-info">{s.seatNumber}</span>
                    ))}
                  </div>
                </div>

                <hr className="divider" />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{selected.length} × {fmt(event.pricePerSeat)}</span>
                  <span>{fmt(total)}</span>
                </div>

                {step === 'confirm' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>Wallet balance</span>
                    <span style={{ color: canAfford ? 'var(--success)' : 'var(--danger)' }}>
                      {fmt(user?.walletBalance ?? 0)}
                    </span>
                  </div>
                )}

                <hr className="divider" />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 16 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--primary)' }}>{fmt(total)}</span>
                </div>

                {step === 'select' && (
                  <button
                    className="btn btn-primary btn-full"
                    onClick={handleReserve}
                    disabled={actionLoading || selected.length === 0}
                  >
                    {actionLoading ? 'Reserving…' : 'Reserve Seats'}
                  </button>
                )}

                {step === 'confirm' && (
                  <>
                    {!canAfford && (
                      <div className="alert alert-error" style={{ marginBottom: 12 }}>
                        Insufficient balance.{' '}
                        <a href="/wallet">Top up wallet</a>
                      </div>
                    )}
                    <button
                      className="btn btn-primary btn-full"
                      onClick={handleConfirm}
                      disabled={actionLoading || !canAfford}
                    >
                      {actionLoading ? 'Processing…' : `Pay ${fmt(total)} & Confirm`}
                    </button>
                    <button
                      className="btn btn-outline btn-full"
                      style={{ marginTop: 8 }}
                      onClick={() => { setStep('select'); setSelected([]); fetchData(); }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;
