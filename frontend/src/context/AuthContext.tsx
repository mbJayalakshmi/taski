import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Refresh user + wallet balance (called on page reload if token exists)
  const refreshUser = async () => {
    try {
      const [meRes, walletRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/wallet'),
      ]);
      setUser({ ...meRes.data.user, walletBalance: walletRes.data.balance });
    } catch {
      // Token invalid or expired — clear it
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  // On app load, if a token exists in localStorage restore the session
  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string) => {
    // Step 1: authenticate and get token
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;

    // Step 2: store token so axios interceptor picks it up for next requests
    localStorage.setItem('token', t);
    setToken(t);

    // Step 3: fetch fresh wallet balance now that token is in localStorage
    try {
      const walletRes = await api.get('/wallet');
      setUser({ ...u, walletBalance: walletRes.data.balance });
    } catch {
      // If wallet fetch fails just use balance from auth response (likely 0)
      setUser({ ...u, walletBalance: u.walletBalance ?? 0 });
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('token', t);
    setToken(t);
    setUser({ ...u, walletBalance: 0 });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
