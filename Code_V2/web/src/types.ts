export type ViewName =
    | 'landing' | 'login' | 'register'
    | 'dashboard' | 'opportunities' | 'applications' | 'attendance' | 'certificates' | 'profile' | 'skills'
    | 'manage_events' | 'org_applications' | 'manage_templates' | 'org_members'
    | 'admin_orgs' | 'admin_disputes' | 'admin_users' | 'admin_skills';


// ─── Enums (mirrors backend VSMS.Abstractions.Models.Enums) ──
export type UserRole = 'Volunteer' | 'Coordinator' | 'SystemAdmin';

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

// ─── Auth ─────────────────────────────────────────────────────
export interface AuthResponse {
    token: string;
    email: string;
    role: UserRole;
    userId: string;
    linkedGrainId: string | null;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    role?: UserRole;
}

// ─── Opportunity ──────────────────────────────────────────────
export interface Shift {
    shiftId: string;
    name: string;
    startTime: string;
    endTime: string;
    maxCapacity: number;
    currentCount: number;
}

export interface BasicInfo {
    title: string;
    description: string;
    category: string;
    tags: string[];
}

export interface GeoFenceSettings {
    latitude: number;
    longitude: number;
    radiusMeters: number;
}

export interface OpportunityState {
    info: BasicInfo;
    shifts: Shift[];
    geoFence: GeoFenceSettings | null;
    policy: ApprovalPolicy;
    waitlistQueue: string[];
    confirmedVolunteerIds: string[];
    requiredSkillIds: string[];
    status: OpportunityStatus;
    organizationId: string;
    createdAt: string;
}

export interface OpportunitySummary {
    opportunityId: string;
    organizationId: string;
    organizationName: string;
    title: string;
    category: string;
    status: OpportunityStatus;
    publishDate: string;
    totalSpots: number;
    availableSpots: number;
    latitude: number | null;
    longitude: number | null;
}

export interface OpportunityRecommendation extends OpportunitySummary {
    matchedSkillCount: number;
    requiredSkillCount: number;
    skillMatchRatio: number;
    distanceKm: number | null;
    recommendationScore: number;
}

export interface OpportunityRecommendationResult {
    volunteerSkillCount: number;
    opportunities: OpportunityRecommendation[];
}

// ─── Application ──────────────────────────────────────────────
export interface ApplicationState {
    volunteerId: string;
    opportunityId: string;
    shiftId: string;
    status: ApplicationStatus;
    idempotencyKey: string;
    expirationTime: string | null;
    questionAnswers: Record<string, string>;
    createdAt: string;
}

export interface ApplicationSummary {
    applicationId: string;
    opportunityId: string;
    shiftId: string;
    opportunityTitle: string;
    shiftName: string;
    shiftStartTime: string;
    shiftEndTime: string;
    volunteerId: string;
    volunteerName: string;
    status: ApplicationStatus;
    appliedAt: string;
    attendanceStatus?: string; // Populated by coordinator view: Pending | CheckedIn | CheckedOut | Confirmed | etc.
}

// ─── Attendance ───────────────────────────────────────────────
export interface TimeRecord {
    checkInTime: string;
    checkOutTime: string | null;
    totalHours: number;
}

export interface AttendanceRecordState {
    volunteerId: string;
    applicationId: string;
    opportunityId: string;
    verifiedTime: TimeRecord | null;
    status: AttendanceStatus;
    proofPhotoUrl: string;
    supervisorRating: number;
}

export interface AttendanceSummary {
    attendanceId: string;
    opportunityId: string;
    volunteerId: string;
    volunteerName: string;
    opportunityTitle: string;
    status: AttendanceStatus;
    shiftStartTime: string | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    totalHours: number;
}

// ─── Organization ─────────────────────────────────────────────
export interface OrgState {
    name: string;
    description: string;
    status: string;
    members: { userId: string; email: string; role: OrgRole; joinedAt: string }[];
    opportunityIds: string[];
    blockedVolunteerIds: string[];
    isInitialized: boolean;
    createdAt: string;
    proofUrl?: string;
}

// ─── Volunteer ────────────────────────────────────────────────
export interface VolunteerProfile {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    bio: string;
    isProfilePublic: boolean;
    impactScore: number;
    totalHours: number;
    completedOpportunities: number;
    credentials: string[];
    isInitialized: boolean;
}

// ─── Skill ────────────────────────────────────────────────────
export interface Skill {
    id: string;
    name: string;
    category: string;
    description?: string;
}

// ─── Certificate ──────────────────────────────────────────────
export interface CertificateTemplate {
    id: string;
    name: string;
    description: string;
    organizationId: string | null;
    organizationName: string | null;
    primaryColor: string;
    accentColor: string;
    isSystemPreset: boolean;
}

export interface GenerateCertificateResult {
    fileKey: string;
    downloadUrl: string;
    fileName: string;
}

// ─── Admin ────────────────────────────────────────────────────
export interface OrganizationSummary {
    orgId: string;
    name: string;
    description: string;
    status: string;
    createdAt: string;
    proofUrl?: string;
}

export interface UserRecord {
    id: string;
    email: string;
    role: string;
    isBanned: boolean;
    linkedGrainId: string;
    createdAt: string;
    organizationId?: string;
    organizationName?: string;
}

export interface DisputeSummary {
    attendanceId: string;
    volunteerId: string;
    volunteerName: string;
    opportunityTitle: string;
    reason: string;
    evidenceUrl: string;
    raisedAt: string;
}
