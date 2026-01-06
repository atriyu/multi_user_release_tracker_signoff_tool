import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types';
import { useCurrentUser, useProductOwnerStatus } from '@/hooks';

interface AuthContextType {
  user: User | null;
  currentUser: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isProductOwner: boolean;
  isStakeholder: boolean;
  canSignOff: boolean;
  canManageResources: boolean;
  currentUserId: number | null;
  setCurrentUserId: (id: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem('currentUserId');
    return stored ? Number(stored) : null;
  });

  const { data: user, isLoading } = useCurrentUser();
  const { data: productOwnerStatus } = useProductOwnerStatus(user?.id || 0);

  const setCurrentUserId = useCallback((id: number) => {
    localStorage.setItem('currentUserId', String(id));
    setUserId(id);
    // Invalidate all queries to refetch with new user
    queryClient.invalidateQueries();
  }, [queryClient]);

  const isProductOwner = productOwnerStatus?.is_product_owner || false;
  const canManage = user?.is_admin || isProductOwner;

  const value: AuthContextType = {
    user: user || null,
    currentUser: user || null,
    isLoading,
    isAdmin: user?.is_admin || false,
    isProductOwner,
    isStakeholder: false, // Deprecated: now handled per-release via ReleaseStakeholder
    canSignOff: true, // Anyone assigned as stakeholder can sign off
    canManageResources: canManage,
    currentUserId: userId,
    setCurrentUserId,
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
