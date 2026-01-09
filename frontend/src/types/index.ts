export type ReleaseStatus = 'draft' | 'in_review' | 'approved' | 'released' | 'cancelled';
export type CriteriaStatus = 'pending' | 'approved' | 'rejected' | 'blocked';
export type SignOffStatus = 'approved' | 'rejected' | 'revoked';

// DEPRECATED: UserRole kept for backward compatibility but not exposed in UI
export type UserRole = 'admin' | 'product_owner' | 'stakeholder';

export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface UserCreatePayload {
  email: string;
  name: string;
  is_admin: boolean;
}

export interface UserUpdatePayload {
  name?: string;
  is_active?: boolean;
  is_admin?: boolean;
}

// Product Permission types
export interface ProductPermission {
  id: number;
  product_id: number;
  user_id: number;
  permission_type: string;
  granted_by_id: number | null;
  granted_at: string;
  user?: User;
}

export interface ProductPermissionCreatePayload {
  user_ids: number[];
  permission_type?: string;
}

export interface ProductOwnerInfo {
  id: number;
  user_id: number;
  permission_type: string;
  granted_at: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  default_template_id: number | null;
  created_at: string;
  updated_at: string;
  product_owners: ProductOwnerInfo[];
}

export interface TemplateCriteria {
  id: number;
  template_id: number;
  name: string;
  description: string | null;
  is_mandatory: boolean;
  default_owner_id: number | null;
  order: number;
  created_at: string;
}

export interface Template {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  criteria: TemplateCriteria[];
}

export interface SignOff {
  id: number;
  criteria_id: number;
  signed_by_id: number;
  status: SignOffStatus;
  comment: string | null;
  link: string | null;
  signed_at: string;
}

export interface ReleaseCriteria {
  id: number;
  release_id: number;
  name: string;
  description: string | null;
  is_mandatory: boolean;
  owner_id: number | null;
  status: CriteriaStatus;
  order: number;
  created_at: string;
  updated_at: string;
  sign_offs: SignOff[];
}

export interface Release {
  id: number;
  product_id: number;
  template_id: number | null;
  version: string;
  name: string;
  description: string | null;
  status: ReleaseStatus;
  target_date: string | null;
  candidate_build: string | null;
  released_at: string | null;
  created_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReleaseProgress {
  mandatory_total: number;
  mandatory_approved: number;
  mandatory_percent: number;
  optional_total: number;
  optional_approved: number;
  optional_percent: number;
  all_mandatory_approved: boolean;
}

export interface ReleaseDetail extends Release {
  criteria: ReleaseCriteria[];
  progress: ReleaseProgress;
  stakeholders: ReleaseStakeholder[];
}

export interface DashboardSummary {
  total: number;
  by_status: Record<ReleaseStatus, number>;
}

export interface PendingSignOff {
  criteria_id: number;
  criteria_name: string;
  release_id: number;
  release_name: string;
  release_version: string;
  is_mandatory: boolean;
}

// Stakeholder types
export interface StakeholderUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface ReleaseStakeholder {
  id: number;
  release_id: number;
  user_id: number;
  assigned_at: string;
  user: StakeholderUser;
}

export interface AssignStakeholdersPayload {
  user_ids: number[];
}

// Sign-off matrix types
export interface StakeholderSignOffStatus {
  user_id: number;
  user_name: string;
  user_email: string;
  status: 'approved' | 'rejected' | null;
  comment: string | null;
  link: string | null;
  signed_at: string | null;
}

export interface CriteriaSignOffRow {
  criteria_id: number;
  criteria_name: string;
  is_mandatory: boolean;
  computed_status: CriteriaStatus;
  stakeholder_signoffs: StakeholderSignOffStatus[];
}

export interface SignOffMatrix {
  release_id: number;
  stakeholders: StakeholderUser[];
  criteria_matrix: CriteriaSignOffRow[];
}
