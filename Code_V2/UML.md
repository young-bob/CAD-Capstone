``` mermaid
classDiagram
    %% ================= Infrastructure / Base Interfaces =================
    class IGrainWithGuidKey { <<interface>> }
    class IRemindable { 
        <<Interface>> 
        +ReceiveReminder(reminderName, status) Task 
        %% Handles scheduled tasks (e.g., 24h reminders, timeouts)
    }
    
    %% ================= 1. Core Business Grains (Actors) =================
    IGrainWithGuidKey <|-- IOpportunityGrain
    IGrainWithGuidKey <|-- IApplicationGrain
    IGrainWithGuidKey <|-- IAttendanceRecordGrain
    IGrainWithGuidKey <|-- IVolunteerGrain
    IGrainWithGuidKey <|-- IOrganizationGrain
    IGrainWithGuidKey <|-- IAdminGrain
    IGrainWithGuidKey <|-- INotificationGrain
    
    IRemindable <|-- IOpportunityGrain : "Event Reminders / Recurrence"
    IRemindable <|-- IAttendanceRecordGrain : "Auto-Checkout / Timeout"
    IRemindable <|-- IApplicationGrain : "Waitlist Acceptance Timeout"

    class IOpportunityGrain {
        <<Aggregate Root>>
        +Publish() Task
        +Cancel(reason) Task
        +SubmitApplication(volunteerId, shiftId, idempotencyKey) Task
        +WithdrawApplication(appId) Task
        +ValidateGeoLocation(lat, lon) Task~bool~
        +TryPromoteFromWaitlist(shiftId) Task
    }

    class IApplicationGrain {
        <<Process Manager>>
        +Approve() Task
        +Reject(reason) Task
        +Waitlist() Task
        +Promote() Task
        +Withdraw() Task
        +MarkAsNoShow() Task
        +AcceptInvitation() Task
    }

    class IAttendanceRecordGrain {
        <<Proof Entity>>
        +CheckIn(applicationId, lat, lon, proofPhotoUrl) Task
        +CheckOut(timeOut) Task
        +ManualAdjustment(coordinatorId, newTimes, reason) Task
        +RaiseDispute(reason, evidenceUrl) Task
        +ResolveDispute(resolverId, resolution, adjustedHours) Task
        +Confirm(supervisorId, rating) Task
    }

    class IVolunteerGrain {
        <<User Actor>>
        +GetProfile() Task~VolunteerState~
        +UpdateProfile(data) Task
        +UpdatePrivacySettings(settings) Task
        +UploadCredential(credData) Task
        +GetStats() Task~VolunteerStats~
        +GetApplications() Task~List~Guid~~
        +SubmitFeedback(opportunityId, rating, comment) Task
    }

    class IOrganizationGrain {
        <<Tenant Actor>>
        +CreateOpportunity(data, shifts) Task
        +InviteMember(email, role) Task
        +BlockVolunteer(volunteerId) Task
        +UnblockVolunteer(volunteerId) Task
        +GetDashboardStats() Task
        +GetOpportunities() Task~List~Guid~~
    }

    class IAdminGrain {
        <<System Actor>>
        +ApproveOrganization(orgId) Task
        +RejectOrganization(orgId, reason) Task
        +BanUser(userId) Task
        +UnbanUser(userId) Task
        +ResolveDispute(attendanceId, resolution, adjustedHours) Task
        +GetSystemStats() Task
    }

    class INotificationGrain {
        <<Infrastructure Actor>>
        +SendNotification(userId, type, payload) Task
        +SendBulkNotification(userIds, type, payload) Task
        +MarkAsRead(notificationId) Task
    }

    %% ================= 2. Persistent States =================
    
    class OpportunityState {
        <<[GenerateSerializer]>>
        +BasicInfo Info
        +List~Shift~ Shifts
        +RecurrenceRule Recurrence
        +GeoFenceSettings GeoFence
        +ApprovalPolicy Policy
        +List~Guid~ WaitlistQueue
        +HashSet~Guid~ ConfirmedVolunteerIds
        +List~string~ RequiredSkills
        +OpportunityStatus Status
        +Guid OrganizationId
    }

    class ApplicationState {
        <<[GenerateSerializer]>>
        +Guid VolunteerId
        +Guid OpportunityId
        +Guid ShiftId
        +ApplicationStatus Status
        +string IdempotencyKey
        +DateTime? ExpirationTime
        +Dictionary~string, string~ QuestionAnswers
    }

    class AttendanceRecordState {
        <<[GenerateSerializer]>>
        +Guid VolunteerId
        +Guid ApplicationId
        +Guid OpportunityId
        +TimeRecord VerifiedTime
        +Location CheckInSnapshot
        +AttendanceStatus Status
        +List~AuditLog~ Modifications
        +DisputeInfo DisputeLog
        +string ProofPhotoUrl
    }

    class VolunteerState {
        <<[GenerateSerializer]>>
        +UserProfile Profile
        +PrivacySettings Privacy
        +NotificationConfig NotifPrefs
        +ImpactScore Score
        +HashSet~Guid~ BlockedByOrgIds
        +List~Guid~ SkillIds
        +List~Guid~ ApplicationIds
    }

    class OrganizationState {
        <<[GenerateSerializer]>>
        +string Name
        +string Description
        +OrgStatus Status
        +List~OrgMember~ Members
        +HashSet~Guid~ BlockedVolunteerIds
        +List~Guid~ OpportunityIds
        +DateTime CreatedAt
    }

    class AdminState {
        <<[GenerateSerializer]>>
        +Guid UserId
        +AdminRole Role
        +List~AuditLog~ ActionLog
    }

    %% ================= 3. Enums (State Machines) =================

    class ApplicationStatus {
        <<Enumeration>>
        Pending
        Approved
        Rejected
        Waitlisted
        Promoted
        Withdrawn
        NoShow
        Completed
    }

    class AttendanceStatus {
        <<Enumeration>>
        Pending
        CheckedIn
        CheckedOut
        Disputed
        Resolved
        Confirmed
    }

    class OpportunityStatus {
        <<Enumeration>>
        Draft
        Published
        InProgress
        Completed
        Cancelled
    }

    class OrgStatus {
        <<Enumeration>>
        PendingApproval
        Approved
        Suspended
        Rejected
    }

    class ApprovalPolicy {
        <<Enumeration>>
        AutoApprove
        ManualApprove
        InviteOnly
    }

    %% ================= 4. Value Objects (Key Logic Holders) =================
    
    class Shift {
        <<Value Object>>
        +Guid ShiftId
        +string Name
        +DateTime StartTime
        +DateTime EndTime
        +int MaxCapacity
        +int CurrentCount
    }

    class RecurrenceRule {
        <<Value Object>>
        +Frequency Type 
        %% e.g., Daily, Weekly
        +int Interval
        +DateTime? EndDate
    }

    class GeoFenceSettings {
        <<Value Object>>
        +double Latitude
        +double Longitude
        +double RadiusMeters
    }

    class AuditLog {
        <<Value Object>>
        +DateTime Timestamp
        +Guid OperatorId
        +string Action
        +string Reason
    }

    class DisputeInfo {
        <<Value Object>>
        +Guid RaisedByVolunteerId
        +string Reason
        +string EvidenceUrl
        +DisputeStatus Status
        +string Resolution
        +double? AdjustedHours
        +DateTime RaisedAt
        +DateTime? ResolvedAt
    }

    class TimeRecord {
        <<Value Object>>
        +DateTime CheckInTime
        +DateTime? CheckOutTime
        +double TotalHours
    }

    class BasicInfo {
        <<Value Object>>
        +string Title
        +string Description
        +string Category
        +List~string~ Tags
    }

    class OrgMember {
        <<Value Object>>
        +Guid UserId
        +string Email
        +OrgRole Role
        +DateTime JoinedAt
    }

    %% ================= 5. CQRS Read Models =================
    class OpportunitySearchIndex {
        <<Elasticsearch Doc>>
        +Guid OpportunityId
        +string Title
        +GeoPoint Location
        +List~string~ Skills
        +DateRange TimeRange
        +int AvailableSpots
    }

    %% ================= 6. Relationships =================
    
    %% -- State ownership --
    IOpportunityGrain *-- OpportunityState : Holds
    IOpportunityGrain *-- Shift : Manages
    IApplicationGrain *-- ApplicationState : Holds
    IAttendanceRecordGrain *-- AttendanceRecordState : Holds
    IVolunteerGrain *-- VolunteerState : Holds
    IOrganizationGrain *-- OrganizationState : Holds
    IAdminGrain *-- AdminState : Holds

    %% -- Grain interactions --
    IOrganizationGrain ..> IOpportunityGrain : "Owns / Creates"
    IOpportunityGrain ..> IApplicationGrain : "Manages Lifecycle"
    IVolunteerGrain ..> IApplicationGrain : "Tracks Applications"
    IAttendanceRecordGrain ..> IOpportunityGrain : "Validates Location"
    IOrganizationGrain ..> IVolunteerGrain : "Manages Blocklist"
    IAdminGrain ..> IOrganizationGrain : "Approves / Suspends"
    IAttendanceRecordGrain ..> IVolunteerGrain : "Updates ImpactScore"

    %% -- Notification triggers --
    IOpportunityGrain ..> INotificationGrain : "Cancel / Reminder"
    IApplicationGrain ..> INotificationGrain : "Status Change"
    IAttendanceRecordGrain ..> INotificationGrain : "Dispute Updates"

    %% -- CQRS sync --
    IOpportunityGrain ..> OpportunitySearchIndex : "Syncs (Eventual Consistency)"

    %% -- Enum usage --
    ApplicationState --> ApplicationStatus : uses
    AttendanceRecordState --> AttendanceStatus : uses
    OpportunityState --> OpportunityStatus : uses
    OpportunityState --> ApprovalPolicy : uses
    OrganizationState --> OrgStatus : uses
    DisputeInfo --> DisputeStatus : uses
```

