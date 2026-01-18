import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { googleAuth, logout as apiLogout, getCurrentUser, AuthUser, CurrentUserResponse } from '@/api/auth';
import { getStoredToken, getStoredUser, removeStoredToken, removeStoredUser } from '@/api/client';

interface AuthContextType {
  user: AuthUser | null;
  currentUser: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isProductOwner: boolean;
  isStakeholder: boolean;
  canSignOff: boolean;
  canManageResources: boolean;
  currentUserId: number | null;
  impersonatingUserId: number | null;
  setImpersonatingUserId: (id: number | null) => void;
  login: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProductOwner, setIsProductOwner] = useState(false);
  const [impersonatingUserId, setImpersonatingUserIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem('impersonateUserId');
    return stored ? Number(stored) : null;
  });

  // Check if we have a stored token and validate it on mount
  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      // Validate token by fetching current user
      setIsLoading(true);
      getCurrentUser()
        .then((currentUser: CurrentUserResponse) => {
          setUser({
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.name,
            is_admin: currentUser.is_admin,
            avatar_url: currentUser.avatar_url,
          });
          setIsProductOwner(currentUser.is_product_owner);
        })
        .catch(() => {
          // Token invalid, clear storage
          removeStoredToken();
          removeStoredUser();
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  const login = useCallback(async (credential: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await googleAuth(credential);
      setUser(response.user);

      // Fetch full user info including product owner status
      const currentUser = await getCurrentUser();
      setIsProductOwner(currentUser.is_product_owner);

      // Invalidate all queries to refetch with new auth
      queryClient.invalidateQueries();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setIsProductOwner(false);
      setImpersonatingUserIdState(null);
      localStorage.removeItem('impersonateUserId');
      queryClient.clear();
      setIsLoading(false);
    }
  }, [queryClient]);

  const setImpersonatingUserId = useCallback((id: number | null) => {
    if (id) {
      localStorage.setItem('impersonateUserId', String(id));
    } else {
      localStorage.removeItem('impersonateUserId');
    }
    setImpersonatingUserIdState(id);
    // Invalidate all queries to refetch with new user context
    queryClient.invalidateQueries();
  }, [queryClient]);

  const isAuthenticated = !!user && !!getStoredToken();
  const canManage = user?.is_admin || isProductOwner;

  const value: AuthContextType = {
    user,
    currentUser: user,
    isLoading,
    isAuthenticated,
    isAdmin: user?.is_admin || false,
    isProductOwner,
    isStakeholder: false, // Deprecated: now handled per-release via ReleaseStakeholder
    canSignOff: true, // Anyone assigned as stakeholder can sign off
    canManageResources: canManage,
    currentUserId: impersonatingUserId || user?.id || null,
    impersonatingUserId,
    setImpersonatingUserId,
    login,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
