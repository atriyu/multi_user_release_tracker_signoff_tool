import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include current user ID
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem('currentUserId');
  if (userId) {
    config.headers['X-User-Id'] = userId;
  }
  return config;
});

export default api;