``` mermaid
stateDiagram-v2
    %% ================= Application Status State Machine =================
    [*] --> Pending : SubmitApplication

    Pending --> Approved : Approve (Auto/Manual)
    Pending --> Rejected : Reject
    Pending --> Waitlisted : Capacity Full
    Pending --> Withdrawn : Withdraw

    Waitlisted --> Promoted : TryPromoteFromWaitlist
    Waitlisted --> Withdrawn : Withdraw

    Promoted --> Approved : AcceptInvitation
    Promoted --> Waitlisted : Acceptance Timeout (IRemindable)

    Approved --> NoShow : MarkAsNoShow
    Approved --> Withdrawn : Withdraw
    Approved --> Completed : Attendance Confirmed

    Completed --> [*]
    Rejected --> [*]
    Withdrawn --> [*]
    NoShow --> [*]
```

``` mermaid
stateDiagram-v2
    %% ================= Attendance Status State Machine =================
    [*] --> Pending : Application Approved

    Pending --> CheckedIn : CheckIn (GeoFence Validated)

    CheckedIn --> CheckedOut : CheckOut / Auto-Checkout (IRemindable)

    CheckedOut --> Disputed : RaiseDispute
    CheckedOut --> Confirmed : Confirm (Supervisor)

    Disputed --> Resolved : ResolveDispute (Admin)
    Resolved --> Confirmed : Confirm (Supervisor)

    Confirmed --> [*]
```

``` mermaid
sequenceDiagram
    %% ================= Core Flow: Volunteer Applies to Opportunity =================
    participant V as Volunteer
    participant VG as IVolunteerGrain
    participant OG as IOpportunityGrain
    participant AG as IApplicationGrain
    participant NG as INotificationGrain

    V->>OG: SubmitApplication(volunteerId, shiftId, key)
    OG->>VG: Check BlockedByOrgIds
    VG-->>OG: Not Blocked ✓
    OG->>OG: Check Shift Capacity & Idempotency
    
    alt Capacity Available & AutoApprove
        OG->>AG: Create (Status = Pending)
        OG->>AG: Approve()
        AG->>NG: SendNotification("Application Approved")
        AG->>VG: Add ApplicationId
    else Capacity Available & ManualApprove
        OG->>AG: Create (Status = Pending)
        AG->>NG: SendNotification("Application Under Review")
        AG->>VG: Add ApplicationId
    else Capacity Full
        OG->>AG: Create (Status = Waitlisted)
        AG->>NG: SendNotification("Added to Waitlist")
        AG->>VG: Add ApplicationId
    end
```
