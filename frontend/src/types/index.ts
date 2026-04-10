export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  walletBalance: number;
}

export interface Event {
  _id: string;
  name: string;
  description?: string;
  venue: string;
  date: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number; // paise
  isActive: boolean;
}

export interface Seat {
  _id: string;
  seatNumber: string;
  status: 'available' | 'reserved' | 'booked';
  isYours?: boolean;
}

export interface Booking {
  _id: string;
  user: string | User;
  event: string | Event;
  seats: string[];
  seatNumbers: string[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  cancelledAt?: string;
}

export interface Transaction {
  _id: string;
  user: string | User;
  type: 'credit' | 'debit' | 'refund';
  amount: number;
  balanceAfter: number;
  description: string;
  reference?: string;
  createdAt: string;
}
