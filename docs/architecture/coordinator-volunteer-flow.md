# Coordinator + Volunteer Flow

## Context
JWT authentication was already working before this implementation. This document describes the complete coordinator and volunteer flow added to the VolunteerHub system — covering backend grains, API controllers, and React frontend pages.

---

## UX / Styles

- **Design system**: `card-elevated` class, DM Sans font, project CSS vars, shadcn/ui (Badge, Button, Input, Select, Skeleton)
- **Icons**: lucide-react
- **Animations**: framer-motion with `initial={{ opacity: 0, y: 10 }}` pattern
- **Layout**: `page-header` + `page-title` + card grid (same as existing pages)
- **Empty states**: Centered message + icon
- **Loading states**: Skeleton placeholders (shadcn/ui)

---

## Navigation Structure

### Coordinator Sidebar
| Icon | Label | Route |
|---|---|---|
| Briefcase | My Opportunities | `/coordinator/opportunities` |
| Users | Enrollments | `/coordinator/enrollments` |
| ClipboardCheck | Attendance | `/attendance` |
| BarChart3 | Analytics | `/analytics` |

### Volunteer Sidebar
| Icon | Label | Route |
|---|---|---|
| LayoutDashboard | Dashboard | `/` |
| Search | Opportunities | `/opportunities` |
| FileText | My Applications | `/volunteer/applications` |
| ClipboardList | My Enrollments | `/volunteer/enrollments` |
| Award | Certificates | `/certificates` |

> **Key design decision:** "My Enrollments" for volunteers is a **separate nav item with its own page**, not a tab inside "My Applications".

---

## Backend Changes

### New Grain: `OpportunityRegistryGrain`
- Singleton grain with string key `"global"`
- Tracks all opportunity IDs globally
- Used by `GET /api/opportunity` to list all opportunities
- Files: `IOpportunityRegistryGrain.cs`, `OpportunityRegistryGrain.cs`, `States/OpportunityRegistryState.cs`

### Updated Grains

**`IOpportunityGrain` / `OpportunityGrain`:**
- `ProcessApplication(Guid, ApplicationStatus, string? rejectionReason)` — supports rejection reason
- `GetApplications()` — returns all applications for an opportunity
- `GetEnrollments()` — returns only Approved applications
- `DeleteOpportunity()` — clears state
- Auto-waitlist: when `RegisteredCount >= MaxVolunteers`, new applications get `Waitlisted` status instead of throwing an exception

**`ICoordinatorGrain` / `CoordinatorGrain`:**
- Added `GetOrganizationId()` → returns the organization the coordinator is linked to

**`IVolunteerGrain` / `VolunteerGrain`:**
- `ApplyForOpportunity(Guid)` now returns `Application` (previously `void`)
- Added `GetApplications()` → returns all of the volunteer's applications

**`IOrganizationGrain`:**
- Changed from `IGrainWithStringKey` → `IGrainWithGuidKey` for consistency with all other grains

**`OrganizationProfile`:**
- Optional fields changed to nullable: `string? LogoUrl`, `string? Website`, `Location? Location`, `string? VerificationProof`, `string? CalendarSyncUrl`

### New / Updated API Endpoints

**OpportunityController:**
```
GET    /api/opportunity                              → List all opportunities (via registry grain)
POST   /api/opportunity                              → Create opportunity + register in registry
PUT    /api/opportunity/{id}                         → Edit opportunity
DELETE /api/opportunity/{id}                         → Delete opportunity + unregister
GET    /api/opportunity/{id}/applications            → List all applications for an opportunity
POST   /api/opportunity/{id}/applications/{appId}/process → Approve/Reject/Waitlist an application
GET    /api/opportunity/{id}/enrollments             → List approved (enrolled) volunteers
```

**CoordinatorController:**
```
GET    /api/coordinator/{id}    → Returns { organizationId }
```

**VolunteerController:**
```
POST   /api/volunteer/{id}/apply/{opportunityId}    → Volunteer applies for an opportunity
GET    /api/volunteer/{id}/applications             → List all of volunteer's applications
```

**OrganizationController:**
- All endpoints changed from `string id` to `Guid id` (matching `IGrainWithGuidKey`)

