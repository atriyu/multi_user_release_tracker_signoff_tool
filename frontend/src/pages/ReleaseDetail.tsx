import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/release/StatusBadge';
import { ProgressIndicator } from '@/components/release/ProgressIndicator';
import { AuditTimeline } from '@/components/release/AuditTimeline';
import { StakeholderAssignment } from '@/components/release/StakeholderAssignment';
import { SignOffMatrix } from '@/components/release/SignOffMatrix';
import { ReleaseCriteriaManager } from '@/components/release/ReleaseCriteriaManager';
import { useRelease, useUpdateRelease, useDeleteRelease, useProducts } from '@/hooks';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Package, CheckCircle, Trash2, XCircle, Pencil, Check, X, Hash } from 'lucide-react';
import type { ReleaseStatus } from '@/types';

export function ReleaseDetail() {
  const { id } = useParams<{ id: string }>();
  const releaseId = Number(id);
  const navigate = useNavigate();
  const { isAdmin, currentUser } = useAuth();

  const { data: release, isLoading, error } = useRelease(releaseId);
  const { data: products } = useProducts();
  const updateRelease = useUpdateRelease();
  const deleteRelease = useDeleteRelease();

  const [isEditingTargetDate, setIsEditingTargetDate] = useState(false);
  const [targetDateValue, setTargetDateValue] = useState('');
  const [isEditingCandidateBuild, setIsEditingCandidateBuild] = useState(false);
  const [candidateBuildValue, setCandidateBuildValue] = useState('');

  const handleStatusChange = (newStatus: ReleaseStatus) => {
    updateRelease.mutate({ id: releaseId, data: { status: newStatus } });
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${release?.name}"? This action cannot be undone.`)) {
      deleteRelease.mutate(releaseId, {
        onSuccess: () => {
          navigate('/releases');
        },
      });
    }
  };

  const handleCancel = () => {
    if (confirm(`Are you sure you want to cancel "${release?.name}"? No further sign-offs will be allowed.`)) {
      handleStatusChange('cancelled');
    }
  };

  const handleEditTargetDate = () => {
    if (release?.target_date) {
      // Convert to YYYY-MM-DD format for input
      const date = new Date(release.target_date);
      const formattedDate = date.toISOString().split('T')[0];
      setTargetDateValue(formattedDate);
    } else {
      setTargetDateValue('');
    }
    setIsEditingTargetDate(true);
  };

  const handleSaveTargetDate = () => {
    if (targetDateValue) {
      updateRelease.mutate(
        { id: releaseId, data: { target_date: targetDateValue } },
        {
          onSuccess: () => {
            setIsEditingTargetDate(false);
          },
        }
      );
    }
  };

  const handleCancelTargetDate = () => {
    setIsEditingTargetDate(false);
    setTargetDateValue('');
  };

  const handleEditCandidateBuild = () => {
    setCandidateBuildValue(release?.candidate_build || '');
    setIsEditingCandidateBuild(true);
  };

  const handleSaveCandidateBuild = () => {
    updateRelease.mutate(
      { id: releaseId, data: { candidate_build: candidateBuildValue || '' } },
      {
        onSuccess: () => {
          setIsEditingCandidateBuild(false);
        },
      }
    );
  };

  const handleCancelCandidateBuild = () => {
    setIsEditingCandidateBuild(false);
    setCandidateBuildValue('');
  };

  if (isLoading) {
    return (
      <div className="text-center text-muted-foreground py-12">Loading release...</div>
    );
  }

  if (error || !release) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Release not found</p>
        <Link to="/releases">
          <Button variant="outline">Back to Releases</Button>
        </Link>
      </div>
    );
  }

  // Check if user can edit this release (admin or product owner for this product)
  const canEdit = isAdmin || (currentUser && products?.some(
    product => product.id === release.product_id &&
    product.product_owners?.some(po => po.user_id === currentUser.id)
  ));

  const canApprove = release.progress.all_mandatory_approved && release.status === 'in_review';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/releases"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Releases
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{release.name}</h1>
            <StatusBadge status={release.status} type="release" />
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              v{release.version}
            </span>
            {/* Target Date - Editable for Draft and In Review */}
            {isEditingTargetDate ? (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <Input
                  type="date"
                  value={targetDateValue}
                  onChange={(e) => setTargetDateValue(e.target.value)}
                  className="h-7 w-40 text-sm"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleSaveTargetDate}
                  disabled={!targetDateValue || updateRelease.isPending}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleCancelTargetDate}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Target: {release.target_date ? format(new Date(release.target_date), 'MMM d, yyyy') : 'Not set'}
                {canEdit && (release.status === 'draft' || release.status === 'in_review') && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 ml-1"
                    onClick={handleEditTargetDate}
                    title="Edit target date"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </span>
            )}
            {/* Candidate Build - Editable for Draft and In Review */}
            {isEditingCandidateBuild ? (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                <Input
                  value={candidateBuildValue}
                  onChange={(e) => setCandidateBuildValue(e.target.value)}
                  placeholder="Enter build identifier"
                  className="h-7 w-56 text-sm"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleSaveCandidateBuild}
                  disabled={updateRelease.isPending}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleCancelCandidateBuild}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <span className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                Build: {release.candidate_build || 'Not set'}
                {canEdit && (release.status === 'draft' || release.status === 'in_review') && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 ml-1"
                    onClick={handleEditCandidateBuild}
                    title="Edit candidate build"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Delete button - only for draft releases */}
          {release.status === 'draft' && canEdit && (
            <>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteRelease.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button onClick={() => handleStatusChange('in_review')}>
                Start Review
              </Button>
            </>
          )}

          {/* Cancel button - for in_review or approved releases */}
          {(release.status === 'in_review' || release.status === 'approved') && canEdit && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateRelease.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Release
            </Button>
          )}

          {/* Approve button - only for in_review with all mandatory approvals */}
          {release.status === 'in_review' && canApprove && (
            <Button onClick={() => handleStatusChange('approved')}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Release
            </Button>
          )}

          {/* Mark as Released button - only for approved releases */}
          {release.status === 'approved' && (
            <Button onClick={() => handleStatusChange('released')}>
              Mark as Released
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {release.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{release.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Sign-off Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressIndicator progress={release.progress} />
          {!release.progress.all_mandatory_approved && release.status === 'in_review' && (
            <p className="text-sm text-muted-foreground mt-4">
              All mandatory criteria must be approved before the release can be approved.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Criteria Management */}
      <ReleaseCriteriaManager
        releaseId={release.id}
        releaseStatus={release.status}
        criteria={release.criteria || []}
        canEdit={canEdit || false}
      />

      {/* Stakeholder Assignment */}
      <StakeholderAssignment
        releaseId={release.id}
        stakeholders={release.stakeholders || []}
        canEdit={canEdit || false}
      />

      {/* Sign-Off Matrix */}
      {release.stakeholders && release.stakeholders.length > 0 && (
        <SignOffMatrix releaseId={release.id} releaseStatus={release.status} />
      )}

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTimeline releaseId={release.id} />
        </CardContent>
      </Card>
    </div>
  );
}
