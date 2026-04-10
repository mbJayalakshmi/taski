import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const fmt = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <NavLink to="/" className="navbar-brand">taski</NavLink>
        <div className="navbar-links">
          {user.role === 'admin' ? (
            <>
              <NavLink to="/admin/events">Events</NavLink>
              <NavLink to="/admin/bookings">Bookings</NavLink>
              <NavLink to="/admin/transactions">Transactions</NavLink>
              <NavLink to="/admin/users">Users</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/events">Events</NavLink>
              <NavLink to="/bookings">My Bookings</NavLink>
              <NavLink to="/wallet">
                <span className="wallet-badge">{fmt(user.walletBalance ?? 0)}</span>
              </NavLink>
            </>
          )}
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
