import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
} from '@/pages';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, Settings as SettingsIcon, User, Boxes, FileText } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useUsers } from '@/hooks';

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

function UserSelector() {
  const { user, currentUserId, setCurrentUserId } = useAuth();
  const { data: users } = useUsers(true);

  const getUserBadge = (isAdmin: boolean) => {
    return isAdmin ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
  };

  const getUserLabel = (isAdmin: boolean) => {
    return isAdmin ? 'Admin' : 'User';
  };

  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-muted-foreground" />
      <select
        value={currentUserId || ''}
        onChange={(e) => setCurrentUserId(Number(e.target.value))}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm min-w-[180px]"
      >
        <option value="">Select user...</option>
        {users?.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}{u.is_admin ? ' (Admin)' : ''}
          </option>
        ))}
      </select>
      {user && (
        <span className={cn('text-xs px-2 py-0.5 rounded-full', getUserBadge(user.is_admin))}>
          {getUserLabel(user.is_admin)}
        </span>
      )}
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
          <UserSelector />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
