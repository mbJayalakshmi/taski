import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Event } from '../../types';

interface SeatDetail {
  _id: string;
  seatNumber: string;
  status: 'available' | 'reserved' | 'booked';
  reservedBy?: { name: string; email: string } | null;
  bookedBy?: { name: string; email: string } | null;
  reservationExpiry?: string;
}

const AdminSeats: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [seats, setSeats] = useState<SeatDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/admin/events').then((res) => {
      setEvents(res.data.events);
      if (res.data.events.length > 0) {
        setSelectedEvent(res.data.events[0]._id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    setLoading(true);
    api.get(`/admin/events/${selectedEvent}/seats`)
      .then((res) => setSeats(res.data.seats))
      .finally(() => setLoading(false));
  }, [selectedEvent]);

  const counts = {
    available: seats.filter((s) => s.status === 'available').length,
    reserved: seats.filter((s) => s.status === 'reserved').length,
    booked: seats.filter((s) => s.status === 'booked').length,
  };

  const statusColor = (status: string) => {
    if (status === 'available') return 'var(--success)';
    if (status === 'reserved') return 'var(--warning)';
    return 'var(--danger)';
  };

  const statusBg = (status: string) => {
    if (status === 'available') return 'rgba(34,197,94,.12)';
    if (status === 'reserved') return 'rgba(245,158,11,.12)';
    return 'rgba(239,68,68,.10)';
  };

  const selectedEvObj = events.find((e) => e._id === selectedEvent);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Seat Overview</h1>
        <div className="form-group" style={{ margin: 0, minWidth: 260 }}>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
          >
            {events.map((ev) => (
              <option key={ev._id} value={ev._id}>{ev.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid3" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-l">Available</div>
          <div className="stat-v" style={{ color: 'var(--success)' }}>{counts.available}</div>
        </div>
        <div className="stat">
          <div className="stat-l">Reserved</div>
          <div className="stat-v" style={{ color: 'var(--warning)' }}>{counts.reserved}</div>
        </div>
        <div className="stat">
          <div className="stat-l">Booked</div>
          <div className="stat-v" style={{ color: 'var(--danger)' }}>{counts.booked}</div>
        </div>
      </div>

      {/* Visual seat map */}
      {selectedEvObj && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
            Seat Map — {selectedEvObj.name}
          </div>
          <div className="legend" style={{ marginBottom: 14 }}>
            <div className="leg-i">
              <div className="leg-d" style={{ background: 'rgba(34,197,94,.2)', border: '2px solid rgba(34,197,94,.4)', borderRadius: 3 }} />
              Available
            </div>
            <div className="leg-i">
              <div className="leg-d" style={{ background: 'rgba(245,158,11,.15)', border: '2px solid rgba(245,158,11,.4)', borderRadius: 3 }} />
              Reserved
            </div>
            <div className="leg-i">
              <div className="leg-d" style={{ background: 'rgba(239,68,68,.1)', border: '2px solid rgba(239,68,68,.3)', borderRadius: 3 }} />
              Booked
            </div>
          </div>
          {loading ? (
            <div className="spinner">Loading…</div>
          ) : (
            <div className="seat-grid">
              {seats.map((seat) => (
                <div
                  key={seat._id}
                  className={`seat ${seat.status === 'available' ? 's-av' : seat.status === 'reserved' ? 's-res' : 's-bk'}`}
                  title={
                    seat.status === 'reserved' && seat.reservedBy
                      ? `Reserved by ${seat.reservedBy.name}`
                      : seat.status === 'booked' && seat.bookedBy
                      ? `Booked by ${seat.bookedBy.name}`
                      : seat.seatNumber
                  }
                  style={{ cursor: 'default' }}
                >
                  {seat.seatNumber}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detailed table */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Seat Details</div>
        {loading ? (
          <div className="spinner">Loading…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Seat</th>
                  <th>Status</th>
                  <th>User</th>
                  <th>Expires At</th>
                </tr>
              </thead>
              <tbody>
                {seats.map((seat) => (
                  <tr key={seat._id}>
                    <td style={{ fontWeight: 600 }}>{seat.seatNumber}</td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: statusBg(seat.status),
                        color: statusColor(seat.status),
                      }}>
                        {seat.status.charAt(0).toUpperCase() + seat.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {seat.status === 'reserved' && seat.reservedBy
                        ? `${seat.reservedBy.name} (${seat.reservedBy.email})`
                        : seat.status === 'booked' && seat.bookedBy
                        ? `${seat.bookedBy.name} (${seat.bookedBy.email})`
                        : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {seat.status === 'reserved' && seat.reservationExpiry
                        ? new Date(seat.reservationExpiry).toLocaleTimeString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSeats;
