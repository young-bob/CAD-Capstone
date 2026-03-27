export type ViewName =
    | 'landing' | 'login' | 'register'
    | 'dashboard' | 'opportunities' | 'applications' | 'attendance' | 'certificates' | 'profile' | 'skills' | 'orgs' | 'messages'
    | 'manage_events' | 'org_applications' | 'manage_templates' | 'org_members' | 'coord_reports' | 'coord_volunteers' | 'org_profile' | 'coord_messages'
    | 'admin_orgs' | 'admin_disputes' | 'admin_users' | 'admin_skills' | 'admin_system_info';


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
    requiredSkillIds: string[] | null;
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
    organizationName: string;
    organizationId?: string;
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
    backgroundCheckStatus: string;
    waiverSignedAt: string | null;
    followedOrgIds: string[];
    allowEmailNotifications: boolean;
    allowPushNotifications: boolean;
}

export interface OrgVolunteerSummary {
    grainId: string;
    name: string;
    email: string;
    relationship: 'Engaged' | 'Following' | 'Both';
    orgHours: number;
    orgEventsAttended: number;
    backgroundCheckStatus: string;
    hasWaiver: boolean;
    skillCount: number;
}

export interface OrgRecommendation {
    orgId: string;
    name: string;
    description: string;
    matchingOpportunities: number;
}

// ─── Skill ────────────────────────────────────────────────────
export interface Skill {
    id: string;
    name: string;
    category: string;
    description?: string;
}

// ─── Event Template ───────────────────────────────────────────
export interface EventTemplate {
    id: string;
    name: string;
    title: string;
    description: string;
    category: string;
    tagsJson: string;
    approvalPolicy: string;
    requiredSkillIdsJson: string;
    latitude: number | null;
    longitude: number | null;
    radiusMeters: number | null;
    createdAt: string;
}

// ─── Certificate ──────────────────────────────────────────────
export interface CertificateTemplate {
    id: string;
    name: string;
    description: string;
    organizationId: string | null;
    organizationName: string | null;
    templateType: 'achievement_certificate' | 'hours_log';
    primaryColor: string;
    accentColor: string;
    isSystemPreset: boolean;
    /** 'award' | 'tracking' — stored in titleText on backend */
    titleText?: string;
    signatoryName?: string;
    signatoryTitle?: string;
}

export interface GenerateCertificateResult {
    fileKey: string;
    downloadUrl: string;
    fileName: string;
    certificateId: string;
    verifyUrl: string;
}

export interface IssueCertificateResult {
    certificateId: string;
    verifyUrl: string;
}

export interface CertificateVerificationRecord {
    certificateId: string;
    isValid: boolean;
    isRevoked: boolean;
    revokedAt: string | null;
    volunteerName: string;
    organizationName: string;
    templateName: string;
    templateType: 'achievement_certificate' | 'hours_log';
    totalHours: number;
    completedOpportunities: number;
    issuedAt: string;
    signatoryName: string | null;
    signatoryTitle: string | null;
    fileName: string | null;
}

// ─── Admin ────────────────────────────────────────────────────
export interface OrganizationSummary {
    orgId: string;
    name: string;
    description: string;
    status: string;
    createdAt: string;
    proofUrl?: string;
    websiteUrl?: string;
    contactEmail?: string;
    tags?: string[];
    latestAnnouncementText?: string;
    latestAnnouncementAt?: string;
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

export interface GrainTypeActivation {
    grainType: string;
    activations: number;
}

export interface SiloGrainDistribution {
    silo: string;
    totalActivations: number;
    grainTypes: GrainTypeActivation[];
}

export interface GrainDistributionSummary {
    generatedAtUtc: string;
    totalSilos: number;
    totalActivations: number;
    silos: SiloGrainDistribution[];
}

export interface SiloLoadSkew {
    mostBusySilo: string | null;
    leastBusySilo: string | null;
    maxActivations: number;
    minActivations: number;
    avgActivations: number;
    stdDevActivations: number;
    skewRatio: number | null;
}

export interface SiloRuntimeMetrics {
    cpuUsage: number;
    availableMemoryBytes: number;
    memoryUsageBytes: number;
    totalPhysicalMemoryBytes: number;
    memoryUsageRatio: number | null;
    isOverloaded: boolean;
    clientCount: number;
    receivedMessages: number;
    sentMessages: number;
    runtimeCollectedAtUtc: string | null;
    activationCount: number;
    recentlyUsedActivationCount: number;
}

export interface RuntimeOverview {
    sampledSilos: number;
    overloadedSilos: number;
    avgCpuUsage: number | null;
    avgMemoryUsageRatio: number | null;
    totalClients: number;
    totalReceivedMessages: number;
    totalSentMessages: number;
}

export interface SiloSystemInfo {
    silo: string;
    status: string;
    isAlive: boolean;
    hostName: string | null;
    siloName: string | null;
    version: string | null;
    startTimeUtc: string | null;
    lastHeartbeatUtc: string | null;
    uptimeMinutes: number | null;
    totalActivations: number;
    systemActivations: number;
    businessActivations: number;
    systemRatio: number;
    businessRatio: number;
    runtime: SiloRuntimeMetrics | null;
    grainTypes: GrainTypeActivation[];
}

export interface SystemInfoSummary {
    generatedAtUtc: string;
    totalSilos: number;
    totalActivations: number;
    overallSystemActivations: number;
    overallBusinessActivations: number;
    overallSystemRatio: number;
    overallBusinessRatio: number;
    skew: SiloLoadSkew;
    runtimeOverview: RuntimeOverview;
    silos: SiloSystemInfo[];
}

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    senderName: string | null;
    sentAt: string;
    isRead: boolean;
}
