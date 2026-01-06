import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';
import type { Release } from '@/types';
import { Calendar, Package } from 'lucide-react';

interface ReleaseCardProps {
  release: Release;
}

export function ReleaseCard({ release }: ReleaseCardProps) {
  return (
    <Link to={`/releases/${release.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{release.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Package className="h-3 w-3" />
                v{release.version}
              </CardDescription>
            </div>
            <StatusBadge status={release.status} type="release" />
          </div>
        </CardHeader>
        <CardContent>
          {release.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {release.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {release.target_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(release.target_date), 'MMM d, yyyy')}
              </span>
            )}
            <span>Created {format(new Date(release.created_at), 'MMM d, yyyy')}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
