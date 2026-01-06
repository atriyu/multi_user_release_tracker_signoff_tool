import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ReleaseCriteria, SignOffStatus } from '@/types';

interface SignOffModalProps {
  open: boolean;
  onClose: () => void;
  criteria: ReleaseCriteria | { id: number; name: string; description: string | null; is_mandatory: boolean } | null;
  action: 'approve' | 'reject' | null;
  onConfirm: (status: SignOffStatus, comment?: string, link?: string) => void;
  isLoading: boolean;
}

// Criteria that require a test results link
const CRITERIA_REQUIRING_LINK = [
  'Smoke & Extended Smoke Regression',
  'Full Regression',
  'CPT Sign-off',
];

// Criteria that require a Jira link
const CRITERIA_REQUIRING_JIRA_LINK = [
  'Bug Verification',
];

// Combine all criteria requiring links
const ALL_CRITERIA_REQUIRING_LINK = [
  ...CRITERIA_REQUIRING_LINK,
  ...CRITERIA_REQUIRING_JIRA_LINK,
];

export function SignOffModal({
  open,
  onClose,
  criteria,
  action,
  onConfirm,
  isLoading,
}: SignOffModalProps) {
  const [comment, setComment] = useState('');
  const [link, setLink] = useState('');

  const requiresLink = criteria && ALL_CRITERIA_REQUIRING_LINK.includes(criteria.name) && action === 'approve';
  const requiresJiraLink = criteria && CRITERIA_REQUIRING_JIRA_LINK.includes(criteria.name) && action === 'approve';

  const handleSubmit = () => {
    const status: SignOffStatus = action === 'approve' ? 'approved' : 'rejected';
    onConfirm(status, comment || undefined, link || undefined);
    setComment('');
    setLink('');
  };

  const handleClose = () => {
    setComment('');
    setLink('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? 'Approve' : 'Reject'} Criteria
          </DialogTitle>
          <DialogDescription>
            {criteria?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {requiresLink && (
            <div>
              <label className="text-sm font-medium">
                {requiresJiraLink ? 'Jira Link' : 'Test Results Link'} <span className="text-destructive">*</span>
              </label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={
                  requiresJiraLink
                    ? 'https://jira.example.com/browse/BUG-1234'
                    : 'https://testresults.example.com/...'
                }
                className="mt-2"
                type="url"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {requiresJiraLink
                  ? 'Provide a link to the Jira ticket(s) with verified bugs'
                  : 'Provide a link to regression test results or TestRail'}
              </p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">
              Comment {action === 'reject' && <span className="text-destructive">*</span>}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                action === 'approve'
                  ? 'Add an optional comment...'
                  : 'Please provide a reason for rejection...'
              }
              className="mt-2"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              (action === 'reject' && !comment.trim()) ||
              (!!requiresLink && !link.trim())
            }
            variant={action === 'approve' ? 'default' : 'destructive'}
          >
            {isLoading ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
