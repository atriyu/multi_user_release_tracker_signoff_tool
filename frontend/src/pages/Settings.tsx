import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Package, FileText, Users, History, Settings as SettingsIcon } from 'lucide-react';

interface SettingsCardProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function SettingsCard({ to, icon: Icon, title, description }: SettingsCardProps) {
  return (
    <Link to={to}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage users, view audit logs, and configure system settings
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SettingsCard
          to="/settings/users"
          icon={Users}
          title="Users"
          description="Manage users and their permissions"
        />
        <SettingsCard
          to="/settings/audit"
          icon={History}
          title="Audit Log"
          description="View all system activity and changes"
        />
        <SettingsCard
          to="/settings/general"
          icon={SettingsIcon}
          title="General"
          description="System-wide configuration options"
        />
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">Products</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">Criteria Templates</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">Users</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <History className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">Audit Entries</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
