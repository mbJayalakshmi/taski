import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { User } from '../../types';

const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users')
      .then((res) => setUsers(res.data.users))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="page-title">Users ({users.length})</h1>
      <div className="card">
        {loading ? (
          <div className="spinner">Loading…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Wallet Balance</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {fmt((u as any).walletBalance ?? 0)}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date((u as any).createdAt).toLocaleDateString('en-IN')}
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

export default AdminUsers;
