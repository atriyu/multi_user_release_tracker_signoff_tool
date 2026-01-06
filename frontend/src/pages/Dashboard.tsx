import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardSummary, useMyPendingSignOffs, useReleases } from '@/hooks';
import { ReleaseCard } from '@/components/release/ReleaseCard';
import { Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: pending, isLoading: pendingLoading } = useMyPendingSignOffs();
  const { data: recentReleases, isLoading: releasesLoading } = useReleases();

  const statusCards = [
    { key: 'draft', label: 'Draft', icon: Package, color: 'text-gray-500' },
    { key: 'in_review', label: 'In Review', icon: Clock, color: 'text-yellow-500' },
    { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-green-500' },
    { key: 'released', label: 'Released', icon: CheckCircle, color: 'text-blue-500' },
    { key: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-500' },
  ] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statusCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">
                    {summaryLoading ? '-' : summary?.by_status[key] ?? 0}
                  </p>
                </div>
                <Icon className={`h-8 w-8 ${color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending Sign-offs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              My Pending Sign-offs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : pending && pending.length > 0 ? (
              <ul className="space-y-2">
                {pending.slice(0, 5).map((item) => (
                  <li key={item.criteria_id}>
                    <Link
                      to={`/releases/${item.release_id}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted"
                    >
                      <span className="text-sm">{item.criteria_name}</span>
                      {item.is_mandatory && (
                        <span className="text-xs text-destructive">Required</span>
                      )}
                    </Link>
                  </li>
                ))}
                {pending.length > 5 && (
                  <li className="text-sm text-muted-foreground text-center pt-2">
                    +{pending.length - 5} more
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No pending sign-offs</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Releases */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Releases</CardTitle>
          </CardHeader>
          <CardContent>
            {releasesLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : recentReleases && recentReleases.length > 0 ? (
              <div className="space-y-3">
                {recentReleases.slice(0, 3).map((release) => (
                  <ReleaseCard key={release.id} release={release} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No releases yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
