// Matches backend VSMS.Abstractions.Models.Enums

export enum ApplicationStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Waitlisted = 'Waitlisted',
  Promoted = 'Promoted',
  Withdrawn = 'Withdrawn',
  NoShow = 'NoShow',
  Completed = 'Completed',
}

export enum AttendanceStatus {
  Pending = 'Pending',
  CheckedIn = 'CheckedIn',
  CheckedOut = 'CheckedOut',
  Disputed = 'Disputed',
  Resolved = 'Resolved',
  Confirmed = 'Confirmed',
}

export enum OpportunityStatus {
  Draft = 'Draft',
  Published = 'Published',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export enum OrgStatus {
  PendingApproval = 'PendingApproval',
  Approved = 'Approved',
  Suspended = 'Suspended',
  Rejected = 'Rejected',
}

export enum ApprovalPolicy {
  AutoApprove = 'AutoApprove',
  ManualApprove = 'ManualApprove',
  InviteOnly = 'InviteOnly',
}

export enum OrgRole {
  Admin = 'Admin',
  Coordinator = 'Coordinator',
  Member = 'Member',
}

export type UserRole = 'Volunteer' | 'Coordinator' | 'SystemAdmin';
