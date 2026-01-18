import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Token management functions
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): { id: number; email: string; name: string; is_admin: boolean; avatar_url?: string } | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
}

export function setStoredUser(user: { id: number; email: string; name: string; is_admin: boolean; avatar_url?: string }): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Also store userId for backward compatibility
  localStorage.setItem('currentUserId', String(user.id));
}

export function removeStoredUser(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('currentUserId');
}

// Add request interceptor to include JWT token and optionally X-User-Id for admin impersonation
api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // For admin impersonation: include X-User-Id if different from authenticated user
  const impersonateUserId = localStorage.getItem('impersonateUserId');
  if (impersonateUserId) {
    config.headers['X-User-Id'] = impersonateUserId;
  } else {
    // Fallback for backward compatibility during development
    const userId = localStorage.getItem('currentUserId');
    if (userId && !token) {
      config.headers['X-User-Id'] = userId;
    }
  }

  return config;
});

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state on unauthorized response
      removeStoredToken();
      removeStoredUser();
      localStorage.removeItem('impersonateUserId');

      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