### Program.cs
- Added `JsonStringEnumConverter` so enums are accepted as strings (`"Public"`, `"Internal"`) instead of integers

---

## Frontend Changes

### New Pages

| Page | Route | Description |
|---|---|---|
| `CoordinatorOpportunities.tsx` | `/coordinator/opportunities` | Lists org's opportunities with Edit/Delete/ViewApplications actions |
| `CreateOpportunity.tsx` | `/coordinator/opportunities/new` | Form to create a new opportunity |
| `EditOpportunity.tsx` | `/coordinator/opportunities/:id/edit` | Pre-loads and edits an opportunity |
| `ApplicationsReview.tsx` | `/coordinator/opportunities/:id/applications` | Review and process volunteer applications |
| `CoordinatorEnrollments.tsx` | `/coordinator/enrollments` | Lists enrolled volunteers per opportunity |
| `VolunteerApplications.tsx` | `/volunteer/applications` | Volunteer's applications with status filters |
| `VolunteerEnrollments.tsx` | `/volunteer/enrollments` | Volunteer's approved enrollments with opportunity details |

### Updated Files

- **`AppSidebar.tsx`** — role-based navigation (coordinator vs volunteer)
- **`App.tsx`** — all new routes added; coordinator default redirect to `/coordinator/opportunities`
- **`opportunityService.ts`** — full rewrite using `fetchApi()`; added `create`, `update`, `delete`, `getApplications`, `processApplication`, `getEnrollments`
- **`volunteerService.ts`** — rewrite using `fetchApi()`; added `apply()`, `getApplications()`
- **`OpportunityCard.tsx`** — added `onApply`, `isApplied`, `isFull`, `applying` props; Apply button shows "Applied" / "Full" badge

### ApplicationStatus Display
- `Pending` in the backend is displayed as **"Applied"** in the UI
- Status badges: Applied (blue), Approved (green), Rejected (red), Waitlisted (yellow)

---

## Bugs Fixed

| Error | Root Cause | Fix |
|---|---|---|
| 400 on `POST /api/opportunity` (visibility field) | Enum sent as string but ASP.NET expected integer | Added `JsonStringEnumConverter` in `Program.cs` |
| 400 on `POST /api/organization` (required fields) | Non-nullable `string` fields treated as required by `[ApiController]` | Changed optional fields to `string?` / `Location?` |
| 500 on `POST /api/opportunity` | `OpportunityGrain` used `"OrleansStorage"` storage provider — not registered | Changed to `"grain-store"` in both `OpportunityGrain` and `OpportunityRegistryGrain` |
| 400 on `POST /api/opportunity` (OrganizationId) | `IOrganizationGrain` used string key; frontend sent a Guid | Changed to `IGrainWithGuidKey` throughout |
| "Coordinator not linked to an organization" | Admin must link coordinator to org before creating opportunities | Use Swagger: `POST /api/coordinator/{id}/organization` with `{ "organizationId": "<guid>" }` |

---

## Setup (Manual via Swagger)

Before using the coordinator flow, an admin must:

1. **Create an organization:**
   ```
   POST /api/organization/{orgGuid}
   Body: { "organizationId": "...", "name": "Food Bank", "description": "...", "isVerified": false }
   ```

2. **Link coordinator to organization:**
   ```
   POST /api/coordinator/{coordinatorUserId}/organization
   Body: { "organizationId": "..." }
   ```

---

## End-to-End Verification

1. `docker-compose up --build` and `npm run dev`
2. Register a coordinator and a volunteer
3. Coordinator creates an opportunity (maxVolunteers=2) → appears in My Opportunities as "0/2"
4. Volunteer sees the opportunity → clicks Apply → badge "Applied" in My Applications
5. Volunteer tries to apply again → button disabled
6. Coordinator opens Applications → approves the application → capacity updates to "1/2"
7. Volunteer sees status "Approved" in My Applications + opportunity in My Enrollments
8. Coordinator sees volunteer by full name in Enrollments
9. Second volunteer applies and is approved → capacity "2/2", badge "Full"
10. Third volunteer applies → auto-waitlisted, badge "Waitlisted"
11. Coordinator rejects with a reason → volunteer sees status "Rejected"
12. Coordinator edits / deletes the opportunity → list updates accordingly
