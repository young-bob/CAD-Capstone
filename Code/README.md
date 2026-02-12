``` shell
VSMS (Volunteer Service Management System)
├── Backend
│   ├── VSMS.Grains.Interfaces
│   ├── VSMS.Grains  
│   ├── VSMS.API
│   ├── VSMS.Silo
│   └── VSMS.SQL
└── Frontend
    └── VSMS.VolunteerApp
        ├── Models
        ├── Views
        ├── ViewModels
        ├── Services
        └── Platforms
            ├── Android
            ├── iOS
            ├── MacCatalyst
            └── Windows
```

## System Architecture

```mermaid
graph TB
    subgraph MobileLayer ["📱 Presentation Layer - .NET MAUI"]
        MobileApp["VSMS.VolunteerApp"]
        subgraph MauiComponents ["Components"]
            Views["Views (XAML)"]
            ViewModels["ViewModels (MVVM)"]
            Models["Models"]
            Services["Services"]
        end
    end

    subgraph DockerEnv ["🐳 Docker Environment (vsms-net)"]
        subgraph APILayer ["API Layer - ASP.NET Core"]
            API["VSMS.API<br>:8080"]
            subgraph APIComponents ["Components"]
                Controllers["Controllers"]
                JWT["JWT Auth"]
                Swagger["Swagger/OpenAPI"]
                OrleansClient["Orleans Client"]
            end
        end

        subgraph BusinessLayer ["Business Layer - Orleans"]
            Silo["VSMS.Silo<br>:11111 :30000"]
            subgraph GrainComponents ["Grains"]
                UserGrain["UserGrain"]
                OrgGrain["OrganizationGrain"]
                OppGrain["OpportunityGrain"]
                AppGrain["ApplicationGrain"]
            end
        end

        subgraph DataLayer ["Data Layer - PostgreSQL"]
            DB[("Database: vsms<br>:5432")]
            subgraph Tables ["Tables"]
                OrleansSchema["Orleans Tables<br>(Clustering/Persistence)"]
                AppSchema["Application Tables<br>(Users/Orgs/Opportunities)"]
            end
        end
    end

    MobileApp -->|"REST API<br>HTTP/HTTPS"| API
    API -->|"Orleans RPC<br>Grain Calls"| Silo
    API -.->|"Read Cluster<br>Membership"| DB
    Silo <-->|"State Persistence<br>& Clustering"| DB

    style MobileLayer fill:#e1f5ff
    style DockerEnv fill:#fff4e1
    style APILayer fill:#e8f5e9
    style BusinessLayer fill:#f3e5f5
    style DataLayer fill:#fce4ec
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Mobile** | .NET MAUI 10 | Cross-platform UI (iOS/Android/Windows) |
| **API** | ASP.NET Core 10 | REST API, JWT Authentication |
| **Business** | Orleans 10 | Distributed Actor Framework |
| **Data** | PostgreSQL or CockroachDB | Relational Database or NoSQL |
| **Orchestration** | Docker Compose | Container Management |

### Key Features

- **Orleans Clustering**: ADO.NET provider for distributed coordination
- **State Persistence**: Automatic grain state storage in PostgreSQL
- **Authentication**: JWT-based security for API endpoints


## Getting Started

### Prerequisites

- **Docker Desktop**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for your platform
- **.NET 10 SDK**: Required for local development (optional for Docker-only deployment)
- **PostgreSQL Client**: Optional, for direct database access

### Running the Application

#### On macOS / Linux

```bash
# Make script executable (first time only)
chmod +x docker_build.sh

# Build and run
./docker_build.sh
```

#### On Windows

Double-click `docker_build.bat` or run in Command Prompt:

```cmd
docker_build.bat
```

#### Manual Docker Compose Commands

```bash
# Build without cache
docker compose build --no-cache

# Create services
docker compose up -d

# More Docker Compose Commands as follows:

# View logs
docker compose logs

# Stop services
docker compose stop

# Start services
docker compose start

# Remove services
docker compose down
```

### Accessing the Application

Once the containers are running:

| Service | URL | Description |
|---------|-----|-------------|
| **API** | http://localhost:8080 | REST API endpoints |
| **Swagger UI** | http://localhost:8080/swagger | API documentation and testing |
| **PostgreSQL** | localhost:5432 | Database (user: `root`, password: `root123`, db: `vsms`) |

### Troubleshooting

**Port conflicts**:

- Ensure ports 8080, 5432, 11111, and 30000 are not in use by other applications