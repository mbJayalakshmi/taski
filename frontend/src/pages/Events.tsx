import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Event } from '../types';

const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/events')
      .then((res) => setEvents(res.data.events))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner">Loading events…</div>;

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Upcoming Events</h1>
        {events.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎟</div>
            No events available right now
          </div>
        ) : (
          <div className="events-grid">
            {events.map((ev) => (
              <div
                key={ev._id}
                className="event-card"
                onClick={() => navigate(`/events/${ev._id}/seats`)}
              >
                <div className="event-card-name">{ev.name}</div>
                {ev.description && (
                  <div className="event-card-meta" style={{ marginBottom: 8 }}>
                    {ev.description}
                  </div>
                )}
                <div className="event-card-meta">📍 {ev.venue}</div>
                <div className="event-card-meta">
                  📅 {new Date(ev.date).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <div className="event-card-price">{fmt(ev.pricePerSeat)} / seat</div>
                  <span
                    className={`badge ${ev.availableSeats > 0 ? 'badge-success' : 'badge-danger'}`}
                  >
                    {ev.availableSeats > 0 ? `${ev.availableSeats} left` : 'Sold out'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
