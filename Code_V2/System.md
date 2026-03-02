# VSMS System Module Architecture

## Module Call Topology

```mermaid
graph LR
    subgraph Mobile
        S_Auth[auth.ts]
        S_Opp[opportunities.ts]
        S_App[applications.ts]
        S_Org[organizations.ts]
        S_Vol[volunteers.ts]
        S_Att[attendance.ts]
        S_Adm[admin.ts]
    end

    subgraph API[VSMS.Api - Features]
        E_Auth[AuthEndpoints]
        E_Opp[OpportunityEndpoints]
        E_App[ApplicationEndpoints]
        E_Org[OrganizationEndpoints]
        E_Vol[VolunteerEndpoints]
        E_Att[AttendanceEndpoints]
        E_Adm[AdminEndpoints]
    end

    subgraph Grains[VSMS.Grains - Orleans Actors]
        G_Opp[OpportunityGrain]
        G_App[ApplicationGrain]
        G_Org[OrganizationGrain]
        G_Vol[VolunteerGrain]
        G_Att[AttendanceRecordGrain]
        G_Adm[AdminGrain]
        G_Ntf[NotificationGrain]
    end

    subgraph Infra[VSMS.Infrastructure]
        EH[EventHandlers]
        QS[QueryServices]
        EB[InMemoryEventBus]
    end

    subgraph DB[PostgreSQL]
        GS[(Grain State)]
        RM[(Read Models)]
    end

    S_Auth --> E_Auth
    S_Opp --> E_Opp
    S_App --> E_App
    S_Org --> E_Org
    S_Vol --> E_Vol
    S_Att --> E_Att
    S_Adm --> E_Adm

    E_Opp -->|IGrainFactory| G_Opp
    E_App -->|IGrainFactory| G_App
    E_Org -->|IGrainFactory| G_Org
    E_Vol -->|IGrainFactory| G_Vol
    E_Att -->|IGrainFactory| G_Att
    E_Adm -->|IGrainFactory| G_Adm

    E_Opp -->|IQueryService| QS
    E_App -->|IQueryService| QS
    E_Org -->|IQueryService| QS

    G_Opp -->|IEventBus.Publish| EB
    G_App -->|IEventBus.Publish| EB
    G_Opp -->|GetGrain| G_App
    G_Opp -->|GetGrain| G_Vol
    G_App -->|GetGrain| G_Opp
    G_Att -->|GetGrain| G_Vol
    G_Adm -->|GetGrain| G_Vol

    EB --> EH
    EH -->|EF Core Write| RM
    QS -->|EF Core Read| RM

    G_Opp -->|Orleans Storage| GS
    G_App -->|Orleans Storage| GS
    G_Org -->|Orleans Storage| GS
    G_Vol -->|Orleans Storage| GS
    G_Att -->|Orleans Storage| GS
```

## Module Descriptions

| Module | Project | Role |
|---|---|---|
| **Mobile Services** | `mobile/services/*.ts` | Axios HTTP clients calling backend REST API |
| **API Endpoints** | `VSMS.Api/Features/*` | Minimal API route handlers, dispatch to Grains or QueryServices |
| **Orleans Grains** | `VSMS.Grains/*Grain.cs` | Domain actors holding state, enforcing business rules |
| **Abstractions** | `VSMS.Abstractions/` | Shared interfaces, DTOs, enums, state classes, grain interfaces |
| **Infrastructure** | `VSMS.Infrastructure/` | EventHandlers, QueryServices, InMemoryEventBus, EF Core DbContext |
| **PostgreSQL** | Runtime | Grain state persistence and CQRS read model storage |

## Key Call Patterns

1. **Command Path**: Mobile Service --> API Endpoint --> Orleans Grain --> Persist State + Publish Event
2. **Query Path**: Mobile Service --> API Endpoint --> QueryService --> EF Core --> PostgreSQL ReadModels
3. **Event Projection**: Grain publishes event --> InMemoryEventBus --> EventHandler --> EF Core upsert to ReadModel
4. **Cross-Grain Calls**: OpportunityGrain calls ApplicationGrain and VolunteerGrain via IGrainFactory
