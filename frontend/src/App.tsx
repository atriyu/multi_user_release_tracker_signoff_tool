import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {
  Dashboard,
  ReleaseList,
  ReleaseDetail,
  CreateRelease,
  Settings,
  ProductManager,
  TemplateList,
  TemplateEditor,
  CreateTemplate,
  UserManager,
  AuditLog,
  Login,
} from '@/pages';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, Settings as SettingsIcon, Boxes, FileText, LogOut, UserCircle } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useUsers } from '@/hooks';

// Get Google Client ID from environment variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function NavLink({ to, children, icon: Icon }: { to: string; children: React.ReactNode; icon: React.ComponentType<{ className?: string }> }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function UserMenu() {
  const { user, isAdmin, logout, impersonatingUserId, setImpersonatingUserId } = useAuth();
  const { data: users } = useUsers(true);

  const handleLogout = async () => {
    await logout();
  };

  const handleStopImpersonating = () => {
    setImpersonatingUserId(null);
  };

  const handleImpersonate = (userId: number) => {
    if (userId === user?.id) {
      setImpersonatingUserId(null);
    } else {
      setImpersonatingUserId(userId);
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Admin impersonation dropdown */}
      {isAdmin && (
        <div className="flex items-center gap-2">
          <select
            value={impersonatingUserId || user.id}
            onChange={(e) => handleImpersonate(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm min-w-[180px]"
          >
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}{u.id === user.id ? ' (You)' : ''}{u.is_admin ? ' - Admin' : ''}
              </option>
            ))}
          </select>
          {impersonatingUserId && impersonatingUserId !== user.id && (
            <button
              onClick={handleStopImpersonating}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              Stop
            </button>
          )}
        </div>
      )}

      {/* User info and logout */}
      <div className="flex items-center gap-2">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <UserCircle className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium leading-none">{user.name}</span>
          <span className="text-xs text-muted-foreground">
            {isAdmin ? 'Admin' : 'User'}
            {impersonatingUserId && impersonatingUserId !== user.id && (
              <span className="text-amber-600 ml-1">(Impersonating)</span>
            )}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="ml-2 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg mr-8">
              <Package className="h-6 w-6" />
              Release Tracker
            </Link>
            <nav className="flex items-center gap-2">
              <NavLink to="/" icon={LayoutDashboard}>Dashboard</NavLink>
              <NavLink to="/releases" icon={Package}>Releases</NavLink>
              <NavLink to="/products" icon={Boxes}>Products</NavLink>
              <NavLink to="/templates" icon={FileText}>Criteria Templates</NavLink>
              <NavLink to="/settings" icon={SettingsIcon}>Settings</NavLink>
            </nav>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public route */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/releases" element={<ReleaseList />} />
                <Route path="/releases/new" element={<CreateRelease />} />
                <Route path="/releases/:id" element={<ReleaseDetail />} />
                <Route path="/products" element={<ProductManager />} />
                <Route path="/templates" element={<TemplateList />} />
                <Route path="/templates/new" element={<CreateTemplate />} />
                <Route path="/templates/:templateId" element={<TemplateEditor />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/users" element={<UserManager />} />
                <Route path="/settings/audit" element={<AuditLog />} />
                <Route path="/settings/general" element={<div className="text-muted-foreground">General settings coming soon...</div>} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  // Show warning if Google Client ID is not configured
  if (!GOOGLE_CLIENT_ID) {
    console.warn('VITE_GOOGLE_CLIENT_ID environment variable is not set. Google OAuth will not work.');
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
