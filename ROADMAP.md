# VSMS Roadmap

This document tracks features and improvements planned beyond the current MVP. Items are organized by tier — Tier 1 is production-ready, Tier 2 is in scope for the next cycle, Tier 3 is longer-term.

---

## Tier 1 — Shipped (Current Release)

These features are complete and deployed.

| Feature | Module | Notes |
|---------|--------|-------|
| JWT authentication (register / login / refresh) | Backend | Role-based: Volunteer, Coordinator, Admin |
| Organization management | Backend / Web | Create, verify, link coordinators |
| Opportunity & shift management | Backend / Web | Create, edit, delete, publish |
| Volunteer application flow | Backend / Web / Mobile | Apply, approve, reject, waitlist, auto-promote |
| GPS geofenced check-in / check-out | Backend / Mobile | Configurable radius per location |
| Coordinator manual attendance adjustment | Backend / Web | With audit trail and reason |
| Dispute resolution | Backend / Web | Volunteer raises dispute, coordinator resolves |
| Volunteer hour certificate generation | Backend | PDF via QuestPDF, downloadable |
| Volunteer progress dashboard | Web / Mobile | Hours to date, goal tracking |
| Background check upload + status tracking | Backend / Web | Cleared / Pending / Failed |
| Waiver signing | Backend / Web / Mobile | Per-organization digital waiver |
| In-app notifications | Backend / Web | Email (Resend) + in-app notification list |
| Skill tracking | Backend | Associate skills with opportunities and volunteers |
| AI assistant (streaming) | Backend / Web | Chat endpoint backed by Amazon Bedrock |
| Analytics dashboard | Web | Volunteer hours, attendance trends, org stats |
| Export to CSV | Web | Download applications, members, and volunteer hour reports for grant compliance |
| QR code check-in fallback | Backend / Web / Mobile | Coordinator issues a one-time QR token per shift; volunteer uses it when GPS is unavailable |
| Map view for opportunity discovery | Mobile | Leaflet map with user location pin + opportunity pins on volunteer home screen; geofence circle overlay on check-in screen; coordinator sets geofence radius via MapView |
| Push notifications | Mobile | Expo push token registration; application status changes, shift reminders, waitlist promotions |
| Waitlist auto-promotion notifications | Backend | ApplicationGrain sends in-app + email notification when a volunteer is promoted from waitlist |
| Shift template library + one-click posting | Backend / Web | Coordinators save reusable event templates; "Use" button pre-fills the create opportunity form in one click |
| Volunteer rating | Backend | Coordinator rates a volunteer at attendance confirmation; stored as supervisor rating on the attendance record |
| LinkedIn OAuth login | Backend / Web | Sign in with LinkedIn via OAuth 2.0; profile synced on first login |
| Seed data tooling | Tools | `seed-debug-data.mjs` for realistic test data |
| Multi-node cluster deployment | Infrastructure | Podman Compose + Nginx + HAProxy |
| CI/CD via GitHub + SSH scripts | Infrastructure | Automated deployment on push to main |

---

## Tier 2 — Next Cycle

High-value features targeted for the next development cycle.

### Volunteer Experience
- **Smart opportunity recommendations** — ML-based suggestions based on volunteer skill profile and past activity
- **Social proof** — show how many friends from the same organization have enrolled in a shift
- **Hour goal wizard** — onboarding flow that helps volunteers set a graduation/certification goal and calculates the shifts needed

### Coordinator Tools
- **Volunteer rating display** — surface aggregate ratings on the coordinator dashboard (rating data is stored, but not yet visualized)
- **Social media sharing** — share an opportunity directly to Facebook, Instagram, X (Twitter), and LinkedIn with a pre-filled post containing the title, date, location, and a deep link back to the VSMS opportunity page

### Mobile App
- **iOS version** — build and publish the mobile app on the Apple App Store; current development and testing is Android-only
- **Offline mode** — queue check-in events locally when no internet, sync on reconnect

### Platform
- **LinkedIn credential export** — publish verified volunteer hours as a LinkedIn certificate (OAuth login exists; certificate publishing not yet implemented)
- **Multi-language support (i18n)** — French (Canadian) as first additional language
- **Webhook support** — let organizations subscribe to events (application approved, check-in, etc.)

---

## Tier 3 — Long-Term Vision

Larger investments for future development.

### AI-Powered Forecasting
- Predictive demand heatmap for coordinators — "Predicted Need vs. Current Registered" per shift slot
- AI-generated shift scheduling suggestions based on historical attendance patterns
- Natural-language shift creation — "Create three Saturday morning shifts next month for 10 volunteers each"

### Ecosystem Expansion
- **School/university portal** — schools log in to verify and download student hour reports directly
- **Government grant reporting integration** — export data in the format required by Ontario government volunteer programs
- **Multi-organization volunteer passports** — a single verified profile that works across all VSMS organizations
- **White-label deployment** — configurable branding so organizations can run their own instance

### Technical Improvements
- **Orleans cluster across multiple cloud regions** — active-active multi-region for high availability
- **Event sourcing full replay** — ability to rebuild any read model from scratch from grain events
- **GraphQL API** — alongside the existing REST API, for richer client queries
- **End-to-end test suite** — Playwright for web, Detox for mobile

---

## How to Propose a Feature

Open a GitHub issue with the label `enhancement` and include:

1. **Problem**: what user pain does this solve?
2. **Proposed solution**: a brief description of the feature
3. **Scope**: estimated effort (small / medium / large)
4. **Alternatives considered**

The team reviews proposals monthly and slots approved items into an upcoming tier.
