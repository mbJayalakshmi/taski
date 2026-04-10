iimport axios from 'axios';

console.log("API URL:", import.meta.env.VITE_API_URL); // 👈 ADD HERE

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export default api;
// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
