import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Event } from '../../types';

const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

const EMPTY_FORM = {
  name: '', description: '', venue: '',
  date: '', totalSeats: '', pricePerSeat: '',
};

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [seatModal, setSeatModal] = useState<Event | null>(null);
  const [seatRows, setSeatRows] = useState('');
  const [seatPerRow, setSeatPerRow] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetch = async () => {
    setLoading(true);
    const res = await api.get('/admin/events');
    setEvents(res.data.events);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditEvent(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setShowModal(true);
  };

  const openEdit = (ev: Event) => {
    setEditEvent(ev);
    setForm({
      name: ev.name,
      description: ev.description || '',
      venue: ev.venue,
      date: new Date(ev.date).toISOString().slice(0, 16),
      totalSeats: ev.totalSeats.toString(),
      pricePerSeat: (ev.pricePerSeat / 100).toString(),
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        venue: form.venue,
        date: form.date,
        totalSeats: parseInt(form.totalSeats),
        pricePerSeat: Math.round(parseFloat(form.pricePerSeat) * 100),
      };
      if (editEvent) {
        await api.put(`/admin/events/${editEvent._id}`, payload);
      } else {
        await api.post('/admin/events', payload);
      }
      setShowModal(false);
      await fetch();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ev: Event) => {
    if (!window.confirm(`Deactivate "${ev.name}"?`)) return;
    await api.delete(`/admin/events/${ev._id}`);
    await fetch();
  };

  const handleBulkSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seatModal) return;
    setSaving(true);
    try {
      const rows = seatRows.split(',').map((r) => r.trim()).filter(Boolean);
      await api.post(`/admin/events/${seatModal._id}/seats/bulk`, {
        rows,
        seatsPerRow: parseInt(seatPerRow),
      });
      setSeatModal(null);
      setSeatRows('');
      setSeatPerRow('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create seats');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Events</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Event</button>
      </div>

      {loading ? (
        <div className="spinner">Loading…</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Venue</th>
                  <th>Date</th>
                  <th>Seats</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev._id}>
                    <td style={{ fontWeight: 600 }}>{ev.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{ev.venue}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(ev.date).toLocaleDateString('en-IN')}
                    </td>
                    <td>{ev.availableSeats}/{ev.totalSeats}</td>
                    <td>{fmt(ev.pricePerSeat)}</td>
                    <td>
                      {ev.isActive
                        ? <span className="badge badge-success">Active</span>
                        : <span className="badge badge-danger">Inactive</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(ev)}>Edit</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setSeatModal(ev)}>Seats</button>
                        {ev.isActive && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ev)}>Deactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editEvent ? 'Edit Event' : 'Create Event'}</div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Event Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Venue</label>
                <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Date & Time</label>
                <input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="two-col">
                <div className="form-group">
                  <label>Total Seats</label>
                  <input type="number" min="1" value={form.totalSeats} onChange={(e) => setForm({ ...form, totalSeats: e.target.value })} required disabled={!!editEvent} />
                </div>
                <div className="form-group">
                  <label>Price per Seat (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.pricePerSeat} onChange={(e) => setForm({ ...form, pricePerSeat: e.target.value })} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk seat creation modal */}
      {seatModal && (
        <div className="modal-overlay" onClick={() => setSeatModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Bulk Create Seats — {seatModal.name}</div>
            <form onSubmit={handleBulkSeats}>
              <div className="form-group">
                <label>Row labels (comma-separated)</label>
                <input
                  value={seatRows}
                  onChange={(e) => setSeatRows(e.target.value)}
                  placeholder="A, B, C, D"
                  required
                />
              </div>
              <div className="form-group">
                <label>Seats per row</label>
                <input
                  type="number" min="1"
                  value={seatPerRow}
                  onChange={(e) => setSeatPerRow(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                This will create seats A1–A{seatPerRow || '?'}, B1–B{seatPerRow || '?'}, etc.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setSeatModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Seats'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;
