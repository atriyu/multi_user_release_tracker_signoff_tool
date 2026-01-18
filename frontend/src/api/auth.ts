import api, { setStoredToken, setStoredUser, removeStoredToken, removeStoredUser } from './client';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  avatar_url?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface CurrentUserResponse {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  avatar_url?: string;
  is_product_owner: boolean;
}

export async function googleAuth(credential: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/google', { credential });

  // Store token and user info
  setStoredToken(response.data.access_token);
  setStoredUser(response.data.user);

  return response.data;
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const response = await api.get<CurrentUserResponse>('/auth/me');
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    // Always clear local storage, even if API call fails
    removeStoredToken();
    removeStoredUser();
    localStorage.removeItem('impersonateUserId');
  }
}
