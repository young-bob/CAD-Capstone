# VSMS System Module Architecture

## Module Call Topology

```mermaid
graph LR
    subgraph Clients
        direction TB
        M_Svc["Mobile (React Native)"]
        W_Svc["Web SPA (React + Vite)"]
    end

    subgraph API[VSMS.Api — Features]
        E_Auth[AuthEndpoints]
        E_Opp[OpportunityEndpoints]
        E_App[ApplicationEndpoints]
        E_Org[OrganizationEndpoints]
        E_Vol[VolunteerEndpoints]
        E_Att[AttendanceEndpoints]
        E_Adm[AdminEndpoints]
        E_Skl[SkillEndpoints]
        E_Cert[CertificateEndpoints]
        E_Ntf[NotificationEndpoints]
        E_AI[AiAssistantEndpoints]
    end

    subgraph Grains[VSMS.Grains — Orleans Actors]
        G_Opp[OpportunityGrain]
        G_App[ApplicationGrain]
        G_Org[OrganizationGrain]
        G_Vol[VolunteerGrain]
        G_Att[AttendanceRecordGrain]
        G_Adm[AdminGrain]
        G_Ntf[NotificationGrain]
        G_Cert[CertificateGrain]
        G_Skl[SkillGrain]
    end

    subgraph Infra[VSMS.Infrastructure]
        EH[EventHandlers]
        QS[QueryServices]
        EB[InMemoryEventBus]
        AI[AiAssistantEngine]
        Email[EmailService — Resend]
    end

    subgraph DB[PostgreSQL]
        GS[(Grain State)]
        RM[(Read Models)]
    end

    %% Client → API
    M_Svc --> E_Auth & E_Opp & E_App & E_Org & E_Vol & E_Att & E_Adm & E_Skl & E_Cert & E_Ntf & E_AI
    W_Svc --> E_Auth & E_Opp & E_App & E_Org & E_Vol & E_Att & E_Adm & E_Skl & E_Cert & E_Ntf & E_AI

    %% API → Grains
    E_Opp -->|IGrainFactory| G_Opp
    E_App -->|IGrainFactory| G_App
    E_Org -->|IGrainFactory| G_Org
    E_Vol -->|IGrainFactory| G_Vol
    E_Att -->|IGrainFactory| G_Att
    E_Adm -->|IGrainFactory| G_Adm
    E_Skl -->|IGrainFactory| G_Skl
    E_Cert -->|IGrainFactory| G_Cert
    E_Ntf -->|IGrainFactory| G_Ntf

    %% API → Query / AI
    E_Opp -->|IQueryService| QS
    E_App -->|IQueryService| QS
    E_Org -->|IQueryService| QS
    E_AI  -->|IAiAssistantEngine| AI

    %% Grain → EventBus
    G_Opp -->|IEventBus.Publish| EB
    G_App -->|IEventBus.Publish| EB
    G_Att -->|IEventBus.Publish| EB

    %% Cross-Grain calls
    G_Opp -->|GetGrain| G_App
    G_Opp -->|GetGrain| G_Vol
    G_App -->|GetGrain| G_Opp
    G_Att -->|GetGrain| G_Vol
    G_Adm -->|GetGrain| G_Vol

    %% Notification & Email
    G_Ntf -->|IEmailService| Email

    %% Infrastructure → DB
    EB --> EH
    EH -->|EF Core Write| RM
    QS -->|EF Core Read| RM

    %% Grain → State
    G_Opp -->|Orleans Storage| GS
    G_App -->|Orleans Storage| GS
    G_Org -->|Orleans Storage| GS
    G_Vol -->|Orleans Storage| GS
    G_Att -->|Orleans Storage| GS
    G_Cert -->|Orleans Storage| GS
    G_Skl -->|Orleans Storage| GS
```

## Module Descriptions

| Module | Project | Role |
|---|---|---|
| **Mobile App** | `mobile/` | React Native + Expo cross-platform client with GPS, camera, push notifications |
| **Web SPA** | `web/` | React + Vite dashboard for coordinators and admins with real-time auto-refresh polling (5 s) |
| **API Endpoints** | `VSMS.Api/Features/*` | Minimal API route handlers, dispatch to Grains or QueryServices |
| **Orleans Grains** | `VSMS.Grains/*Grain.cs` | Domain actors holding state, enforcing business rules |
| **Abstractions** | `VSMS.Abstractions/` | Shared interfaces, DTOs, enums, state classes, grain interfaces |
| **Infrastructure** | `VSMS.Infrastructure/` | EventHandlers, QueryServices, InMemoryEventBus, AiAssistantEngine, EmailService |
| **PostgreSQL** | Runtime | Grain state persistence and CQRS read model storage |
| **Presentation** | `presentation/` | Electron-hosted interactive demo with live webviews |

## Key Call Patterns

1. **Command Path**: Client → API Endpoint → Orleans Grain → Persist State + Publish Event
2. **Query Path**: Client → API Endpoint → QueryService → EF Core → PostgreSQL ReadModels
3. **Event Projection**: Grain publishes event → InMemoryEventBus → EventHandler → EF Core upsert to ReadModel
4. **Cross-Grain Calls**: OpportunityGrain calls ApplicationGrain and VolunteerGrain via IGrainFactory
5. **Real-Time UI**: Web SPA uses `useAutoRefresh` hook — silent polling every 5 s + instant refresh on tab focus
6. **AI Assistant**: Client → AiAssistantEndpoints → AiAssistantEngine → Qwen LLM (streaming SSE response)
7. **Notifications**: Grain → NotificationGrain → EmailService (Resend API) + in-app notification list

## Deployment Architecture

| Component | Technology | Container |
|---|---|---|
| Web SPA | Nginx static hosting | `vsms-web` (podman) |
| API Server | .NET 10 + Orleans | `vsms-api` (podman) |
| Database | PostgreSQL 17 | `vsms-db` (podman) |
| File Storage | MinIO S3-compatible | `vsms-file` (podman) |
| Reverse Proxy | Nginx | `vsms-nginx` (podman) |
| DNS & TLS | Cloudflare + Let's Encrypt | External |
| Infrastructure | Terraform | `terraform/` |
| CI/CD | GitHub → SSH deploy scripts | `remote_*_deploy.sh` |
