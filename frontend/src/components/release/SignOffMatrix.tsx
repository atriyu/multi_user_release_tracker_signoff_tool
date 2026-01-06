import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSignOffMatrix } from '@/hooks/useStakeholders';
import { useAuth } from '@/context/AuthContext';
import { SignOffModal } from '@/components/criteria/SignOffModal';
import { useCreateSignOff, useRevokeSignOff } from '@/hooks';
import { Check, X, Clock, AlertCircle, Link2, MessageSquare } from 'lucide-react';
import type { StakeholderSignOffStatus, CriteriaSignOffRow, SignOffStatus, ReleaseStatus } from '@/types';

interface SignOffMatrixProps {
  releaseId: number;
  releaseStatus: ReleaseStatus;
}

export function SignOffMatrix({ releaseId, releaseStatus }: SignOffMatrixProps) {
  const { data: matrix, isLoading } = useSignOffMatrix(releaseId);
  const { currentUser } = useAuth();

  // Disable sign-offs for cancelled or released releases
  const canSignOff = releaseStatus !== 'cancelled' && releaseStatus !== 'released';
  const createSignOff = useCreateSignOff();
  const revokeSignOff = useRevokeSignOff();

  const [selectedCell, setSelectedCell] = useState<{
    criteria: CriteriaSignOffRow;
    signoff: StakeholderSignOffStatus | null;
  } | null>(null);
  const [signOffAction, setSignOffAction] = useState<'approve' | 'reject' | null>(null);

  // Determine column size based on number of stakeholders (optimized for up to 15)
  const stakeholderCount = matrix?.stakeholders.length || 0;
  const getColumnWidth = () => {
    if (stakeholderCount <= 3) return 'min-w-[140px]';
    if (stakeholderCount <= 5) return 'min-w-[120px]';
    if (stakeholderCount <= 7) return 'min-w-[100px]';
    if (stakeholderCount <= 10) return 'min-w-[85px]';
    if (stakeholderCount <= 12) return 'min-w-[75px]';
    return 'min-w-[70px]'; // 13-15 stakeholders
  };

  const getHeaderTextSize = () => {
    if (stakeholderCount <= 5) return 'text-sm';
    if (stakeholderCount <= 8) return 'text-xs';
    if (stakeholderCount <= 12) return 'text-[11px]';
    return 'text-[10px]'; // 13-15 stakeholders
  };

  const getCellPadding = () => {
    if (stakeholderCount <= 5) return 'p-2';
    if (stakeholderCount <= 10) return 'p-1.5';
    return 'p-1'; // 11-15 stakeholders
  };

  const getIconSize = () => {
    if (stakeholderCount <= 5) return 'h-4 w-4';
    if (stakeholderCount <= 8) return 'h-3.5 w-3.5';
    if (stakeholderCount <= 12) return 'h-3 w-3';
    return 'h-2.5 w-2.5'; // 13-15 stakeholders
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading sign-off matrix...
        </CardContent>
      </Card>
    );
  }

  if (!matrix || matrix.stakeholders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign-Off Matrix</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No stakeholders assigned. Assign stakeholders to enable the sign-off matrix.
        </CardContent>
      </Card>
    );
  }

  const handleCellClick = (criteria: CriteriaSignOffRow, signoff: StakeholderSignOffStatus) => {
    setSelectedCell({ criteria, signoff });
  };

  const handleSignOff = (status: SignOffStatus, comment?: string, link?: string) => {
    if (!selectedCell) return;

    createSignOff.mutate(
      { criteriaId: selectedCell.criteria.criteria_id, status, comment, link },
      {
        onSuccess: () => {
          setSelectedCell(null);
          setSignOffAction(null);
        },
      }
    );
  };

  const handleRevoke = (criteriaId: number) => {
    revokeSignOff.mutate(criteriaId, {
      onSuccess: () => {
        setSelectedCell(null);
      },
    });
  };

  const isCurrentUser = (userId: number) => currentUser?.id === userId;

  const getStatusColor = (status: 'approved' | 'rejected' | null) => {
    if (status === 'approved') return 'bg-green-100 border-green-300 text-green-800';
    if (status === 'rejected') return 'bg-red-100 border-red-300 text-red-800';
    return 'bg-yellow-50 border-yellow-200 text-yellow-800';
  };

  const getStatusIcon = (status: 'approved' | 'rejected' | null) => {
    if (status === 'approved') return <Check className="h-4 w-4" />;
    if (status === 'rejected') return <X className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getCriteriaStatusColor = (status: string) => {
    if (status === 'approved') return 'text-green-600';
    if (status === 'rejected') return 'text-red-600';
    if (status === 'blocked') return 'text-yellow-600';
    return 'text-gray-500';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Approval Workflow</CardTitle>
          {releaseStatus === 'cancelled' && (
            <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">
                This release has been cancelled. No further sign-offs are allowed.
              </span>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Each stakeholder can approve or reject criteria by clicking their cell. All mandatory criteria must be approved for the release to proceed.
            {stakeholderCount > 5 && ' Scroll horizontally to see all stakeholders.'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto" style={{ scrollBehavior: 'smooth' }}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-3 border-b font-semibold bg-muted/50 sticky left-0 z-10">
                    Criteria
                  </th>
                  <th className="text-center p-3 border-b font-semibold bg-muted/50 w-24">
                    Status
                  </th>
                  {matrix.stakeholders.map(stakeholder => {
                    // Get initials from name for very high stakeholder counts
                    const getInitials = (name: string) => {
                      return name
                        .split(' ')
                        .map(part => part[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 3);
                    };

                    return (
                      <th
                        key={stakeholder.id}
                        className={`text-center ${stakeholderCount > 10 ? 'p-1' : 'p-2'} border-b font-semibold bg-muted/50 ${getColumnWidth()}`}
                      >
                        <div className={`${getHeaderTextSize()} truncate`} title={stakeholder.name}>
                          {stakeholderCount > 12 ? getInitials(stakeholder.name) : stakeholder.name}
                        </div>
                        {stakeholderCount <= 10 && (
                          <div className={`text-[10px] text-muted-foreground font-normal truncate`} title={stakeholder.email}>
                            {stakeholderCount > 7 ? stakeholder.email.split('@')[0] : stakeholder.email}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {matrix.criteria_matrix.map((row, idx) => (
                  <tr key={row.criteria_id} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                    <td className="p-3 border-b sticky left-0 z-10 bg-inherit">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.criteria_name}</span>
                        {row.is_mandatory && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 border-b text-center">
                      <div className={`inline-flex items-center gap-1 text-sm font-medium ${getCriteriaStatusColor(row.computed_status)}`}>
                        {row.computed_status === 'approved' && <Check className="h-4 w-4" />}
                        {row.computed_status === 'rejected' && <X className="h-4 w-4" />}
                        {row.computed_status === 'blocked' && <AlertCircle className="h-4 w-4" />}
                        {row.computed_status === 'pending' && <Clock className="h-4 w-4" />}
                        <span className="capitalize">{row.computed_status}</span>
                      </div>
                    </td>
                    {matrix.stakeholders.map(stakeholder => {
                      const signoff = row.stakeholder_signoffs.find(s => s.user_id === stakeholder.id);
                      const isOwn = isCurrentUser(stakeholder.id);

                      // Create a signoff object for the cell, even if it doesn't exist yet
                      const cellSignoff: StakeholderSignOffStatus = signoff || {
                        user_id: stakeholder.id,
                        user_name: stakeholder.name,
                        user_email: stakeholder.email,
                        status: null,
                        comment: null,
                        link: null,
                        signed_at: null,
                      };

                      return (
                        <td key={stakeholder.id} className={getCellPadding() + ' border-b'}>
                          <div
                            onClick={() => isOwn && canSignOff && handleCellClick(row, cellSignoff)}
                            className={`w-full ${getCellPadding()} rounded border-2 flex flex-col gap-0.5 transition-all ${
                              getStatusColor(signoff?.status || null)
                            } ${isOwn && canSignOff ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-60'}`}
                            title={
                              !canSignOff
                                ? `Release is ${releaseStatus} - sign-offs are disabled`
                                : signoff?.status
                                ? `${signoff.status} by ${signoff.user_name}`
                                : isOwn
                                ? 'Click to sign off'
                                : 'Pending'
                            }
                          >
                            {/* Status row */}
                            <div className="flex items-center justify-center gap-1">
                              <div className={getIconSize()}>
                                {getStatusIcon(signoff?.status || null)}
                              </div>
                              {!signoff?.status && isOwn && stakeholderCount <= 5 && (
                                <span className="text-xs font-medium">Sign off</span>
                              )}
                            </div>

                            {/* Indicators row - only show if signed off */}
                            {signoff?.status && (
                              <div className={`flex items-center justify-center ${stakeholderCount > 10 ? 'gap-1' : 'gap-1.5'}`}>
                                {signoff.link && (
                                  <a
                                    href={signoff.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="hover:scale-110 transition-transform"
                                    title={`Open link: ${new URL(signoff.link).hostname}`}
                                  >
                                    <Link2 className={
                                      stakeholderCount > 12 ? 'h-2.5 w-2.5' :
                                      stakeholderCount > 8 ? 'h-3 w-3' :
                                      stakeholderCount > 5 ? 'h-3 w-3' : 'h-3.5 w-3.5'
                                    } />
                                  </a>
                                )}
                                {signoff.comment && (
                                  <div
                                    className="cursor-help"
                                    title={signoff.comment.length > 50 ? `${signoff.comment.substring(0, 50)}...` : signoff.comment}
                                  >
                                    <MessageSquare className={
                                      stakeholderCount > 12 ? 'h-2.5 w-2.5' :
                                      stakeholderCount > 8 ? 'h-3 w-3' :
                                      stakeholderCount > 5 ? 'h-3 w-3' : 'h-3.5 w-3.5'
                                    } />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Timestamp - only show if signed off and not too many stakeholders */}
                            {signoff?.signed_at && stakeholderCount <= 8 && (
                              <div className={`text-center opacity-70 ${stakeholderCount > 6 ? 'text-[9px]' : 'text-[10px]'}`}>
                                {stakeholderCount > 6 ?
                                  new Date(signoff.signed_at).toLocaleDateString('en-US', {
                                    month: 'numeric',
                                    day: 'numeric'
                                  }) :
                                  new Date(signoff.signed_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })
                                }
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {matrix.criteria_matrix.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No criteria defined for this release
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cell Details Dialog */}
      <Dialog open={!!selectedCell && !signOffAction} onOpenChange={() => setSelectedCell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCell?.criteria.criteria_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCell?.signoff && (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Stakeholder</p>
                  <p>{selectedCell.signoff.user_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCell.signoff.user_email}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    {selectedCell.signoff.status ? (
                      <>
                        {getStatusIcon(selectedCell.signoff.status)}
                        <Badge
                          variant={
                            selectedCell.signoff.status === 'approved'
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {selectedCell.signoff.status}
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                </div>

                {selectedCell.signoff.comment && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Comment</p>
                    <p className="text-sm bg-muted/50 p-3 rounded">{selectedCell.signoff.comment}</p>
                  </div>
                )}

                {selectedCell.signoff.link && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Test Results</p>
                    <a
                      href={selectedCell.signoff.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedCell.signoff.link}
                    </a>
                  </div>
                )}

                {selectedCell.signoff.signed_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Signed At</p>
                    <p className="text-sm">{new Date(selectedCell.signoff.signed_at).toLocaleString()}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            {selectedCell?.signoff && isCurrentUser(selectedCell.signoff.user_id) ? (
              <>
                {selectedCell.signoff.status ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedCell(null)}
                    >
                      Close
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleRevoke(selectedCell.criteria.criteria_id)}
                      disabled={revokeSignOff.isPending}
                    >
                      Revoke Sign-Off
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedCell(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setSignOffAction('approve')}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => setSignOffAction('reject')}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
              </>
            ) : (
              <Button variant="outline" onClick={() => setSelectedCell(null)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign-Off Modal */}
      <SignOffModal
        open={!!selectedCell && !!signOffAction}
        onClose={() => {
          setSignOffAction(null);
        }}
        criteria={
          selectedCell
            ? {
                id: selectedCell.criteria.criteria_id,
                name: selectedCell.criteria.criteria_name,
                description: null,
                is_mandatory: selectedCell.criteria.is_mandatory,
              }
            : null
        }
        action={signOffAction}
        onConfirm={handleSignOff}
        isLoading={createSignOff.isPending}
      />
    </>
  );
}
