import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/release/StatusBadge';
import { SignOffModal } from './SignOffModal';
import { useCreateSignOff, useRevokeSignOff } from '@/hooks';
import type { ReleaseCriteria, SignOffStatus } from '@/types';
import { Check, X, RotateCcw, AlertCircle, ExternalLink } from 'lucide-react';

interface CriteriaChecklistProps {
  criteria: ReleaseCriteria[];
}

export function CriteriaChecklist({ criteria }: CriteriaChecklistProps) {
  const [selectedCriteria, setSelectedCriteria] = useState<ReleaseCriteria | null>(null);
  const [signOffAction, setSignOffAction] = useState<'approve' | 'reject' | null>(null);

  const createSignOff = useCreateSignOff();
  const revokeSignOff = useRevokeSignOff();

  const handleSignOff = (status: SignOffStatus, comment?: string, link?: string) => {
    if (!selectedCriteria) return;

    createSignOff.mutate(
      { criteriaId: selectedCriteria.id, status, comment, link },
      {
        onSuccess: () => {
          setSelectedCriteria(null);
          setSignOffAction(null);
        },
      }
    );
  };

  const handleRevoke = (criteriaId: number) => {
    revokeSignOff.mutate(criteriaId);
  };

  const sortedCriteria = [...criteria].sort((a, b) => {
    if (a.is_mandatory !== b.is_mandatory) return a.is_mandatory ? -1 : 1;
    return a.order - b.order;
  });

  return (
    <>
      <div className="space-y-3">
        {sortedCriteria.map((c) => {
          const latestSignOff = c.sign_offs && c.sign_offs.length > 0
            ? c.sign_offs[c.sign_offs.length - 1]
            : null;

          return (
            <div
              key={c.id}
              className="border rounded-lg"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    c.status === 'approved' ? 'bg-green-100 text-green-600' :
                    c.status === 'rejected' ? 'bg-red-100 text-red-600' :
                    c.status === 'blocked' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {c.status === 'approved' && <Check className="h-4 w-4" />}
                    {c.status === 'rejected' && <X className="h-4 w-4" />}
                    {c.status === 'blocked' && <AlertCircle className="h-4 w-4" />}
                    {c.status === 'pending' && <div className="w-2 h-2 rounded-full bg-gray-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {c.is_mandatory ? (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{c.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={c.status} type="criteria" />
                  {c.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCriteria(c);
                          setSignOffAction('approve');
                        }}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCriteria(c);
                          setSignOffAction('reject');
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {(c.status === 'approved' || c.status === 'rejected') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(c.id)}
                      disabled={revokeSignOff.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  )}
                </div>
              </div>

              {latestSignOff && (c.status === 'approved' || c.status === 'rejected') && (
                <div className="px-4 pb-4 pt-0">
                  <div className="bg-muted/50 rounded-md p-3 space-y-2">
                    {latestSignOff.comment && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Comment:</p>
                        <p className="text-sm">{latestSignOff.comment}</p>
                      </div>
                    )}
                    {latestSignOff.link && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Test Results:</p>
                        <a
                          href={latestSignOff.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View test results
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Signed off: {new Date(latestSignOff.signed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SignOffModal
        open={!!selectedCriteria && !!signOffAction}
        onClose={() => {
          setSelectedCriteria(null);
          setSignOffAction(null);
        }}
        criteria={selectedCriteria}
        action={signOffAction}
        onConfirm={handleSignOff}
        isLoading={createSignOff.isPending}
      />
    </>
  );
}
