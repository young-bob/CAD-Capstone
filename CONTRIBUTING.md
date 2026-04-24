# Contributing to VSMS

Welcome! This guide explains how to set up the project locally, follow our development conventions, and extend the system with new features.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Branch Strategy](#branch-strategy)
- [Commit Conventions](#commit-conventions)
- [How to Add a New Feature](#how-to-add-a-new-feature)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Extension Points](#extension-points)
- [Reporting Issues](#reporting-issues)

---

## Prerequisites

Make sure you have the following installed before contributing:

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | >= 18 | Web & mobile frontend |
| [.NET SDK](https://dotnet.microsoft.com/download) | 10.0 | Backend API |
| [Podman](https://podman.io/) or [Docker](https://www.docker.com/) | Latest | Run full stack locally |
| [Android Studio](https://developer.android.com/studio) | Latest | Mobile emulator |
| [Git](https://git-scm.com/) | Latest | Version control |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/czhang1818/CAD-Capstone.git
cd CAD-Capstone/Code_V2
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your local values (DB password, JWT secret, MinIO credentials)
```

### 3. Start the backend (all services)

```bash
podman compose -f podman-compose.yml up -d
# or
docker compose -f podman-compose.yml up -d
```

The API will be available at `http://localhost:8080`.

### 4. Run the web app

```bash
cd web
npm install
npm run dev
```

Web app available at `http://localhost:5173`.

### 5. Run the mobile app

```bash
cd mobile
npm install
# Edit mobile/constants/config.ts → set API_URL = 'http://10.0.2.2:8080/api'
npx expo start
# Press 'a' to launch on Android emulator
```

### 6. Seed test data (optional)

```bash
node tools/seed-debug-data.mjs --base-url http://localhost:8080
```

Default admin credentials: `admin@vsms.com / Admin@123`

---

## Project Structure

```
Code_V2/
├── backend/
│   ├── VSMS.Api/               # ASP.NET Core Web API
│   │   └── Features/           # One folder per domain feature
│   │       ├── Auth/
│   │       ├── Opportunities/
│   │       ├── Applications/
│   │       ├── Attendance/
│   │       └── ...
│   ├── VSMS.Abstractions/      # Grain interfaces & shared DTOs
│   ├── VSMS.Grains/            # Orleans actor implementations
│   └── VSMS.Infrastructure/    # EF Core, database, services
├── web/
│   └── src/
│       ├── components/         # Reusable UI components
│       ├── pages/              # Route-level pages (volunteer/, coordinator/, admin/)
│       ├── services/           # API call functions (one file per domain)
│       ├── hooks/              # Custom React hooks
│       └── types.ts            # Shared TypeScript interfaces
├── mobile/
│   └── app/                    # Expo Router file-based screens
│       └── services/           # API call functions (mirrors web/services/)
└── tools/                      # Utility scripts (seed data, etc.)
```

---

## Branch Strategy

We follow **Git Flow**:

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready, stable code |
| `develop` | Integration branch — all features merge here first |
| `feature/<ticket>-short-description` | New features |
| `bugfix/<ticket>-short-description` | Bug fixes |
| `hotfix/<description>` | Critical production fixes |

**Examples:**
```bash
git checkout -b feature/V-42-skill-endorsements
git checkout -b bugfix/V-17-checkin-geofence-radius
git checkout -b hotfix/jwt-expiry-crash
```

Never commit directly to `main` or `develop`.

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<scope>): <short description>
```

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change with no feature or fix |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies, tooling |

**Examples by area:**

```bash
feat(backend): add skill endorsement endpoint
feat(web): add skill endorsement UI on volunteer profile
feat(mobile): add skill endorsement screen
fix(backend): resolve JWT expiry on long-running sessions
fix(web): correct geofence radius display on map
docs(readme): update mobile setup instructions
chore(deps): upgrade Expo SDK to 56
```

---

## How to Add a New Feature

### Backend

1. **Create the feature folder** under `VSMS.Api/Features/<FeatureName>/`
2. **Add the endpoint file** `<Feature>Endpoints.cs` using Minimal API pattern:
   ```csharp
   app.MapPost("/api/feature", async (...) => { ... })
      .RequireAuthorization();
   ```
3. **Register endpoints** in `Program.cs`
4. **Add grain interface** in `VSMS.Abstractions/` if stateful behavior is needed
5. **Implement the grain** in `VSMS.Grains/`
6. **Add a read model** in `VSMS.Infrastructure/Data/EfCoreQuery/Entities/` for query-side projections
7. **Run EF Core migration** if a new database table is needed:
   ```bash
   dotnet ef migrations add AddFeatureName
   dotnet ef database update
   ```

### Web Frontend

1. **Add API functions** in `web/src/services/<feature>.ts` using the existing `api` axios instance
2. **Create the page component** in `web/src/pages/<role>/<FeaturePage>.tsx`
3. **Add the route** to `App.tsx` — add the view name to the `ViewName` union type and render the component
4. **Add navigation** to `Sidebar.tsx` with appropriate role guard

### Mobile

1. **Add API functions** in `mobile/services/<feature>.ts` (mirrors web services pattern)
2. **Create the screen** in `mobile/app/<role>/<feature>.tsx` (Expo Router file-based routing)
3. **Link from the tab navigator** or add to the appropriate navigation stack

---

## Pull Request Process

Before opening a PR, verify the following:

- [ ] Branch is based on `develop`, not `main`
- [ ] Branch name follows the naming convention
- [ ] All commits follow Conventional Commits format
- [ ] No secrets, API keys, or credentials committed (check `.env` is in `.gitignore`)
- [ ] Code compiles without errors (`dotnet build` / `npm run build`)
- [ ] New API endpoints are tested manually or with seed data
- [ ] PR description explains **what** changed and **why**

**To submit:**
1. Push your branch and open a Pull Request targeting `develop`
2. Fill in the PR description
3. Request at least **1 review** from a team member
4. Address review comments
5. Squash and merge once approved

---

## Code Style

### Backend (C#)

- Use **file-scoped namespaces**: `namespace VSMS.Api.Features.Auth;`
- Use **records** for request/response DTOs: `record LoginRequest(string Email, string Password);`
- Keep endpoint handlers thin — delegate business logic to Orleans grains
- Use `ILogger<T>` for logging, not `Console.Write`

### Web (TypeScript / React)

- **Strict TypeScript** — no `any` unless absolutely unavoidable
- **Functional components** with hooks only — no class components
- **Co-locate styles** using TailwindCSS utility classes — no separate CSS files per component
- Use the existing `api` axios instance from `services/api.ts` for all HTTP calls
- Add new shared types to `types.ts`

### Mobile (TypeScript / React Native)

- Follow the same TypeScript conventions as the web app
- Use `zustand` for shared state — avoid prop drilling
- Use `expo-router` file-based routing — no manual navigator setup

---

## Extension Points

The system is intentionally designed to be extended in these areas:

| Area | How to Extend |
|------|--------------|
| **Opportunity Categories** | Add new values to the category enum in `VSMS.Abstractions/` and update the web/mobile filter UI |
| **Certificate Templates** | Create new templates via `POST /api/certificates/templates` or `POST /api/certificates/seed-presets` |
| **AI Assistant Tools** | Add new tool definitions to the `GET /api/ai/tools` endpoint and implement handlers in `POST /api/ai/tools/run` |
| **Notification Channels** | Extend `INotificationGrain` in `VSMS.Grains/` to support new delivery methods (email, SMS, etc.) |
| **Approval Policies** | Add new policy types to the `ApprovalPolicy` enum and handle them in `IOpportunityGrain` |
| **Skills Taxonomy** | Import new skills via `POST /api/skills/bulk` using a JSON array |
| **Volunteer Impact Metrics** | Extend `IVolunteerGrain` with new computed metrics and expose them through the profile endpoint |

---

## Reporting Issues

To report a bug or suggest a feature:

1. Open a [GitHub Issue](https://github.com/czhang1818/CAD-Capstone/issues)
2. Use a clear title: `[Bug] Check-in fails when GPS is disabled` or `[Feature] Export attendance as CSV`
3. Include:
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots or logs if applicable
   - Which role/flow is affected (Volunteer / Coordinator / Admin)

---

*VSMS — Conestoga College CAD Capstone, 2026*
