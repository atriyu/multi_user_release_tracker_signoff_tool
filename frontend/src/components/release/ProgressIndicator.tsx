import { Progress } from '@/components/ui/progress';
import type { ReleaseProgress } from '@/types';

interface ProgressIndicatorProps {
  progress: ReleaseProgress;
}

export function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">Mandatory</span>
          <span className="text-muted-foreground">
            {progress.mandatory_approved}/{progress.mandatory_total}
          </span>
        </div>
        <Progress value={progress.mandatory_percent} className="h-2" />
      </div>
      {progress.optional_total > 0 && (
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Optional</span>
            <span className="text-muted-foreground">
              {progress.optional_approved}/{progress.optional_total}
            </span>
          </div>
          <Progress value={progress.optional_percent} className="h-2" />
        </div>
      )}
    </div>
  );
}
