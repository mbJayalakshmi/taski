import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const AdminLayout: React.FC = () => (
  <div className="admin-layout">
    <aside className="admin-sidebar">
      <NavLink to="/admin/events" className={({ isActive }) => `admin-sidebar-link${isActive ? ' active' : ''}`}>
        🎟 Events
      </NavLink>
      <NavLink to="/admin/seats" className={({ isActive }) => `admin-sidebar-link${isActive ? ' active' : ''}`}>
        💺 Seat Overview
      </NavLink>
      <NavLink to="/admin/bookings" className={({ isActive }) => `admin-sidebar-link${isActive ? ' active' : ''}`}>
        📋 Bookings
      </NavLink>
      <NavLink to="/admin/transactions" className={({ isActive }) => `admin-sidebar-link${isActive ? ' active' : ''}`}>
        💳 Transactions
      </NavLink>
      <NavLink to="/admin/users" className={({ isActive }) => `admin-sidebar-link${isActive ? ' active' : ''}`}>
        👤 Users
      </NavLink>
    </aside>
    <main className="admin-content">
      <Outlet />
    </main>
  </div>
);

export default AdminLayout;
